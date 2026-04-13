-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "isHistoricalEntry" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "transactionDate" TIMESTAMP(3);
