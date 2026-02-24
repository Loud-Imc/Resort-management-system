const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const roles = await prisma.role.findMany({
            where: { name: 'Customer' }
        });
        console.log('Customer roles found:', roles.length);
        if (roles.length > 0) {
            console.log('Role details:', JSON.stringify(roles[0], null, 2));
        } else {
            const allRoles = await prisma.role.findMany({ select: { name: true } });
            console.log('Available roles:', allRoles.map(r => r.name).join(', '));
        }
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

check();
