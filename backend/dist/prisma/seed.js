"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding database...');
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
    console.log('✅ Roles created');
    const permissions = [
        { name: 'users.view', module: 'users', description: 'View users' },
        { name: 'users.create', module: 'users', description: 'Create users' },
        { name: 'users.edit', module: 'users', description: 'Edit users' },
        { name: 'users.delete', module: 'users', description: 'Delete users' },
        { name: 'rooms.view', module: 'rooms', description: 'View rooms' },
        { name: 'rooms.create', module: 'rooms', description: 'Create rooms' },
        { name: 'rooms.edit', module: 'rooms', description: 'Edit rooms' },
        { name: 'rooms.delete', module: 'rooms', description: 'Delete rooms' },
        { name: 'bookings.view', module: 'bookings', description: 'View bookings' },
        { name: 'bookings.create', module: 'bookings', description: 'Create bookings' },
        { name: 'bookings.edit', module: 'bookings', description: 'Edit bookings' },
        { name: 'bookings.delete', module: 'bookings', description: 'Delete bookings' },
        { name: 'payments.view', module: 'payments', description: 'View payments' },
        { name: 'payments.refund', module: 'payments', description: 'Process refunds' },
        { name: 'reports.view', module: 'reports', description: 'View reports' },
    ];
    for (const permission of permissions) {
        await prisma.permission.upsert({
            where: { name: permission.name },
            update: {},
            create: permission,
        });
    }
    console.log('✅ Permissions created');
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
//# sourceMappingURL=seed.js.map