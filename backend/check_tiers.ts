import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const levels = await prisma.partnerLevel.findMany();
    console.log(JSON.stringify(levels, null, 2));
    const settings = await prisma.globalSetting.findMany({ where: { key: 'DEFAULT_COMMISSION_RATE' } });
    console.log('Default Commission Rate Setting:', settings[0]?.value);
}
main().catch(console.error).finally(() => prisma.$disconnect());
