const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfill() {
    try {
        console.log('Running GST applicability backfill on existing properties...');
        const result = await prisma.$executeRawUnsafe(`
            UPDATE properties 
            SET "isGstApplicable" = true 
            WHERE "gstNumber" IS NOT NULL AND TRIM("gstNumber") != '';
        `);
        console.log(`Successfully updated ${result} properties.`);
    } catch (err) {
        console.error('Error during backfill:', err);
    } finally {
        await prisma.$disconnect();
    }
}

backfill();
