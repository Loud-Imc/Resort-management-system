import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const bookingNumber = 'CM-CHA-1785496854180';
  console.log(`Inspecting local PMS Booking details for: ${bookingNumber}`);

  const booking = await prisma.booking.findFirst({
    where: { bookingNumber },
    include: {
      user: true, // The Guest user account
      room: true
    }
  });

  if (!booking) {
    console.log(`No booking found with number: ${bookingNumber}`);
    return;
  }

  console.log('\nBooking Record:');
  console.log(JSON.stringify({
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    checkInDate: booking.checkInDate,
    checkOutDate: booking.checkOutDate,
    totalAmount: booking.totalAmount,
    status: booking.status,
    userId: booking.userId,
    roomId: booking.roomId,
    roomNumber: booking.room?.roomNumber
  }, null, 2));

  console.log('\nGuest (User) Record:');
  console.log(JSON.stringify(booking.user, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
