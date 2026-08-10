import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

const USER_API_KEY = 'u5wpOi89Mo9NPXiGg03sDppzK6cYX1oUu3jDPx8K8MT10PdikVNXrvcFy4mtAhqF';
const BASE_URL = 'https://staging.channex.io/api/v1';

async function main() {
  console.log('Fetching properties from Channex Staging account...');
  const response = await fetch(`${BASE_URL}/properties`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'user-api-key': USER_API_KEY,
    },
  });

  const resData = await response.json();
  const channexProps = resData.data || [];
  console.log(`Found ${channexProps.length} properties in Channex Staging:\n`);

  for (const cp of channexProps) {
    console.log(`- Title: "${cp.attributes.title}"`);
    console.log(`  Channex ID: ${cp.attributes.id}`);
    console.log(`  Currency: ${cp.attributes.currency}\n`);
  }

  console.log('--------------------------------------------------');
  console.log('Matching and updating local database mappings by name match...');

  const localProperties = await prisma.property.findMany();

  for (const lp of localProperties) {
    // Find a matching property in Channex by title (case-insensitive)
    const match = channexProps.find((cp: any) => 
      cp.attributes.title.toLowerCase().trim() === lp.name.toLowerCase().trim()
    );

    if (match) {
      console.log(`MATCH FOUND: Local "${lp.name}" matches Channex "${match.attributes.title}"`);
      console.log(`Updating mapping for local property ${lp.name} (${lp.id}) to use externalPropertyId: ${match.attributes.id}`);
      
      await prisma.channelPropertyMapping.upsert({
        where: {
          propertyId_channelName: { propertyId: lp.id, channelName: 'CHANNEX' }
        },
        update: {
          externalPropertyId: match.attributes.id,
          isActive: true
        },
        create: {
          propertyId: lp.id,
          channelName: 'CHANNEX',
          externalPropertyId: match.attributes.id,
          isActive: true
        }
      });
    } else {
      console.log(`NO MATCH: Could not find a matching property name in Channex for "${lp.name}".`);
    }
  }

  console.log('\nSync and correction completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
