
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const settings = await prisma.systemSettings.findFirst({
    where: { key: 'gst_tiers' }
  });
  console.log(JSON.stringify(settings, null, 2));
  await prisma.$disconnect();
}

check();
