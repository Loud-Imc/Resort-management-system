import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Inspecting all entries in ChannelPropertyMapping:');
  const mappings = await prisma.channelPropertyMapping.findMany({
    include: {
      property: {
        select: {
          id: true,
          name: true,
          slug: true,
          baseCurrency: true
        }
      }
    }
  });

  console.log(JSON.stringify(mappings, null, 2));
}

main();
