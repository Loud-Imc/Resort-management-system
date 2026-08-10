import fetch from 'node-fetch';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const USER_API_KEY = 'u5wpOi89Mo9NPXiGg03sDppzK6cYX1oUu3jDPx8K8MT10PdikVNXrvcFy4mtAhqF';
const BASE_URL = 'https://staging.channex.io/api/v1';
const PROPERTY_ID = 'ebdff081-640f-4df8-8231-7b1ee84f232c'; // Correct Varkala Cliff Edge Homestay Channex ID

async function main() {
  console.log(`Checking Channex Room Types for Property ID: ${PROPERTY_ID}...`);
  
  const roomResponse = await fetch(`${BASE_URL}/room_types?filter[property_id]=${PROPERTY_ID}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'user-api-key': USER_API_KEY,
    },
  });
  
  const roomData = await roomResponse.json();
  const rooms = roomData.data || [];
  console.log(`\nFound ${rooms.length} room types in Channex Staging:`);
  for (const r of rooms) {
    console.log(`- "${r.attributes.title}" (Channex ID: ${r.attributes.id})`);
  }

  // Look up local database mappings
  console.log('\nChecking local Database mappings for this property:');
  const localMapping = await prisma.channelPropertyMapping.findFirst({
    where: { externalPropertyId: PROPERTY_ID, channelName: 'CHANNEX' },
    include: {
      roomMappings: {
        include: { roomType: true }
      }
    }
  });

  if (!localMapping) {
    console.log('No local database mapping found for this property!');
    return;
  }

  console.log('Local Property Mappings:');
  for (const rm of localMapping.roomMappings) {
    console.log(`- Local Room Type: "${rm.roomType?.name}"`);
    console.log(`  Saved externalRoomTypeId in DB: "${rm.externalRoomTypeId}"`);
    const match = rooms.find((r: any) => r.attributes.id === rm.externalRoomTypeId);
    if (match) {
      console.log(`  ✅ MATCH SUCCESSFUL: Matches Channex room type "${match.attributes.title}"`);
    } else {
      console.log(`  ❌ MISMATCH: ID "${rm.externalRoomTypeId}" is NOT found in Channex room types!`);
    }
    console.log('');
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
