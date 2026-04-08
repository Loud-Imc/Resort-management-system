import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanProdDb() {
    const isDryRun = !process.argv.includes('--execute');
    console.log(`\n===========================================`);
    console.log(`🚀 RUNNING DATA CLEANUP IN ${isDryRun ? 'DRY-RUN' : 'EXECUTE'} MODE`);
    console.log(`===========================================\n`);

    if (isDryRun) {
        console.log("⚠️ This is a DRY RUN. No rows will actually be deleted.");
        console.log("👉 To actually execute deletions, run with the --execute flag.\n");
    }

    // 1. Identify the WAYANAD property
    const wayanadProperty = await prisma.property.findFirst({
        where: { name: { contains: 'WAYANAD', mode: 'insensitive' } }
    });

    if (!wayanadProperty) {
        console.error("❌ ERROR: Could not find 'WAYANAD VISTA PALM VIEW VILLA' or similar property!");
        console.error("Terminating immediately for safety.");
        process.exit(1);
    }
    const KEEP_PROPERTY_ID = wayanadProperty.id;

    console.log(`✅ FOUND SAFE PROPERTY: ${wayanadProperty.name}`);
    console.log(`   (ID: ${KEEP_PROPERTY_ID})\n`);

    // 2. Identify properties to delete
    const otherProperties = await prisma.property.findMany({
        where: { id: { not: KEEP_PROPERTY_ID } },
        select: { id: true, name: true }
    });

    const deletePropertyIds = otherProperties.map(p => p.id);

    console.log(`🗑️ Mapped ${deletePropertyIds.length} properties for deletion:`);
    otherProperties.forEach(p => console.log(`   - ${p.name}`));
    console.log();

    if (deletePropertyIds.length === 0) {
        console.log("🎉 No waste properties found! The database is already clean.");
        process.exit(0);
    }

    // 3. Identify Bookings to delete implicitly tied to these properties
    const bookingsToDelete = await prisma.booking.findMany({
        where: { room: { propertyId: { not: KEEP_PROPERTY_ID } } },
        select: { id: true }
    });
    const deleteBookingIds = bookingsToDelete.map(b => b.id);
    console.log(`🗑️ Mapped ${deleteBookingIds.length} bookings for deletion.`);

    // 4. Identify EventBookings to delete
    const eventBookingsToDelete = await prisma.eventBooking.findMany({
        where: { event: { propertyId: { not: KEEP_PROPERTY_ID } } },
        select: { id: true }
    });
    const deleteEventBookingIds = eventBookingsToDelete.map(b => b.id);

    if (isDryRun) {
        return; // End early if dry run, since metrics are printed
    }

    // --- DELETION CASCADE START --- //
    // Disconnect default policies avoiding Circular FK Errors
    await prisma.property.updateMany({
        where: { id: { in: deletePropertyIds } },
        data: { defaultCancellationPolicyId: null }
    });

    if (deleteBookingIds.length > 0) {
        process.stdout.write("Deleting Booking linked children (Incomes, Payments, Reviews, Logs)... ");
        await prisma.income.deleteMany({ where: { bookingId: { in: deleteBookingIds } } });
        await prisma.payment.deleteMany({ where: { bookingId: { in: deleteBookingIds } } });
        await prisma.review.deleteMany({ where: { bookingId: { in: deleteBookingIds } } });
        await prisma.auditLog.deleteMany({ where: { bookingId: { in: deleteBookingIds } } });
        await prisma.cPTransaction.deleteMany({ where: { bookingId: { in: deleteBookingIds } } });
        await prisma.bookingGuest.deleteMany({ where: { bookingId: { in: deleteBookingIds } } });
        await prisma.roomBlock.deleteMany({ where: { bookingId: { in: deleteBookingIds } } });
        await prisma.propertySettlement.deleteMany({ where: { bookingId: { in: deleteBookingIds } } });
        
        // ManualPaymentRequests? If any exist
        try {
            // @ts-ignore
            if (prisma.manualPaymentRequest) {
                // @ts-ignore
                await prisma.manualPaymentRequest.deleteMany({ where: { bookingId: { in: deleteBookingIds } } });
            }
        } catch (e) {}

        console.log("Done.");

        process.stdout.write(`Deleting ${deleteBookingIds.length} Bookings... `);
        await prisma.booking.deleteMany({ where: { id: { in: deleteBookingIds } } });
        console.log("Done.");
    }

    process.stdout.write("Deleting Event Bookings and their Payments/Incomes... ");
    if (deleteEventBookingIds.length > 0) {
        await prisma.income.deleteMany({ where: { eventBookingId: { in: deleteEventBookingIds } } });
        await prisma.payment.deleteMany({ where: { eventBookingId: { in: deleteEventBookingIds } } });
        await prisma.eventBooking.deleteMany({ where: { id: { in: deleteEventBookingIds } } });
    }
    console.log("Done.");

    process.stdout.write("Deleting Rooms, RoomTypes, Features... ");
    await prisma.offer.deleteMany({ where: { roomType: { propertyId: { in: deletePropertyIds } } } });
    await prisma.pricingRule.deleteMany({ where: { roomType: { propertyId: { in: deletePropertyIds } } } });
    await prisma.roomBlock.deleteMany({ where: { room: { propertyId: { in: deletePropertyIds } } } });
    await prisma.room.deleteMany({ where: { propertyId: { in: deletePropertyIds } } });
    await prisma.roomType.deleteMany({ where: { propertyId: { in: deletePropertyIds } } });
    console.log("Done.");

    process.stdout.write("Deleting remaining isolated property data (Expenses, Staff, Calendar, etc)... ");
    await prisma.expense.deleteMany({ where: { propertyId: { in: deletePropertyIds } } });
    await prisma.expenseCategory.deleteMany({ where: { propertyId: { in: deletePropertyIds } } });
    
    // @ts-ignore
    if (prisma.propertyRequest) {
        // @ts-ignore
        await prisma.propertyRequest.deleteMany({ where: { propertyId: { in: deletePropertyIds } } });
    }
    
    await prisma.propertyStaff.deleteMany({ where: { propertyId: { in: deletePropertyIds } } });
    await prisma.role.deleteMany({ where: { propertyId: { in: deletePropertyIds } } });
    await prisma.propertyIcal.deleteMany({ where: { propertyId: { in: deletePropertyIds } } });
    await prisma.cancellationPolicy.deleteMany({ where: { propertyId: { in: deletePropertyIds } } });
    await prisma.event.deleteMany({ where: { propertyId: { in: deletePropertyIds } } });
    console.log("Done.");

    process.stdout.write(`Deleting ${deletePropertyIds.length} Properties... `);
    await prisma.property.deleteMany({ where: { id: { in: deletePropertyIds } } });
    console.log("Done.");

    console.log(`\n🧹 Starting Phase 2: Channel Partners, Users & Roles Cleanup...`);

    process.stdout.write("Deleting all Channel Partner data... ");
    await prisma.cPRedemptionRequest.deleteMany();
    await prisma.cPRewardRedemption.deleteMany();
    await prisma.cPTransaction.deleteMany();
    await prisma.channelPartner.deleteMany();
    console.log("Done.");

    process.stdout.write("Deleting non-system test roles... ");
    await prisma.rolePermission.deleteMany({ where: { role: { isSystem: false, staff: { none: {} } } } });
    await prisma.userRole.deleteMany({ where: { role: { isSystem: false, staff: { none: {} } } } });
    await prisma.role.deleteMany({ where: { isSystem: false, staff: { none: {} } } });
    console.log("Done.");

    // Identify users to KEEP (Superadmin + Wayanad tied users)
    const superAdmins = await prisma.user.findMany({
        where: { roles: { some: { role: { name: 'SuperAdmin' } } } },
        select: { id: true }
    });
    
    const wayanadUsers = await prisma.user.findMany({
        where: {
            OR: [
                { ownedProperties: { some: { id: KEEP_PROPERTY_ID } } },
                { propertyStaff: { some: { propertyId: KEEP_PROPERTY_ID } } }
            ]
        },
        select: { id: true }
    });

    const keepUserIds = Array.from(new Set([...superAdmins.map(u => u.id), ...wayanadUsers.map(u => u.id)]));

    const usersToDelete = await prisma.user.findMany({
        where: { id: { notIn: keepUserIds } },
        select: { id: true }
    });
    const userIdsToDelete = usersToDelete.map(u => u.id);

    if (userIdsToDelete.length > 0) {
        process.stdout.write(`Deleting ${userIdsToDelete.length} redundant platform users... `);
        await prisma.auditLog.deleteMany({ where: { userId: { in: userIdsToDelete } } });
        await prisma.notification.deleteMany({ where: { userId: { in: userIdsToDelete } } });
        await prisma.userRole.deleteMany({ where: { userId: { in: userIdsToDelete } } });

        // Financials associated with users (if generated during testing)
        try {
            // @ts-ignore
            if (prisma.refundRequest) await prisma.refundRequest.deleteMany({ where: { OR: [{ requestedById: { in: userIdsToDelete } }, { approvedById: { in: userIdsToDelete } }] } });
            // @ts-ignore
            if (prisma.financialAdjustmentRequest) await prisma.financialAdjustmentRequest.deleteMany({ where: { OR: [{ requestedById: { in: userIdsToDelete } }, { approvedById: { in: userIdsToDelete } }] } });
            // @ts-ignore
            if (prisma.paymentReconciliation) await prisma.paymentReconciliation.deleteMany({ where: { OR: [{ makerId: { in: userIdsToDelete } }, { checkerId: { in: userIdsToDelete } }] } });
        } catch (e) {}

        await prisma.user.deleteMany({ where: { id: { in: userIdsToDelete } } });
        console.log("Done.");
    } else {
         console.log("No extra users found to delete.");
    }

    console.log(`\n🎉 DATABASE CLEANUP SUCCESSFUL! All waste properties, CPs, and test users deleted.`);
}

cleanProdDb()
    .catch((e) => {
        console.error("❌ ERROR RUNNING CLEANUP:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
