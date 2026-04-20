import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fix() {
    await prisma.$executeRawUnsafe(`DELETE FROM _prisma_migrations WHERE migration_name = '20260417120300_update_offer_to_flexible_discounts'`);
    console.log("Deleted");
}

fix().finally(() => prisma.$disconnect());
