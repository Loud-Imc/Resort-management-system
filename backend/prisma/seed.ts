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
        else if (roleKey === 'CHANNEL_PARTNER') roleName = 'ChannelPartner';
        else {
            // Convert CUSTOMER -> Customer, MANAGER -> Manager, STAFF -> Staff
            roleName = roleKey.charAt(0).toUpperCase() + roleKey.slice(1).toLowerCase();
        }

        let category = 'SYSTEM';
        const eventRoles = ['EventOrganizer', 'VerificationStaff'];
        const propertyRoles = ['Manager', 'Staff', 'Receptionist', 'Housekeeping', 'Kitchen'];

        if (eventRoles.includes(roleName)) {
            category = 'EVENT';
        } else if (propertyRoles.includes(roleName)) {
            category = 'PROPERTY';
        }

        const existingRole = await prisma.role.findFirst({
            where: {
                name: { equals: roleName, mode: 'insensitive' },
                propertyId: null,
            },
        });

        if (existingRole) {
            await prisma.role.update({
                where: { id: existingRole.id },
                data: {
                    name: roleName, // Ensure exact casing from the constant
                    isSystem: true,
                    category: category as any,
                    description: `${roleName} access role`,
                },
            });
        } else {
            await prisma.role.create({
                data: {
                    name: roleName,
                    description: `${roleName} access role`,
                    isSystem: true,
                    category: category as any,
                    propertyId: null,
                },
            });
        }
    }

    const superAdminRole = await prisma.role.findFirst({ where: { name: 'SuperAdmin', propertyId: null } });
    const ownerRole = await prisma.role.findFirst({ where: { name: 'PropertyOwner', propertyId: null } });

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

        const role = await prisma.role.findFirst({ where: { name: dbRoleName, propertyId: null } });
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
    console.log('✅ Base roles and users created');

    // --- CURRENCIES ---
    const currencies = [
        { code: 'INR', symbol: '₹', rateToINR: 1.0, isActive: true },
        { code: 'AED', symbol: 'AED', rateToINR: 22.7, isActive: true },
        { code: 'USD', symbol: '$', rateToINR: 83.0, isActive: true },
    ];

    for (const currency of currencies) {
        await prisma.currency.upsert({
            where: { code: currency.code },
            update: {
                symbol: currency.symbol,
                rateToINR: currency.rateToINR,
                isActive: currency.isActive,
            },
            create: currency,
        });
    }
    console.log('✅ Currencies seeded');

    // --- PROPERTY CATEGORIES ---
    const categories = [
        { name: 'Resort', slug: 'resort', icon: 'Palmtree', description: 'Luxury resorts with full amenities' },
        { name: 'Hotel', slug: 'hotel', icon: 'Hotel', description: 'Standard and boutique hotels' },
        { name: 'Villa', slug: 'villa', icon: 'Home', description: 'Private villas and vacation rentals' },
        { name: 'Homestay', slug: 'homestay', icon: 'Coffee', description: 'Cozy homestays and bed & breakfasts' },
        { name: 'Other', slug: 'other', icon: 'Layout', description: 'Other types of accommodations' },
    ];

    const createdCategories: any[] = [];
    for (const cat of categories) {
        const category = await prisma.propertyCategory.upsert({
            where: { slug: cat.slug },
            update: {
                name: cat.name,
                icon: cat.icon,
                description: cat.description,
            },
            create: cat,
        });
        createdCategories.push(category);
    }
    console.log('✅ Property categories seeded');

    const resortCategory = createdCategories.find(c => c.slug === 'resort');

    // --- PROPERTY DEFINITIONS ---
    const propertiesData = [
        {
            name: 'The Grand Heritage Resort',
            slug: 'demo-resort',
            type: 'RESORT',
            city: 'Munnar',
            state: 'Kerala',
            description: 'Experience luxury at its finest with our world-class amenities and breathtaking views.',
            roomTypes: [
                {
                    name: 'Heritage Standard Room',
                    basePrice: 4500,
                    maxAdults: 2,
                    maxChildren: 1,
                    amenities: ['High-speed WiFi', '42-inch LED TV', 'Tea/Coffee Maker']
                },
                {
                    name: 'Luxury Garden Suite',
                    basePrice: 8500,
                    maxAdults: 3,
                    maxChildren: 2,
                    amenities: ['Private Balcony', 'Nespresso Machine', 'Mini Bar']
                },
                {
                    name: 'Royal Presidential Villa',
                    basePrice: 25000,
                    maxAdults: 4,
                    maxChildren: 2,
                    amenities: ['Private Infinity Pool', 'Butler Service', 'Home Theatre']
                }
            ]
        },
        {
            name: 'Coastal Breeze Hotel',
            slug: 'coastal-breeze',
            type: 'HOTEL',
            city: 'Goa',
            state: 'Goa',
            description: 'A modern boutique hotel just steps away from the pristine beaches of North Goa.',
            roomTypes: [
                {
                    name: 'Deluxe Sea View Room',
                    basePrice: 5500,
                    maxAdults: 2,
                    maxChildren: 1,
                    amenities: ['Sea View', 'Air Conditioning', 'Balcony']
                },
                {
                    name: 'Executive Suite',
                    basePrice: 9500,
                    maxAdults: 3,
                    maxChildren: 1,
                    amenities: ['Work Desk', 'Lounge Access', 'King Bed']
                }
            ]
        },
        {
            name: 'Pine Valley Villa',
            slug: 'pine-valley',
            type: 'VILLA',
            city: 'Manali',
            state: 'Himachal Pradesh',
            description: 'A cozy wooden villa surrounded by pine forests, perfect for a peaceful mountain getaway.',
            roomTypes: [
                {
                    name: 'Standard Pine Villa',
                    basePrice: 7000,
                    maxAdults: 4,
                    maxChildren: 2,
                    amenities: ['Fireplace', 'Mountain View', 'Kitchenette']
                },
                {
                    name: 'Luxury Pine Villa',
                    basePrice: 12000,
                    maxAdults: 6,
                    maxChildren: 3,
                    amenities: ['Jacuzzi', 'Private Deck', 'Large Living Area']
                }
            ]
        },
        {
            name: 'Serene Lake Homestay',
            slug: 'serene-lake',
            type: 'HOMESTAY',
            city: 'Udaipur',
            state: 'Rajasthan',
            description: 'A traditional Rajasthani home offering a warm stay with views of Lake Pichola.',
            roomTypes: [
                {
                    name: 'Lake View Haven',
                    basePrice: 3500,
                    maxAdults: 2,
                    maxChildren: 1,
                    amenities: ['Lake View', 'Home-cooked Meals', 'Traditional Decor']
                },
                {
                    name: 'Family Heritage Room',
                    basePrice: 6000,
                    maxAdults: 4,
                    maxChildren: 2,
                    amenities: ['Extra Beds', 'Shared Porch', 'Cultural Experience']
                }
            ]
        }
    ];

    for (const pData of propertiesData) {
        const catSlug = pData.type.toLowerCase();
        const category = createdCategories.find(c => c.slug === catSlug) || createdCategories.find(c => c.slug === 'other');

        const property = await prisma.property.upsert({
            where: { slug: pData.slug },
            update: {
                categoryId: category?.id,
                baseCurrency: 'INR',
                status: 'APPROVED',
                isVerified: true,
            },
            create: {
                name: pData.name,
                slug: pData.slug,
                description: pData.description,
                address: `Sample Address for ${pData.name}`,
                city: pData.city,
                state: pData.state,
                country: 'India',
                pincode: '000000',
                type: pData.type as any,
                baseCurrency: 'INR',
                categoryId: category?.id,
                email: `info@${pData.slug}.com`,
                phone: '+910000000000',
                ownerId: ownerUser.id,
                images: ['https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200'],
                amenities: ['WiFi', 'Parking', 'Room Service'],
                status: 'APPROVED',
                isVerified: true,
            }
        });


        console.log(`🏠 Property Upserted: ${property.name}`);

        for (const rtData of pData.roomTypes) {
            const rt = await prisma.roomType.upsert({
                where: { propertyId_name: { propertyId: property.id, name: rtData.name } },
                update: {
                    basePrice: rtData.basePrice,
                    maxAdults: rtData.maxAdults,
                    maxChildren: rtData.maxChildren,
                    amenities: rtData.amenities
                },
                create: {
                    name: rtData.name,
                    description: `${rtData.name} in ${property.name}`,
                    amenities: rtData.amenities,
                    basePrice: rtData.basePrice,
                    extraAdultPrice: Math.round(rtData.basePrice * 0.2),
                    extraChildPrice: Math.round(rtData.basePrice * 0.1),
                    maxAdults: rtData.maxAdults,
                    maxChildren: rtData.maxChildren,
                    images: ['https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=800'],
                    highlights: ['Premium Comfort', 'Modern Design'],
                    inclusions: ['Breakfast Included'],
                    cancellationPolicyText: 'Free cancellation 24h prior',
                    propertyId: property.id,
                },
            });

            console.log(`  🛌 Room Type Upserted: ${rt.name}`);

            // Create 5 rooms for each room type
            for (let i = 1; i <= 5; i++) {
                const roomNumber = `${rt.name.split(' ').map(w => w[0]).join('')}${i}0${i}`;
                await prisma.room.upsert({
                    where: { propertyId_roomNumber: { propertyId: property.id, roomNumber } },
                    update: {},
                    create: {
                        roomNumber,
                        floor: 1,
                        status: 'AVAILABLE',
                        isEnabled: true,
                        roomTypeId: rt.id,
                        propertyId: property.id,
                    },
                });
            }
            console.log(`    🚪 5 Rooms Upserted for ${rt.name}`);
        }
    }

    // --- OFFERS ---
    // Link an offer to the first property's first room type
    const firstProperty = await prisma.property.findFirst({ where: { slug: 'demo-resort' } });
    if (firstProperty) {
        const firstRoomType = await prisma.roomType.findFirst({ where: { propertyId: firstProperty.id } });
        if (firstRoomType) {
            await prisma.offer.upsert({
                where: { id: 'sample-offer-1' },
                update: { roomTypeId: firstRoomType.id },
                create: {
                    id: 'sample-offer-1',
                    name: 'Inaugural Discount',
                    discountPercentage: 15,
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    roomTypeId: firstRoomType.id,
                    isActive: true
                }
            });
        }
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

    console.log('✅ Coupons seeded');

    // --- EXPENSE CATEGORIES ---
    const expenseCategories = [
        { name: 'Maintenance', description: 'Property maintenance and repairs' },
        { name: 'Utilities', description: 'Electricity, water, internet, etc.' },
        { name: 'Salaries & Wages', description: 'Employee compensation' },
        { name: 'Marketing', description: 'Advertising and promotions' },
        { name: 'Housekeeping', description: 'Cleaning supplies and services' },
        { name: 'Food & Beverage', description: 'Kitchen and restaurant expenses' },
        { name: 'Taxes & Licenses', description: 'Government fees and taxes' },
        { name: 'Miscellaneous', description: 'Other operational costs' },
    ];

    for (const cat of expenseCategories) {
        const existing = await prisma.expenseCategory.findFirst({
            where: { name: cat.name, propertyId: null },
        });

        if (existing) {
            await prisma.expenseCategory.update({
                where: { id: existing.id },
                data: { description: cat.description },
            });
        } else {
            await prisma.expenseCategory.create({
                data: { ...cat, propertyId: null },
            });
        }
    }
    console.log('✅ Expense categories seeded');

    console.log('\n🎉 Database re-seeded with 4 properties and rooms!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
