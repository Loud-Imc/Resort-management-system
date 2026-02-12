import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PERMISSIONS, PERMISSION_GROUPS } from '../src/auth/constants/permissions.constant';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create Roles from PERMISSION_GROUPS
    for (const roleKey of Object.keys(PERMISSION_GROUPS)) {
        let roleName = roleKey;
        if (roleKey === 'SUPER_ADMIN') roleName = 'SuperAdmin';
        else if (roleKey === 'PROPERTY_OWNER') roleName = 'PropertyOwner';
        else if (roleKey === 'EVENT_ORGANIZER') roleName = 'EventOrganizer';
        else if (roleKey === 'VERIFICATION_STAFF') roleName = 'VerificationStaff';
        else if (roleKey === 'MARKETING') roleName = 'Marketing';
        else {
            // Convert CUSTOMER -> Customer, MANAGER -> Manager, STAFF -> Staff
            roleName = roleKey.charAt(0).toUpperCase() + roleKey.slice(1).toLowerCase();
        }

        await prisma.role.upsert({
            where: { name: roleName },
            update: {},
            create: {
                name: roleName,
                description: `${roleName} access role`,
            },
        });
    }

    const superAdminRole = await prisma.role.findUnique({ where: { name: 'SuperAdmin' } });
    const ownerRole = await prisma.role.findUnique({ where: { name: 'PropertyOwner' } });

    if (!superAdminRole || !ownerRole) {
        throw new Error('Required roles (SuperAdmin/PropertyOwner) not found after creation.');
    }

    // Create Permissions & Assign to Roles
    const allPermissions = Object.values(PERMISSIONS).flatMap(group => Object.values(group));
    for (const permissionName of allPermissions) {
        await prisma.permission.upsert({
            where: { name: permissionName },
            update: {},
            create: {
                name: permissionName,
                module: permissionName.split('.')[0],
                description: `Permission for ${permissionName}`,
            },
        });
    }

    for (const [roleKey, permissions] of Object.entries(PERMISSION_GROUPS)) {
        let dbRoleName = roleKey;
        if (roleKey === 'SUPER_ADMIN') dbRoleName = 'SuperAdmin';
        else if (roleKey === 'PROPERTY_OWNER') dbRoleName = 'PropertyOwner';
        else if (roleKey === 'EVENT_ORGANIZER') dbRoleName = 'EventOrganizer';
        else if (roleKey === 'VERIFICATION_STAFF') dbRoleName = 'VerificationStaff';
        else if (roleKey === 'MARKETING') dbRoleName = 'Marketing';
        else {
            dbRoleName = roleKey.charAt(0).toUpperCase() + roleKey.slice(1).toLowerCase();
        }

        const role = await prisma.role.findUnique({ where: { name: dbRoleName } });
        if (!role) {
            console.warn(`⚠️ Role ${dbRoleName} not found, skipping permissions.`);
            continue;
        }

        for (const permissionName of permissions) {
            const permission = await prisma.permission.findUnique({ where: { name: permissionName } });
            if (permission) {
                await prisma.rolePermission.upsert({
                    where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
                    update: {},
                    create: { roleId: role.id, permissionId: permission.id },
                });
            }
        }
    }

    // Create Super Admin User
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const superAdmin = await prisma.user.upsert({
        where: { email: 'admin@resort.com' },
        update: {},
        create: {
            email: 'admin@resort.com',
            password: hashedPassword,
            firstName: 'Super',
            lastName: 'Admin',
            phone: '+1234567890',
            isActive: true,
        },
    });

    await prisma.userRole.upsert({
        where: { userId_roleId: { userId: superAdmin.id, roleId: superAdminRole.id } },
        update: {},
        create: { userId: superAdmin.id, roleId: superAdminRole.id },
    });

    // Create Sample Property Owner User
    const ownerPassword = await bcrypt.hash('owner123', 10);
    const ownerUser = await prisma.user.upsert({
        where: { email: 'owner@resort.com' },
        update: {},
        create: {
            email: 'owner@resort.com',
            password: ownerPassword,
            firstName: 'Demo',
            lastName: 'Owner',
            phone: '+9999999999',
            isActive: true,
        },
    });

    await prisma.userRole.upsert({
        where: { userId_roleId: { userId: ownerUser.id, roleId: ownerRole.id } },
        update: {},
        create: { userId: ownerUser.id, roleId: ownerRole.id },
    });

    // Create Sample Property
    const sampleProperty = await prisma.property.upsert({
        where: { slug: 'demo-resort' },
        update: {},
        create: {
            name: 'The Grand Heritage Resort',
            slug: 'demo-resort',
            description: 'Experience luxury at its finest with our world-class amenities and breathtaking views.',
            address: '456 Hillview Estate, Munnar',
            city: 'Munnar',
            state: 'Kerala',
            country: 'India',
            pincode: '685612',
            type: 'RESORT',
            email: 'bookings@grandheritage.com',
            phone: '+919988776655',
            ownerId: ownerUser.id,
            images: ['https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200'],
            amenities: ['Private Pool', 'Luxury Spa', 'Fine Dining', 'WiFi', 'EV Charging']
        }
    });

    // --- ENRICHED ROOM TYPES ---

    // 1. Heritage Standard Room
    await prisma.roomType.upsert({
        where: { propertyId_name: { propertyId: sampleProperty.id, name: 'Heritage Standard Room' } },
        update: {},
        create: {
            name: 'Heritage Standard Room',
            description: 'Gracefully designed rooms blending traditional aesthetics with modern comfort.',
            amenities: ['High-speed WiFi', '42-inch LED TV', 'Tea/Coffee Maker', 'Premium Toiletries', 'Electronic Safe'],
            basePrice: 4500,
            extraAdultPrice: 1000,
            extraChildPrice: 500,
            maxAdults: 2,
            maxChildren: 1,
            images: [
                'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=800',
                'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800'
            ],
            highlights: ['Garden View', 'Traditional Decor', 'Handcrafted Furniture'],
            inclusions: ['Complimentary Buffet Breakfast', 'Welcome Drink on Arrival'],
            cancellationPolicy: 'Free cancellation 48 hours before check-in',
            marketingBadgeText: 'Most Popular',
            marketingBadgeType: 'POSITIVE',
            propertyId: sampleProperty.id,
        },
    });

    // 2. Luxury Garden Suite
    const deluxeRoom = await prisma.roomType.upsert({
        where: { propertyId_name: { propertyId: sampleProperty.id, name: 'Luxury Garden Suite' } },
        update: {},
        create: {
            name: 'Luxury Garden Suite',
            description: 'An expansive suite featuring a private balcony overlooking our award-winning gardens.',
            amenities: ['Private Balcony', 'Nespresso Machine', 'Mini Bar', 'Bath Tub', 'King-sized Bed', 'Work Desk'],
            basePrice: 8500,
            extraAdultPrice: 1500,
            extraChildPrice: 750,
            maxAdults: 3,
            maxChildren: 2,
            images: [
                'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800',
                'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800',
                'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800'
            ],
            highlights: ['Private Balcony', 'Mountain View', 'Separate Living Area'],
            inclusions: ['Breakfast & Lunch Included', 'Evening High Tea', 'Spa Voucher ₹500 off'],
            cancellationPolicy: 'Free cancellation 24 hours before check-in',
            marketingBadgeText: 'Limited Inventory',
            marketingBadgeType: 'URGENT',
            propertyId: sampleProperty.id,
        },
    });

    // 3. Royal Presidential Villa
    await prisma.roomType.upsert({
        where: { propertyId_name: { propertyId: sampleProperty.id, name: 'Royal Presidential Villa' } },
        update: {},
        create: {
            name: 'Royal Presidential Villa',
            description: 'The pinnacle of luxury. A standalone villa with its own private infinity pool and personalized butler service.',
            amenities: ['Private Infinity Pool', 'Butler Service', 'Home Theatre System', 'Kitchenette', 'Steam & Sauna', 'Outdoor Shower'],
            basePrice: 25000,
            extraAdultPrice: 3000,
            extraChildPrice: 1500,
            maxAdults: 4,
            maxChildren: 2,
            images: [
                'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=800',
                'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800',
                'https://images.unsplash.com/photo-1621293954908-907159247fc8?auto=format&fit=crop&w=800',
                'https://images.unsplash.com/photo-1602343168117-bb8973059402?auto=format&fit=crop&w=800'
            ],
            highlights: ['Private Infinity Pool', '24/7 Butler Service', 'Complete Privacy', 'Stunning Valley Views'],
            inclusions: ['All Meals Included', 'Airport Transfers', 'Private Candlelight Dinner (Once)', 'Guided Nature Walk'],
            cancellationPolicy: 'Non-refundable',
            marketingBadgeText: 'Exclusive Offer',
            marketingBadgeType: 'POSITIVE',
            propertyId: sampleProperty.id,
        },
    });

    console.log('✅ Enriched Room types created');

    // Create Sample Rooms
    const roomTypes = await prisma.roomType.findMany({ where: { propertyId: sampleProperty.id } });
    for (const rt of roomTypes) {
        for (let i = 1; i <= 2; i++) {
            await prisma.room.upsert({
                where: { propertyId_roomNumber: { propertyId: sampleProperty.id, roomNumber: `${rt.name.charAt(0)}${i}01` } },
                update: {},
                create: {
                    roomNumber: `${rt.name.charAt(0)}${i}01`,
                    floor: rt.name.includes('Villa') ? 0 : 1,
                    status: 'AVAILABLE',
                    isEnabled: true,
                    roomTypeId: rt.id,
                    propertyId: sampleProperty.id,
                },
            });
        }
    }

    console.log('✅ Sample rooms created');

    // --- OFFERS ---
    const roomTypeHeritage = await prisma.roomType.findFirst({
        where: { propertyId: sampleProperty.id, name: 'Heritage Standard Room' }
    });
    if (roomTypeHeritage) {
        await prisma.offer.upsert({
            where: { id: 'sample-offer-1' }, // Using a fixed ID for upsert if possible, or just create
            update: {},
            create: {
                id: 'sample-offer-1',
                name: 'Inaugural Discount',
                discountPercentage: 15,
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                roomTypeId: roomTypeHeritage.id,
                isActive: true
            }
        });
    }

    // --- COUPONS ---
    await prisma.coupon.upsert({
        where: { code: 'WELCOME20' },
        update: {},
        create: {
            code: 'WELCOME20',
            description: 'Flat 20% off for new users',
            discountType: 'PERCENTAGE',
            discountValue: 20,
            validFrom: new Date(),
            validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            isActive: true,
            maxUses: 1000,
            minBookingAmount: 5000
        }
    });

    await prisma.coupon.upsert({
        where: { code: 'SAVE500' },
        update: {},
        create: {
            code: 'SAVE500',
            description: 'Flat ₹500 off',
            discountType: 'FIXED_AMOUNT',
            discountValue: 500,
            validFrom: new Date(),
            validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            isActive: true,
            minBookingAmount: 2000
        }
    });

    await prisma.coupon.upsert({
        where: { code: 'GUEST10' },
        update: {},
        create: {
            code: 'GUEST10',
            description: 'Special 10% off for guests',
            discountType: 'PERCENTAGE',
            discountValue: 10,
            validFrom: new Date(),
            validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            isActive: true,
            minBookingAmount: 1000
        }
    });

    console.log('✅ Sample offers and coupons created');
    console.log('\n🎉 Database re-seeded with premium content!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
