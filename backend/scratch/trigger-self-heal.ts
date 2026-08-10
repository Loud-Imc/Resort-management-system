import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

const PROPERTY_ID = '3c206f90-12bd-479e-8f8b-0f12178b941d'; // Local Varkala Cliff Edge Homestay ID
const USER_API_KEY = 'u5wpOi89Mo9NPXiGg03sDppzK6cYX1oUu3jDPx8K8MT10PdikVNXrvcFy4mtAhqF';
const BASE_URL = 'https://staging.channex.io/api/v1';

async function main() {
  console.log('Fetching local property and room types...');
  const property = await prisma.property.findUnique({
    where: { id: PROPERTY_ID },
    include: {
      roomTypes: {
        include: { rooms: true }
      }
    }
  });

  if (!property) {
    console.error('Local property not found');
    return;
  }

  const mapping = await prisma.channelPropertyMapping.findFirst({
    where: { propertyId: PROPERTY_ID, channelName: 'CHANNEX' }
  });

  if (!mapping) {
    console.error('No Channex mapping found for this property');
    return;
  }

  const externalPropertyId = mapping.externalPropertyId;
  console.log(`Channex External Property ID: ${externalPropertyId}`);

  // Create room types on Channex
  for (const rt of property.roomTypes) {
    console.log(`Creating Channex Room Type: "${rt.name}"...`);
    const roomPayload = {
      room_type: {
        property_id: externalPropertyId,
        title: rt.name,
        count_of_rooms: rt.rooms.length,
        occ: rt.maxAdults,
        kind: 'room'
      }
    };

    const roomRes = await fetch(`${BASE_URL}/room_types`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-api-key': USER_API_KEY
      },
      body: JSON.stringify(roomPayload)
    });

    const roomData = await roomRes.json();
    if (roomRes.status === 201) {
      const channexRoomTypeId = roomData.data.id;
      console.log(`Successfully created room type in Channex! ID: ${channexRoomTypeId}`);

      // Now create Rate Plan for this room type
      console.log(`Creating Channex Rate Plan for "${rt.name}"...`);
      const ratePayload = {
        rate_plan: {
          property_id: externalPropertyId,
          room_type_id: channexRoomTypeId,
          title: `${rt.name} Standard Rate`,
          currency: property.baseCurrency || 'INR',
          options: []
        }
      };

      const rateRes = await fetch(`${BASE_URL}/rate_plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-api-key': USER_API_KEY
        },
        body: JSON.stringify(ratePayload)
      });

      const rateData = await rateRes.json();
      if (rateRes.status === 201) {
        const channexRatePlanId = rateData.data.id;
        console.log(`Successfully created Rate Plan in Channex! ID: ${channexRatePlanId}`);

        // Save mapping in database
        await prisma.channelRoomTypeMapping.upsert({
          where: {
            propertyMappingId_roomTypeId: { propertyMappingId: mapping.id, roomTypeId: rt.id }
          },
          update: {
            externalRoomTypeId: channexRoomTypeId,
            externalRatePlanId: channexRatePlanId
          },
          create: {
            propertyMappingId: mapping.id,
            roomTypeId: rt.id,
            externalRoomTypeId: channexRoomTypeId,
            externalRatePlanId: channexRatePlanId
          }
        });
        console.log(`Linked local room type ${rt.name} to Channex room types in DB.\n`);
      } else {
        console.error(`Failed to create Rate Plan:`, rateData);
      }
    } else {
      console.error(`Failed to create Room Type:`, roomData);
    }
  }

  console.log('Self-healing sync finished!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
