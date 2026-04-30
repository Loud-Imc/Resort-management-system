
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const properties = await prisma.property.findMany({
    select: {
      id: true,
      name: true,
      isGroupGstInclusive: true,
      groupPriceAdult: true,
      groupPriceChild: true,
      groupPricePerHead: true
    }
  });
  console.log(JSON.stringify(properties, null, 2));
  await prisma.$disconnect();
}

check();
