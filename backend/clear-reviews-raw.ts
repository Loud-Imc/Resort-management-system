import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE reviews CASCADE');
  console.log('Truncated all reviews');
}
main().catch(console.error).finally(() => prisma.$disconnect());
