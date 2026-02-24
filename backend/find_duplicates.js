const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: { NOT: { phone: null } },
        select: { id: true, phone: true }
    });

    console.log('Total users with phone:', users.length);

    users.forEach(u => {
        const hex = Buffer.from(u.phone).toString('hex');
        console.log(`ID: ${u.id} | Phone: "${u.phone}" | Hex: ${hex}`);
    });

    const counts = {};
    users.forEach(u => {
        counts[u.phone] = (counts[u.phone] || 0) + 1;
    });

    const duplicates = Object.keys(counts).filter(p => counts[p] > 1);
    console.log('Duplicates:', duplicates);

    if (duplicates.length > 0) {
        for (const p of duplicates) {
            const dups = users.filter(u => u.phone === p);
            console.log(`Duplicate phone "${p}" (hex ${Buffer.from(p).toString('hex')}) and its user IDs:`, dups.map(u => u.id));
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
