import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Checking for orphaned data (NULL propertyId)...');

    // 1. Get or create a default property
    let defaultProperty = await prisma.property.findFirst();

    if (!defaultProperty) {
        console.log('⚠️ No property found. Creating a default one...');

        // We need an owner for the property
        // Search for a user with the PropertyOwner role
        let owner = await prisma.user.findFirst({
            where: {
                roles: {
                    some: {
                        role: {
                            name: 'PropertyOwner'
                        }
                    }
                }
            }
        });

        if (!owner) {
            console.log('⚠️ No user with PropertyOwner role found. Looking for any user...');
            owner = await prisma.user.findFirst();
        }

        if (!owner) {
            throw new Error('❌ Error: No users found in database. Please ensure the database has been seeded with at least one user.');
        }

        defaultProperty = await prisma.property.create({
            data: {
                name: 'Default Property',
                slug: 'default-property',
                type: 'RESORT',
                email: owner.email,
                phone: owner.phone || '0000000000',
                address: 'Default Address',
                city: 'Default City',
                state: 'Default State',
                ownerId: owner.id,
            }
        });
        console.log(`✨ Created default property: ${defaultProperty.name}`);
    }

    console.log(`✅ Using property: ${defaultProperty.name} (${defaultProperty.id})`);

    // 2. Fix RoomTypes
    // We use executeRaw because Prisma's generated types might already expect propertyId to be non-nullable
    const roomTypeResult = await prisma.$executeRawUnsafe(
        `UPDATE room_types SET "propertyId" = $1 WHERE "propertyId" IS NULL`,
        defaultProperty.id
    );
    console.log(`📦 Fixed ${roomTypeResult} orphaned RoomTypes`);

    // 3. Fix Rooms
    const roomResult = await prisma.$executeRawUnsafe(
        `UPDATE rooms SET "propertyId" = $1 WHERE "propertyId" IS NULL`,
        defaultProperty.id
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
