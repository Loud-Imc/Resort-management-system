-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "addedById" TEXT,
ADD COLUMN     "commissionStatus" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "marketingCommission" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
