import { PrismaClient } from '@prisma/client';
import { PERMISSIONS, PERMISSION_GROUPS } from '../src/auth/constants/permissions.constant';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting Production-Safe Seeding (Metadata Only)...');

    // 1. SYNC PERMISSIONS
    console.log('  🔐 Syncing Permissions...');
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

    // 2. SYNC ROLES
    console.log('  🎭 Syncing System Roles...');
    for (const roleKey of Object.keys(PERMISSION_GROUPS)) {
        let roleName = roleKey;
        if (roleKey === 'SUPER_ADMIN') roleName = 'SuperAdmin';
        else if (roleKey === 'PROPERTY_OWNER') roleName = 'PropertyOwner';
        else if (roleKey === 'EVENT_ORGANIZER') roleName = 'EventOrganizer';
        else if (roleKey === 'VERIFICATION_STAFF') roleName = 'VerificationStaff';
        else if (roleKey === 'MARKETING') roleName = 'Marketing';
        else if (roleKey === 'CHANNEL_PARTNER') roleName = 'ChannelPartner';
        else {
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
                    name: roleName,
                    isSystem: true,
                    category: category as any,
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

    // 3. ATTACH PERMISSIONS TO ROLES
    console.log('  🔗 Linking Permissions to Roles...');
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
        if (!role) continue;

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

    // 4. SYNC CURRENCIES
    console.log('  💱 Syncing Currencies...');
    const currencies = [
        { code: 'INR', symbol: '₹', rateToINR: 1.0, isActive: true },
        { code: 'AED', symbol: 'AED', rateToINR: 22.7, isActive: true },
        { code: 'USD', symbol: '$', rateToINR: 83.0, isActive: true },
    ];
    for (const currency of currencies) {
        await prisma.currency.upsert({
            where: { code: currency.code },
            update: { symbol: currency.symbol, rateToINR: currency.rateToINR },
            create: currency,
        });
    }

    // 5. SYNC PROPERTY CATEGORIES
    console.log('  🏨 Syncing Property Categories...');
    const categories = [
        { name: 'Resort', slug: 'resort', icon: 'Palmtree', description: 'Luxury resorts with full amenities' },
        { name: 'Hotel', slug: 'hotel', icon: 'Hotel', description: 'Standard and boutique hotels' },
        { name: 'Villa', slug: 'villa', icon: 'Home', description: 'Private villas and vacation rentals' },
        { name: 'Homestay', slug: 'homestay', icon: 'Coffee', description: 'Cozy homestays and bed & breakfasts' },
        { name: 'Other', slug: 'other', icon: 'Layout', description: 'Other types of accommodations' },
    ];
    for (const cat of categories) {
        await prisma.propertyCategory.upsert({
            where: { slug: cat.slug },
            update: { name: cat.name, icon: cat.icon, description: cat.description },
            create: cat,
        });
    }

    // 6. SYNC EXPENSE CATEGORIES
    console.log('  📉 Syncing Expense Categories...');
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

    console.log('\n✅ Production Metadata Sync Complete! No demo data was added.');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
