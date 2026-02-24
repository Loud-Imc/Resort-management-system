const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Cleaning phone numbers ---');

    // 1. Set empty/whitespace strings to NULL
    const emptyUpdate = await prisma.user.updateMany({
        where: {
            OR: [
                { phone: '' },
                { phone: { contains: ' ' } }
            ]
        },
        data: { phone: null }
    });
    console.log(`Updated ${emptyUpdate.count} empty/whitespace phone numbers to NULL.`);

    // 2. Find actual duplicates (case-insensitive and trimmed)
    const users = await prisma.user.findMany({
        where: { NOT: { phone: null } },
        select: { id: true, phone: true }
    });

    const seen = new Set();
    let duplicateCount = 0;

    for (const user of users) {
        const p = user.phone.trim();
        if (seen.has(p)) {
            await prisma.user.update({
                where: { id: user.id },
                data: { phone: null }
            });
            duplicateCount++;
        } else {
            seen.add(p);
        }
    }
    console.log(`Nullified ${duplicateCount} duplicate phone numbers.`);
    console.log('Cleanup complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
