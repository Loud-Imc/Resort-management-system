import { PrismaClient } from '@prisma/client';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ChannelsService } from '../src/channels/channels.service';

const prisma = new PrismaClient();

async function main() {
  console.log('Bootstrapping NestJS application context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const channelsService = app.get(ChannelsService);

  const property = await prisma.property.findFirst({
    where: { name: 'Test Property - RouteGuide' },
  });

  if (!property) {
    throw new Error('Test Property - RouteGuide not found.');
  }

  console.log(`\nTriggering 500-day Full Sync for Property: "${property.name}" (${property.id})...`);
  
  // This will run the real integration code and print the Task IDs directly to your console!
  await channelsService.pushAriForProperty(property.id, 500);

  console.log('\nFull Sync triggered successfully. Check the console output above for the 500-day Task IDs!');
  await app.close();
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
