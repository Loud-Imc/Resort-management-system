import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create Roles
    const superAdminRole = await prisma.role.upsert({
        where: { name: 'SuperAdmin' },
        update: {},
        create: {
            name: 'SuperAdmin',
            description: 'Full system access',
        },
    });

    const adminRole = await prisma.role.upsert({
        where: { name: 'Admin' },
        update: {},
        create: {
            name: 'Admin',
            description: 'Administrative access',
        },
    });

    const managerRole = await prisma.role.upsert({
        where: { name: 'Manager' },
        update: {},
        create: {
            name: 'Manager',
            description: 'Manager access',
        },
    });

    const staffRole = await prisma.role.upsert({
        where: { name: 'Staff' },
        update: {},
        create: {
            name: 'Staff',
            description: 'Staff access',
        },
    });

    const customerRole = await prisma.role.upsert({
        where: { name: 'Customer' },
        update: {},
        create: {
            name: 'Customer',
            description: 'Customer access',
        },
    });

    const marketingRole = await prisma.role.upsert({
        where: { name: 'Marketing' },
        update: {},
        create: {
            name: 'Marketing',
            description: 'Marketing staff access',
        },
    });

    console.log('✅ Roles created');

    // Create Permissions
    const permissions = [
        // Users
        { name: 'users.view', module: 'Users', description: 'View system users' },
        { name: 'users.create', module: 'Users', description: 'Create new users' },
        { name: 'users.edit', module: 'Users', description: 'Edit existing users' },
        { name: 'users.delete', module: 'Users', description: 'Delete users' },
        { name: 'users.manage', module: 'Users', description: 'Manage user access' },

        // Properties
        { name: 'properties.view', module: 'Properties', description: 'View properties' },
        { name: 'properties.create', module: 'Properties', description: 'Add new properties' },
        { name: 'properties.edit', module: 'Properties', description: 'Edit property details' },
        { name: 'properties.delete', module: 'Properties', description: 'Delete properties' },

        // Room Types
        { name: 'roomTypes.view', module: 'Room Types', description: 'View room types' },
        { name: 'roomTypes.create', module: 'Room Types', description: 'Create room types' },
        { name: 'roomTypes.edit', module: 'Room Types', description: 'Edit room types' },
        { name: 'roomTypes.delete', module: 'Room Types', description: 'Delete room types' },

        // Rooms
        { name: 'rooms.view', module: 'Rooms', description: 'View rooms' },
        { name: 'rooms.create', module: 'Rooms', description: 'Add individual rooms' },
        { name: 'rooms.edit', module: 'Rooms', description: 'Edit room status/details' },
        { name: 'rooms.delete', module: 'Rooms', description: 'Delete rooms' },

        // Bookings
        { name: 'bookings.view', module: 'Bookings', description: 'View bookings' },
        { name: 'bookings.create', module: 'Bookings', description: 'Create manual bookings' },
        { name: 'bookings.edit', module: 'Bookings', description: 'Edit bookings' },
        { name: 'bookings.delete', module: 'Bookings', description: 'Cancel/Delete bookings' },

        // Payments & Financials
        { name: 'payments.view', module: 'Financials', description: 'View transaction history' },
        { name: 'payments.process', module: 'Financials', description: 'Process payments/refunds' },
        { name: 'financials.view', module: 'Financials', description: 'View financial reports' },
        { name: 'financials.manage', module: 'Financials', description: 'Manage expenses & pricing' },

        // Marketing
        { name: 'marketing.view', module: 'Marketing', description: 'View marketing dashboard' },
        { name: 'marketing.manage', module: 'Marketing', description: 'Manage campaigns & commissions' },

        // Settings
        { name: 'settings.view', module: 'Settings', description: 'View system settings' },
        { name: 'settings.manage', module: 'Settings', description: 'Modify system configuration' },

        // Reports
        { name: 'reports.view', module: 'Reports', description: 'Access system reports' },
    ];

    for (const permission of permissions) {
        await prisma.permission.upsert({
            where: { name: permission.name },
            update: {},
            create: permission,
        });
    }

    console.log('✅ Permissions created');

    // Assign all permissions to SuperAdmin
    const allPermissions = await prisma.permission.findMany();
    for (const permission of allPermissions) {
        await prisma.rolePermission.upsert({
            where: {
                roleId_permissionId: {
                    roleId: superAdminRole.id,
                    permissionId: permission.id,
                },
            },
            update: {},
            create: {
                roleId: superAdminRole.id,
                permissionId: permission.id,
            },
        });
    }

    console.log('✅ Permissions assigned to SuperAdmin');

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
        where: {
            userId_roleId: {
                userId: superAdmin.id,
                roleId: superAdminRole.id,
            },
        },
        update: {},
        create: {
            userId: superAdmin.id,
            roleId: superAdminRole.id,
        },
    });

    console.log('✅ Super Admin user created (admin@resort.com / admin123)');

    // Create Booking Sources
    const bookingSources = [
        { name: 'Direct', description: 'Direct bookings', commission: 0 },
        { name: 'Online', description: 'Website bookings', commission: 0 },
        { name: 'Booking.com', description: 'Booking.com', commission: 15 },
        { name: 'Agoda', description: 'Agoda', commission: 15 },
        { name: 'Broker', description: 'Travel broker', commission: 10 },
    ];

    for (const source of bookingSources) {
        await prisma.bookingSource.upsert({
            where: { name: source.name },
            update: {},
            create: source,
        });
    }

    console.log('✅ Booking sources created');

    // Create Expense Categories
    const expenseCategories = [
        { name: 'Maintenance', description: 'Property maintenance' },
        { name: 'Utilities', description: 'Electricity, water, etc.' },
        { name: 'Salaries', description: 'Staff salaries' },
        { name: 'Supplies', description: 'Cleaning supplies, toiletries, etc.' },
        { name: 'Marketing', description: 'Marketing and advertising' },
        { name: 'Miscellaneous', description: 'Other expenses' },
    ];

    for (const category of expenseCategories) {
        await prisma.expenseCategory.upsert({
            where: { name: category.name },
            update: {},
            create: category,
        });
    }

    console.log('✅ Expense categories created');

    // Create Sample Room Types
    const standardRoom = await prisma.roomType.create({
        data: {
            name: 'Standard Room',
            description: 'Comfortable standard room with essential amenities',
            amenities: ['WiFi', 'AC', 'TV', 'Attached Bathroom'],
            basePrice: 3000,
            extraAdultPrice: 800,
            extraChildPrice: 400,
            freeChildrenCount: 1,
            maxAdults: 2,
            maxChildren: 2,
            isPubliclyVisible: true,
            images: [],
        },
    });

    const deluxeRoom = await prisma.roomType.create({
        data: {
            name: 'Deluxe Room',
            description: 'Spacious deluxe room with premium amenities',
            amenities: ['WiFi', 'AC', 'Smart TV', 'Mini Bar', 'Balcony', 'Premium Bathroom'],
            basePrice: 5000,
            extraAdultPrice: 1200,
            extraChildPrice: 600,
            freeChildrenCount: 1,
            maxAdults: 3,
            maxChildren: 2,
            isPubliclyVisible: true,
            images: [],
        },
    });

    const poolVilla = await prisma.roomType.create({
        data: {
            name: 'Pool Villa',
            description: 'Luxury villa with private pool and garden',
            amenities: ['WiFi', 'AC', 'Smart TV', 'Mini Bar', 'Private Pool', 'Garden', 'Kitchen', 'Jacuzzi'],
            basePrice: 12000,
            extraAdultPrice: 2000,
            extraChildPrice: 1000,
            freeChildrenCount: 2,
            maxAdults: 4,
            maxChildren: 3,
            isPubliclyVisible: true,
            images: [],
        },
    });

    console.log('✅ Room types created');

    // Create Sample Rooms
    for (let i = 1; i <= 5; i++) {
        await prisma.room.create({
            data: {
                roomNumber: `101${i}`,
                floor: 1,
                status: 'AVAILABLE',
                isEnabled: true,
                roomTypeId: standardRoom.id,
            },
        });
    }

    for (let i = 1; i <= 3; i++) {
        await prisma.room.create({
            data: {
                roomNumber: `201${i}`,
                floor: 2,
                status: 'AVAILABLE',
                isEnabled: true,
                roomTypeId: deluxeRoom.id,
            },
        });
    }

    for (let i = 1; i <= 2; i++) {
        await prisma.room.create({
            data: {
                roomNumber: `301${i}`,
                floor: 3,
                status: 'AVAILABLE',
                isEnabled: true,
                roomTypeId: poolVilla.id,
            },
        });
    }

    console.log('✅ Sample rooms created');
    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📝 Login credentials:');
    console.log('   Email: admin@resort.com');
    console.log('   Password: admin123');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
