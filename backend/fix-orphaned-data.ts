import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Checking for orphaned data (NULL propertyId)...');

    // Use raw query to avoid selecting columns that don't exist yet (like isFeatured)
    const properties = await prisma.$queryRawUnsafe('SELECT id FROM properties LIMIT 1') as any[];
    let propertyId = properties.length > 0 ? properties[0].id : null;

    if (!propertyId) {
        console.log('⚠️ No property found. Creating a default one via raw SQL...');

        // Get any user to be the owner
        const users = await prisma.$queryRawUnsafe('SELECT id, email FROM users LIMIT 1') as any[];
        if (users.length === 0) {
            throw new Error('❌ Error: No users found in database. Please ensure the database has been seeded.');
        }
        const owner = users[0];

        propertyId = 'default-property-id';
        // We need to CAST to "PropertyType" enum because Postgres is strict
        await prisma.$executeRawUnsafe(
            'INSERT INTO properties (id, name, slug, type, address, city, state, email, phone, "ownerId", "updatedAt") VALUES ($1, $2, $3, $4::"PropertyType", $5, $6, $7, $8, $9, $10, NOW())',
            propertyId, 'Default Property', 'default-property', 'RESORT', 'Default Address', 'Default City', 'Default State', owner.email, '0000000000', owner.id
        );
        console.log(`✨ Created default property.`);
    }

    console.log(`✅ Using property ID: ${propertyId}`);

    // Fix RoomTypes
    const roomTypeResult = await prisma.$executeRawUnsafe(
        'UPDATE room_types SET "propertyId" = $1 WHERE "propertyId" IS NULL',
        propertyId
    );
    console.log(`📦 Fixed ${roomTypeResult} orphaned RoomTypes`);

    // Fix Rooms
    const roomResult = await prisma.$executeRawUnsafe(
        'UPDATE rooms SET "propertyId" = $1 WHERE "propertyId" IS NULL',
        propertyId
    );
    console.log(`🏨 Fixed ${roomResult} orphaned Rooms`);

    console.log('\n🚀 Orphaned data check complete. You can now re-run the migration.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
