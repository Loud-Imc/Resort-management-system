import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const standard = await prisma.partnerLevel.findUnique({ where: { name: 'Standard' } });
    console.log('Standard Tier:', JSON.stringify(standard, null, 2));
    const allCount = await prisma.partnerLevel.count();
    console.log('Total Tiers Count:', allCount);
}
main().catch(console.error).finally(() => prisma.$disconnect());
