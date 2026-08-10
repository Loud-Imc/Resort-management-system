import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const propertyId = '3c206f90-12bd-479e-8f8b-0f12178b941d'; // Varkala Cliff Edge Homestay
  console.log(`Inspecting room mappings for Varkala Cliff Edge Homestay (${propertyId}):`);

  const mapping = await prisma.channelPropertyMapping.findFirst({
    where: { propertyId, channelName: 'CHANNEX' },
    include: {
      roomMappings: {
        include: {
          roomType: true
        }
      }
    }
  });

  if (!mapping) {
    console.log('No Channex property mapping found.');
    return;
  }

  console.log('Property Mapping:', JSON.stringify({
    id: mapping.id,
    externalPropertyId: mapping.externalPropertyId,
    isActive: mapping.isActive
  }, null, 2));

  console.log('\nRoom Mappings:');
  console.log(JSON.stringify(mapping.roomMappings, null, 2));
}

main();
