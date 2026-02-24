const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const users = await prisma.user.findMany({ take: 1 });
        console.log('Successfully queried users table');
        console.log('Columns found:', Object.keys(users[0] || {}));
        process.exit(0);
    } catch (e) {
        console.error('Error querying users:', e.message);
        process.exit(1);
    }
}

check();
