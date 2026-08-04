import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.channelPropertyMapping.updateMany({
    where: {
      channelName: 'CHANNEX',
    },
    data: {
      externalPropertyId: '16442678-4d88-46c6-ae2a-9cca53ef31f1',
    },
  });
  console.log(`Successfully updated ${result.count} Channex property mapping(s) to use staging ID 16442678-4d88-46c6-ae2a-9cca53ef31f1.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
