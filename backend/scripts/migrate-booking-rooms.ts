import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateData() {
    console.log("Starting data migration for BookingRoom...");

    try {
        // Fetch all bookings that have a roomId but NO bookingRooms records yet
        const legacyBookings = await prisma.booking.findMany({
            where: {
                roomId: { not: '' },
                bookingRooms: { none: {} }
            },
            select: {
                id: true,
                roomId: true,
                bookingNumber: true
            }
        });

        console.log(`Found ${legacyBookings.length} legacy bookings to migrate.`);

        let successCount = 0;
        let errorCount = 0;

        for (const booking of legacyBookings) {
            try {
                if (booking.roomId) {
                    await prisma.bookingRoom.create({
                        data: {
                            bookingId: booking.id,
                            roomId: booking.roomId
                        }
                    });
                    successCount++;
                }
            } catch (error) {
                console.error(`Failed to migrate booking ${booking.bookingNumber} (${booking.id}):`, error);
                errorCount++;
            }
        }

        console.log(`Migration complete! Successfully migrated: ${successCount}, Failed: ${errorCount}`);
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

migrateData();
