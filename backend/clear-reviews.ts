import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.review.deleteMany();
  console.log('Cleared all reviews');
}
main().catch(console.error).finally(() => prisma.$disconnect());
