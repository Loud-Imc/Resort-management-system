
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const checkIn = new Date('2026-03-06T06:53:26.253Z');
  const checkOut = new Date('2026-03-07T06:53:26.253Z');

  console.log('--- Comprehensive Capacity Check ---');
  const allProperties = await prisma.property.findMany({
    include: {
      roomTypes: {
        include: {
          rooms: { where: { isEnabled: true } }
        }
      }
    }
  });

  for (const p of allProperties) {
    console.log(`Property: ${p.name}`);
    console.log(`  Allows Group Booking: ${p.allowsGroupBooking}`);
    console.log(`  Max Group Capacity: ${p.maxGroupCapacity}`);
    console.log(`  Status: ${p.status}`);
    
    let totalPotentialCapacity = 0;
    let enabledGroupCapacity = 0;

    for (const rt of p.roomTypes) {
      // Check overlapping bookings for these rooms
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
      
      const availableRooms = rt.rooms.length - new Set(bookings.map(b => b.roomId)).size;
      const capacityPerRoom = (rt.maxAdults || 0) + (rt.maxChildren || 0);
      const rtCapacity = availableRooms * capacityPerRoom;
      
      totalPotentialCapacity += rtCapacity;
      if (rt.isAvailableForGroupBooking) {
        enabledGroupCapacity += rtCapacity;
      }
      
      console.log(`    Room Type: ${rt.name}`);
      console.log(`      Group Eligible: ${rt.isAvailableForGroupBooking}`);
      console.log(`      Available Rooms: ${availableRooms}`);
      console.log(`      RT Capacity: ${rtCapacity}`);
    }
    
    console.log(`  Total Enabled Group Capacity: ${enabledGroupCapacity}`);
    console.log(`  Total Potential Capacity (if all RTs enabled): ${totalPotentialCapacity}`);
    console.log('------------------------------------');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
