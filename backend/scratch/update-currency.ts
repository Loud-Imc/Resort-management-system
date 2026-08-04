import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.property.updateMany({
    data: {
      baseCurrency: 'USD',
    },
  });
  console.log(`Successfully updated ${result.count} property/properties base currency to USD.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
