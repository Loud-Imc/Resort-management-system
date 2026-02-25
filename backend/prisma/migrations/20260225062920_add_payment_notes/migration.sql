-- AlterEnum
ALTER TYPE "IncomeSource" ADD VALUE 'MANUAL_PAYMENT';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "notes" TEXT;
