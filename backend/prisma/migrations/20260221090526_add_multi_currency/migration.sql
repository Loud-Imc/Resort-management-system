-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CPTransactionType" ADD VALUE 'WALLET_TOPUP';
ALTER TYPE "CPTransactionType" ADD VALUE 'WALLET_PAYMENT';

-- AlterTable
ALTER TABLE "booking_guests" ADD COLUMN     "idImage" TEXT;

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "amountInBookingCurrency" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "bookingCurrency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN     "exchangeRate" DECIMAL(10,4) NOT NULL DEFAULT 1.0;

-- AlterTable
ALTER TABLE "channel_partners" ADD COLUMN     "walletBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
ALTER COLUMN "commissionRate" SET DEFAULT 10.00,
ALTER COLUMN "referralDiscountRate" SET DEFAULT 5.00;

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "baseCurrency" TEXT NOT NULL DEFAULT 'INR';

-- CreateTable
CREATE TABLE "currencies" (
    "code" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "rateToINR" DECIMAL(10,4) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("code")
);
