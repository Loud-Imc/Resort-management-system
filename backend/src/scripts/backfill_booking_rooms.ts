import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function backfillBookingRooms() {
    console.log(`\n===========================================`);
    console.log(`🚀 RUNNING BOOKING-ROOM HISTORICAL BACKFILL`);
    console.log(`===========================================\n`);

    // 1. Verify Prisma Client has the model (npx prisma generate was run)
    if (!(prisma as any).bookingRoom) {
        console.error("❌ ERROR: The 'bookingRoom' model is not present in the Prisma Client.");
        console.error("👉 You MUST run 'npx prisma generate' before running this script.");
        process.exit(1);
    }

    // 2. Fetch all bookings with their room blocks
    console.log("📥 Fetching all historical bookings...");
    const allBookings = await prisma.booking.findMany({
        select: {
            id: true,
            roomId: true,
            roomBlocks: { select: { roomId: true } }
        }
    });

    console.log(`📊 Found ${allBookings.length} total bookings.`);

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // 3. Process each booking
    console.log("⚙️  Processing backfill...\n");
    for (const booking of allBookings) {
        const targetRoomIds = new Set<string>();
        
        // Add primary room
        if (booking.roomId) {
            targetRoomIds.add(booking.roomId);
        }

        // Add secondary rooms from roomBlocks
        for (const block of booking.roomBlocks) {
            targetRoomIds.add(block.roomId);
        }

        for (const targetRoomId of Array.from(targetRoomIds)) {
            try {
                // Check if the link already exists (Idempotent check)
                const existing = await (prisma as any).bookingRoom.findUnique({
                    where: {
                        bookingId_roomId: {
                            bookingId: booking.id,
                            roomId: targetRoomId
                        }
                    }
                });

                if (!existing) {
                    await (prisma as any).bookingRoom.create({
                        data: {
                            id: randomUUID(),
                            bookingId: booking.id,
                            roomId: targetRoomId
                        }
                    });
                    createdCount++;
                } else {
                    skippedCount++;
                }
            } catch (err: any) {
                console.error(`❌ Failed to link booking ${booking.id} with room ${targetRoomId}:`, err.message);
                errorCount++;
            }
        }
    }

    // 4. Verify checksum
    console.log(`\n===========================================`);
    console.log(`✅ BACKFILL COMPLETE`);
    console.log(`===========================================`);
    console.log(`- New BookingRoom Links Created: ${createdCount}`);
    console.log(`- Links Already Existed (Skipped): ${skippedCount}`);
    console.log(`- Errors Encountered: ${errorCount}`);
    
    const totalBookingRooms = await (prisma as any).bookingRoom.count();
    console.log(`\n🧮 FINAL DATABASE COUNT: ${totalBookingRooms} total BookingRoom records.`);
    console.log(`===========================================\n`);

    if (errorCount > 0) {
        process.exit(1);
    }
}

backfillBookingRooms()
    .catch((e) => {
        console.error("❌ FATAL ERROR RUNNING BACKFILL:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
