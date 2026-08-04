import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function run() {
  const apiKey = process.env.CHANNEX_USER_API_KEY;
  const baseUrl = process.env.CHANNEX_BASE_URL || 'https://staging.channex.io/api/v1';

  console.log(`Loading API Key: ${apiKey?.substring(0, 10)}...`);
  console.log(`Base URL: ${baseUrl}`);

  // Fetch the first active property mapping
  const mapping = await prisma.channelPropertyMapping.findFirst({
    where: { channelName: 'CHANNEX', isActive: true },
  });

  if (!mapping) {
    console.error('No active CHANNEX property mapping found in your database. Please link a property to Channex first.');
    return;
  }

  const externalPropertyId = mapping.externalPropertyId;
  console.log(`Found active Channex Property UUID: ${externalPropertyId}`);

  const testCases = [
    `/channels/providers`,
    `/channels/providers?property_id=${externalPropertyId}`,
    `/channels/providers?filter[property_id]=${externalPropertyId}`,
    `/channels/catalog`,
    `/channels/catalog?property_id=${externalPropertyId}`,
    `/channels/catalog?filter[property_id]=${externalPropertyId}`,
    `/ota_types`,
    `/ota_types?property_id=${externalPropertyId}`,
    `/ota_types?filter[property_id]=${externalPropertyId}`,
  ];

  for (const tc of testCases) {
    try {
      const response = await axios.get(`${baseUrl}${tc}`, {
        headers: {
          'user-api-key': apiKey,
        },
      });
      console.log(`\nSUCCESS [${tc}]: Status ${response.status}`);
      const dataItems = response.data.data ? response.data.data : response.data;
      if (Array.isArray(dataItems)) {
        console.log(`Returned list of ${dataItems.length} items. First item:`);
        console.log(JSON.stringify(dataItems[0], null, 2));
      } else {
        console.log(JSON.stringify(dataItems, null, 2));
      }
      return; // Stop on first success!
    } catch (error: any) {
      console.log(`FAILED [${tc}]: ${error.response?.status} - ${JSON.stringify(error.response?.data?.errors || error.message)}`);
    }
  }
}

run()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    prisma.$disconnect();
  });
