import { PrismaClient, PropertyType, PropertyStatus, RoomStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting certification property creation...');

  // 1. Find the first user in the system to act as the owner
  const owner = await prisma.user.findFirst();
  if (!owner) {
    throw new Error('No user found in the database. Please create a user or seed the database first.');
  }
  console.log(`Using owner: ${owner.firstName} ${owner.lastName} (ID: ${owner.id})`);

  // 2. Delete existing staging property if it exists to allow re-runs
  const slug = 'test-property-routeguide';
  const existing = await prisma.property.findUnique({ where: { slug } });
  if (existing) {
    console.log('Cleaning up existing Test Property...');
    await prisma.property.delete({ where: { id: existing.id } });
  }

  // 3. Create the property
  const property = await prisma.property.create({
    data: {
      name: 'Test Property - RouteGuide',
      slug,
      type: PropertyType.RESORT,
      address: 'Channex Staging Bypass Road',
      city: 'Varkala',
      state: 'Kerala',
      country: 'India',
      pincode: '695141',
      email: 'staging-resort@routeguide.com',
      phone: '+919876543210',
      baseCurrency: 'USD',
      taxRate: 12.0,
      status: PropertyStatus.APPROVED,
      isActive: true,
      isVerified: true,
      ownerId: owner.id,
      policies: {},
    },
  });
  console.log(`Created Property: "${property.name}" (ID: ${property.id})`);

  // 4. Create the 4 Room Types
  const roomTypesToCreate = [
    { name: 'Twin Room - BAR', price: 100, number: '101' },
    { name: 'Twin Room - B&B', price: 120, number: '102' },
    { name: 'Double Room - BAR', price: 100, number: '103' },
    { name: 'Double Room - B&B', price: 120, number: '104' },
  ];

  for (const item of roomTypesToCreate) {
    const roomType = await prisma.roomType.create({
      data: {
        name: item.name,
        basePrice: item.price,
        extraAdultPrice: 20,
        extraChildPrice: 10,
        maxAdults: 2,
        maxChildren: 2,
        baseAdults: 2,
        baseChildren: 1,
        propertyId: property.id,
      },
    });
    console.log(`- Created Room Type: "${roomType.name}" (ID: ${roomType.id})`);

    // 5. Create the physical room (inventory unit)
    const room = await prisma.room.create({
      data: {
        roomNumber: item.number,
        floor: 1,
        status: RoomStatus.AVAILABLE,
        isEnabled: true,
        roomTypeId: roomType.id,
        propertyId: property.id,
      },
    });
    console.log(`  - Created Room Unit: Room ${room.roomNumber} (ID: ${room.id})`);
  }

  console.log('\nSuccess! Your certification staging property has been created.');
  console.log(`Property ID: ${property.id}`);
  console.log('You can now log in to the PMS dashboard, go to Calendar Sync, enter your Channex credentials and map this property!');
}

main()
  .catch((e) => {
    console.error('Error creating property:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
