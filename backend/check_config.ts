
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Property Configuration Check ---');
  const properties = await prisma.property.findMany({
    include: {
      roomTypes: true,
      _count: {
        select: { rooms: true }
      }
    }
  });

  for (const p of properties) {
    console.log(`Property: ${p.name}`);
    console.log(`  ID: ${p.id}`);
    console.log(`  Status: ${p.status}`);
    console.log(`  Is Active: ${p.isActive}`);
    console.log(`  Allows Group Booking: ${p.allowsGroupBooking}`);
    console.log(`  Max Group Capacity: ${p.maxGroupCapacity}`);
    console.log(`  Group Price Per Head: ${p.groupPricePerHead}`);
    console.log(`  Room Types (${p.roomTypes.length}):`);
    for (const rt of p.roomTypes) {
      console.log(`    - ${rt.name}:`);
      console.log(`      Group Eligible: ${rt.isAvailableForGroupBooking}`);
      console.log(`      Max Adults: ${rt.maxAdults}, Max Children: ${rt.maxChildren}`);
    }
    console.log('------------------------------------');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
