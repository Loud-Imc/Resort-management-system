import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CERTIFIED_PROPERTY_ID = 'e44c760c-4323-478c-ae68-9e6f9aef1c5c';
const USER_API_KEY = 'u5wpOi89Mo9NPXiGg03sDppzK6cYX1oUu3jDPx8K8MT10PdikVNXrvcFy4mtAhqF';

// Exact mappings from our certified staging tests
const ROOM_MAPPINGS = [
  {
    roomTypeName: 'Twin Room - BAR',
    externalRoomTypeId: '110d9c67-ae92-4c70-a31b-c2f194028e8b',
    externalRatePlanId: '28529d7f-3e04-41d5-a836-5524485fc658',
  },
  {
    roomTypeName: 'Twin Room - B&B',
    externalRoomTypeId: '110d9c67-ae92-4c70-a31b-c2f194028e8b',
    externalRatePlanId: '1e103343-35b2-4b87-9e6e-dd618cb8014c',
  },
  {
    roomTypeName: 'Double Room - BAR',
    externalRoomTypeId: 'd9dddf0c-1043-4a7e-bfed-4de3d2ba4e91',
    externalRatePlanId: '4bafeb37-59ca-4a96-8085-61b2c5163d29',
  },
  {
    roomTypeName: 'Double Room - B&B',
    externalRoomTypeId: 'd9dddf0c-1043-4a7e-bfed-4de3d2ba4e91',
    externalRatePlanId: '394f0df6-a596-49d8-a472-386888f687ec',
  },
];

async function main() {
  console.log('🔗 Pre-seeding certified Channex property mapping to database...');

  // 0. Resolve owner ID for property creation
  let owner = await prisma.user.findFirst();
  if (!owner) {
    console.log('Creating mock owner user...');
    owner = await prisma.user.create({
      data: {
        email: 'owner@routeguide.in',
        password: 'mock-hashed-password',
        firstName: 'Property',
        lastName: 'Owner',
      },
    });
  }

  // 1. Get or Create Property
  let property = await prisma.property.findFirst({
    where: { name: 'Test Property - RouteGuide' },
  });

  if (!property) {
    console.log('Creating "Test Property - RouteGuide" property...');
    property = await prisma.property.create({
      data: {
        name: 'Test Property - RouteGuide',
        slug: `test-property-routeguide-${Date.now()}`,
        type: 'RESORT',
        email: 'test@routeguide.in',
        phone: '1234567890',
        description: 'Test Property for Channex Certification',
        address: 'Staging Server',
        city: 'Staging',
        state: 'Karnataka',
        country: 'India',
        latitude: 12.9716,
        longitude: 77.5946,
        coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945',
        images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945'],
        baseCurrency: 'USD',
        ownerId: owner.id,
      },
    });
  }

  // Ensure there is at least one Cancellation Policy for property verification readiness
  const policyCount = await prisma.cancellationPolicy.count({
    where: { propertyId: property.id },
  });
  if (policyCount === 0) {
    console.log('Creating mock cancellation policy for verification readiness...');
    await prisma.cancellationPolicy.create({
      data: {
        propertyId: property.id,
        name: 'Non Refundable',
        description: 'Non Refundable policy',
        rules: [
          {
            hoursBeforeCheckIn: 0,
            refundPercentage: 0,
          },
        ],
      },
    });
  }

  // 2. Ensure all Room Types and at least 1 Physical Room each exist
  for (const mapping of ROOM_MAPPINGS) {
    let roomType = await prisma.roomType.findFirst({
      where: { name: mapping.roomTypeName, propertyId: property.id },
    });

    if (!roomType) {
      console.log(`Creating room type "${mapping.roomTypeName}"...`);
      roomType = await prisma.roomType.create({
        data: {
          name: mapping.roomTypeName,
          description: `Channex room type for ${mapping.roomTypeName}`,
          basePrice: 100.0,
          maxAdults: 2,
          maxChildren: 0,
          extraAdultPrice: 0.0,
          extraChildPrice: 0.0,
          propertyId: property.id,
        },
      });
    }

    // Ensure there is at least 1 physical Room unit assigned to this type
    const roomCount = await prisma.room.count({
      where: { roomTypeId: roomType.id },
    });
    if (roomCount === 0) {
      console.log(`Creating physical room unit for room type "${mapping.roomTypeName}"...`);
      await prisma.room.create({
        data: {
          roomNumber: `T-${Math.floor(100 + Math.random() * 900)}`,
          status: 'AVAILABLE',
          isEnabled: true,
          roomTypeId: roomType.id,
          propertyId: property.id,
        },
      });
    }
  }

  // 3. Clear any existing mappings to avoid duplicate constraint violations
  const existingPropMapping = await prisma.channelPropertyMapping.findFirst({
    where: { propertyId: property.id, channelName: 'CHANNEX' },
  });

  if (existingPropMapping) {
    console.log('Removing old mapping connections for property...');
    await prisma.channelRoomTypeMapping.deleteMany({
      where: { propertyMappingId: existingPropMapping.id },
    });
    await prisma.channelPropertyMapping.delete({
      where: { id: existingPropMapping.id },
    });
  }

  // 4. Create property mapping
  console.log(`Linking property to certified Channex Property ID: ${CERTIFIED_PROPERTY_ID}`);
  const propertyMapping = await prisma.channelPropertyMapping.create({
    data: {
      propertyId: property.id,
      channelName: 'CHANNEX',
      externalPropertyId: CERTIFIED_PROPERTY_ID,
      apiKey: USER_API_KEY,
      isActive: true,
    },
  });

  // 5. Create room mappings
  for (const mapping of ROOM_MAPPINGS) {
    const roomType = await prisma.roomType.findFirst({
      where: { name: mapping.roomTypeName, propertyId: property.id },
    });

    if (!roomType) continue;

    console.log(`Linking room type "${mapping.roomTypeName}" to externalRoomTypeId "${mapping.externalRoomTypeId}" (${mapping.externalRatePlanId})...`);
    await prisma.channelRoomTypeMapping.create({
      data: {
        propertyMappingId: propertyMapping.id,
        roomTypeId: roomType.id,
        externalRoomTypeId: mapping.externalRoomTypeId,
        externalRatePlanId: mapping.externalRatePlanId,
      },
    });
  }

  console.log('✅ Successfully seeded and mapped certified Channex property data!');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
