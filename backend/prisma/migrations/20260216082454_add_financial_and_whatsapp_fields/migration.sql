-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "netAmount" DECIMAL(10,2),
ADD COLUMN     "payoutStatus" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "platformFee" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "platformCommission" DECIMAL(5,2) NOT NULL DEFAULT 10.00,
ADD COLUMN     "whatsappNumber" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "whatsappNumber" TEXT;
