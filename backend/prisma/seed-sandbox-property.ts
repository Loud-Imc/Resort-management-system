import { PrismaClient, PropertyStatus, RoleCategory } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedSandboxProperty() {
  console.log('🏖️ Seeding Standardized Sandbox Test Property (TEST-PROP-001)...');

  // 1. Ensure system owner/admin user exists
  let owner = await prisma.user.findFirst({
    where: { email: 'owner@resort.com' },
  });

  if (!owner) {
    owner = await prisma.user.findFirst({
      where: { isActive: true },
    });
  }

  if (!owner) {
    owner = await prisma.user.create({
      data: {
        email: 'sandbox-owner@routeguide.com',
        firstName: 'Sandbox',
        lastName: 'Owner',
        phone: '+919876543210',
        isActive: true,
      },
    });
  }

  // 2. Upsert Sandbox Property (TEST-PROP-001)
  const property = await prisma.property.upsert({
    where: { slug: 'TEST-PROP-001' },
    update: {
      name: 'RouteGuide Sandbox Resort',
      description: 'Standardized B2B OTA Sandbox Test Property for Partner API & Webhook Certification Testing',
      status: PropertyStatus.APPROVED,
      isActive: true,
      address: '100 Sandbox Way, Tech Park',
      city: 'Kochi',
      state: 'Kerala',
      country: 'India',
      pincode: '682030',
      latitude: 9.9312,
      longitude: 76.2673,
      email: 'sandbox@routeguide.com',
      phone: '+919999900000',
      coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945',
      images: [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945',
        'https://images.unsplash.com/photo-1582719508461-905c673771fd',
      ],
      amenities: ['SWIMMING_POOL', 'FREE_WIFI', 'AIR_CONDITIONING', 'RESTAURANT', 'SPA'],
      policies: ['No Smoking in Rooms', 'Pets Not Allowed'],
      defaultCheckInTime: '14:00',
      defaultCheckOutTime: '11:00',
    },
    create: {
      id: 'TEST-PROP-001',
      name: 'RouteGuide Sandbox Resort',
      slug: 'TEST-PROP-001',
      description: 'Standardized B2B OTA Sandbox Test Property for Partner API & Webhook Certification Testing',
      type: 'RESORT',
      status: PropertyStatus.APPROVED,
      isActive: true,
      address: '100 Sandbox Way, Tech Park',
      city: 'Kochi',
      state: 'Kerala',
      country: 'India',
      pincode: '682030',
      latitude: 9.9312,
      longitude: 76.2673,
      email: 'sandbox@routeguide.com',
      phone: '+919999900000',
      coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945',
      images: [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945',
        'https://images.unsplash.com/photo-1582719508461-905c673771fd',
      ],
      amenities: ['SWIMMING_POOL', 'FREE_WIFI', 'AIR_CONDITIONING', 'RESTAURANT', 'SPA'],
      policies: ['No Smoking in Rooms', 'Pets Not Allowed'],
      defaultCheckInTime: '14:00',
      defaultCheckOutTime: '11:00',
      addedById: owner.id,
      ownerId: owner.id,
    },
  });

  // 3. Upsert Cancellation Policy
  const existingPolicy = await prisma.cancellationPolicy.findFirst({
    where: { propertyId: property.id, name: 'Flexible Sandbox Policy' },
  });

  if (!existingPolicy) {
    await prisma.cancellationPolicy.create({
      data: {
        propertyId: property.id,
        name: 'Flexible Sandbox Policy',
        description: 'Free cancellation up to 24 hours before check-in',
        rules: [{ refundable: true, deadlineHours: 24, refundPercentage: 100 }],
        isDefault: true,
      },
    });
  }

  // 4. Upsert RoomTypes (TEST-DLX & TEST-STE)
  const roomTypeDlx = await prisma.roomType.upsert({
    where: {
      propertyId_name: {
        propertyId: property.id,
        name: 'Deluxe Sandbox Room',
      },
    },
    update: {
      description: 'Standard Sandbox Deluxe Room with King Bed',
      basePrice: 4500.00,
      extraAdultPrice: 1000.00,
      extraChildPrice: 500.00,
      maxAdults: 2,
    },
    create: {
      propertyId: property.id,
      name: 'Deluxe Sandbox Room',
      description: 'Standard Sandbox Deluxe Room with King Bed',
      basePrice: 4500.00,
      extraAdultPrice: 1000.00,
      extraChildPrice: 500.00,
      maxAdults: 2,
      amenities: ['KING_BED', 'WIFI', 'AC', 'TV'],
    },
  });

  const roomTypeSte = await prisma.roomType.upsert({
    where: {
      propertyId_name: {
        propertyId: property.id,
        name: 'Executive Sandbox Suite',
      },
    },
    update: {
      description: 'Luxury Sandbox Suite with Sea View Balcony',
      basePrice: 8500.00,
      extraAdultPrice: 1500.00,
      extraChildPrice: 750.00,
      maxAdults: 4,
    },
    create: {
      propertyId: property.id,
      name: 'Executive Sandbox Suite',
      description: 'Luxury Sandbox Suite with Sea View Balcony',
      basePrice: 8500.00,
      extraAdultPrice: 1500.00,
      extraChildPrice: 750.00,
      maxAdults: 4,
      amenities: ['KING_BED', 'BALCONY', 'WIFI', 'AC', 'MINIBAR'],
    },
  });

  // 5. Upsert 10 Physical Rooms per RoomType
  for (let i = 1; i <= 10; i++) {
    const roomNumDlx = `RM-TEST-DLX-${100 + i}`;
    const roomNumSte = `RM-TEST-STE-${200 + i}`;

    await prisma.room.upsert({
      where: {
        propertyId_roomNumber: {
          propertyId: property.id,
          roomNumber: roomNumDlx,
        },
      },
      update: {
        roomTypeId: roomTypeDlx.id,
        status: 'AVAILABLE',
      },
      create: {
        propertyId: property.id,
        roomTypeId: roomTypeDlx.id,
        roomNumber: roomNumDlx,
        floor: 1,
        status: 'AVAILABLE',
      },
    });

    await prisma.room.upsert({
      where: {
        propertyId_roomNumber: {
          propertyId: property.id,
          roomNumber: roomNumSte,
        },
      },
      update: {
        roomTypeId: roomTypeSte.id,
        status: 'AVAILABLE',
      },
      create: {
        propertyId: property.id,
        roomTypeId: roomTypeSte.id,
        roomNumber: roomNumSte,
        floor: 2,
        status: 'AVAILABLE',
      },
    });
  }

  console.log(`✅ Sandbox Test Property seeded successfully!`);
  console.log(`   Property ID  : ${property.id}`);
  console.log(`   Property Slug: ${property.slug}`);
  console.log(`   Room Types   : ${roomTypeDlx.name} (${roomTypeDlx.id}), ${roomTypeSte.name} (${roomTypeSte.id})`);
  return property;
}

if (require.main === module) {
  seedSandboxProperty()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
