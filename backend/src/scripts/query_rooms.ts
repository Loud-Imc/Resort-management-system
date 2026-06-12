import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    console.log("=== Checking Rooms and Bookings ===");
    
    // Find the property (the Udaipur homestay or active one)
    const property = await prisma.property.findFirst({
        where: { name: { contains: 'Serene Lake', mode: 'insensitive' } }
    });
    if (!property) {
        console.error("Property not found");
        return;
    }
    console.log(`Property: ${property.name} (${property.id})`);

    // Find group pool room types
    const roomTypes = await prisma.roomType.findMany({
        where: { propertyId: property.id, isAvailableForGroupBooking: true }
    });
    console.log(`Group Pool Room Types: ${roomTypes.map(rt => `${rt.name} (${rt.id})`).join(', ')}`);
    const roomTypeIds = roomTypes.map(rt => rt.id);

    // Get all rooms of these types
    const rooms = await prisma.room.findMany({
        where: { roomTypeId: { in: roomTypeIds } }
    });
    console.log(`Total rooms of these types: ${rooms.length}`);
    rooms.forEach(r => {
        console.log(`Room: ${r.roomNumber}, ID: ${r.id}, Enabled: ${r.isEnabled}, Status: ${r.status}`);
    });

    const checkIn = new Date('2026-06-13T00:00:00.000Z');
    const checkOut = new Date('2026-06-14T00:00:00.000Z');

    // Find overlapping bookings on these dates
    const overlappingBookings = await prisma.booking.findMany({
        where: {
            room: { roomTypeId: { in: roomTypeIds } },
            status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
            AND: [
                { checkInDate: { lt: checkOut } },
                { checkOutDate: { gt: checkIn } }
            ]
        },
        include: { room: true }
    });

    console.log(`Overlapping Bookings: ${overlappingBookings.length}`);
    overlappingBookings.forEach(b => {
        console.log(`Booking: ${b.bookingNumber}, Room: ${b.room?.roomNumber}, CheckIn: ${b.checkInDate.toISOString()}, CheckOut: ${b.checkOutDate.toISOString()}, Status: ${b.status}`);
    });

    // Find overlapping room blocks
    const overlappingBlocks = await prisma.roomBlock.findMany({
        where: {
            room: { roomTypeId: { in: roomTypeIds } },
            AND: [
                { startDate: { lt: checkOut } },
                { endDate: { gt: checkIn } }
            ]
        },
        include: { room: true }
    });

    console.log(`Overlapping Room Blocks: ${overlappingBlocks.length}`);
    overlappingBlocks.forEach(b => {
        console.log(`Block ID: ${b.id}, Reason: ${b.reason}, Room: ${b.room?.roomNumber}, StartDate: ${b.startDate.toISOString()}, EndDate: ${b.endDate.toISOString()}, BookingID: ${b.bookingId}`);
    });
}

run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
