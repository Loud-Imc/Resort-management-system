const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
    console.log('🔍 Searching for duplicate phone numbers...');

    const users = await prisma.user.findMany({
        where: {
            NOT: { phone: null },
            phone: { not: '' }
        },
        select: { id: true, phone: true, createdAt: true }
    });

    const counts = {};
    users.forEach(u => {
        counts[u.phone] = (counts[u.phone] || 0) + 1;
    });

    const duplicatePhones = Object.keys(counts).filter(p => counts[p] > 1);

    if (duplicatePhones.length === 0) {
        console.log('✅ No duplicate phone numbers found (that are not null or empty).');

        // Check for empty strings as they also cause unique constraint issues
        const emptyStrings = await prisma.user.findMany({
            where: { phone: '' }
        });

        if (emptyStrings.length > 1) {
            console.log(`⚠️ Found ${emptyStrings.length} users with empty phone strings. Nullifying them...`);
            await prisma.user.updateMany({
                where: { phone: '' },
                data: { phone: null }
            });
            console.log('✅ Empty strings nullified.');
        } else {
            console.log('✅ No duplicate empty strings found.');
        }

        process.exit(0);
    }

    console.log(`⚠️ Found ${duplicatePhones.length} duplicate phone numbers. Cleaning up...`);

    for (const phone of duplicatePhones) {
        const records = users
            .filter(u => u.phone === phone)
            .sort((a, b) => b.createdAt - a.createdAt); // Sort newest first

        // Keep the newest one, nullify the rest
        const [keep, ...remove] = records;
        console.log(`   - Phone "${phone}": Keeping user ${keep.id}, nullifying ${remove.length} others.`);

        for (const r of remove) {
            await prisma.user.update({
                where: { id: r.id },
                data: { phone: null }
            });
        }
    }

    console.log('✅ Cleanup complete!');
    process.exit(0);
}

cleanup().catch(err => {
    console.error('❌ Error during cleanup:', err);
    process.exit(1);
}).finally(() => prisma.$disconnect());
