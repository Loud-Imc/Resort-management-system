-- CreateEnum
CREATE TYPE "CPTransactionStatus" AS ENUM ('PENDING', 'FINALIZED', 'VOID');

-- AlterTable
ALTER TABLE "channel_partners" ADD COLUMN     "accountHolderName" TEXT,
ADD COLUMN     "accountNumber" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "ifscCode" TEXT,
ADD COLUMN     "notificationPrefs" JSONB DEFAULT '{"emailReferrals":true,"emailRewards":true,"pushBookings":true}',
ADD COLUMN     "pendingEarnings" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "pendingPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "referralDiscountRate" DECIMAL(5,2) NOT NULL DEFAULT 10.00,
ADD COLUMN     "upiId" TEXT;

-- AlterTable
ALTER TABLE "cp_transactions" ADD COLUMN     "status" "CPTransactionStatus" NOT NULL DEFAULT 'FINALIZED';
