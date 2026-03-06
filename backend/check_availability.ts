
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const checkIn = new Date('2026-03-06T06:53:26.253Z');
  const checkOut = new Date('2026-03-07T06:53:26.253Z');

  console.log('--- Room Availability Check ---');
  const roomTypes = await prisma.roomType.findMany({
    where: { 
      isAvailableForGroupBooking: true,
      property: { allowsGroupBooking: true }
    },
    include: {
      property: true,
      rooms: {
        where: { isEnabled: true }
      }
    }
  });

  for (const rt of roomTypes) {
    console.log(`Property: ${rt.property.name}`);
    console.log(`Room Type: ${rt.name}`);
    console.log(`  Total Physical Rooms: ${rt.rooms.length}`);
    console.log(`  Max Capacity per Room: ${rt.maxAdults + rt.maxChildren}`);
    
    // Check overlapping bookings
    const bookings = await prisma.booking.findMany({
      where: {
        roomId: { in: rt.rooms.map(r => r.id) },
        status: { in: ['CONFIRMED', 'RESERVED', 'CHECKED_IN'] },
        OR: [
            { AND: [{ checkInDate: { lte: checkIn } }, { checkOutDate: { gt: checkIn } }] },
            { AND: [{ checkInDate: { lt: checkOut } }, { checkOutDate: { gte: checkOut } }] }
        ]
      }
    });
    
    const availableCount = rt.rooms.length - new Set(bookings.map(b => b.roomId)).size;
    console.log(`  Available Rooms on ${checkIn.toISOString().split('T')[0]}: ${availableCount}`);
    console.log(`  Total Pool Capacity: ${availableCount * (rt.maxAdults + rt.maxChildren)}`);
    console.log('------------------------------------');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
