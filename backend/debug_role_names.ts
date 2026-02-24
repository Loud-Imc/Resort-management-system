import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const roles = await prisma.role.findMany({
        select: { name: true, propertyId: true }
    });
    console.log(roles);
}

main().catch(console.error).finally(() => prisma.$disconnect());
