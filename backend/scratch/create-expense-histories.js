const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Connecting via Prisma...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "expense_histories" (
        "id"          TEXT            NOT NULL,
        "expenseId"   TEXT            NOT NULL,
        "action"      TEXT            NOT NULL,
        "amount"      DECIMAL(10,2)   NOT NULL,
        "description" TEXT            NOT NULL,
        "categoryId"  TEXT            NOT NULL,
        "propertyId"  TEXT,
        "reason"      TEXT            NOT NULL,
        "changedBy"   TEXT,
        "changedAt"   TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "expense_histories_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ Table "expense_histories" created successfully!');
  } catch (err) {
    console.error('❌ Failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
