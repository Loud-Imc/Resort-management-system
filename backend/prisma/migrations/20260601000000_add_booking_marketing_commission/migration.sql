-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "marketingCommission" DECIMAL(10,2) DEFAULT 0;
ALTER TABLE "bookings" ADD COLUMN "marketingPayoutStatus" "PayoutStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "bookings" ADD COLUMN "marketingStaffId" TEXT;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_marketingStaffId_fkey" FOREIGN KEY ("marketingStaffId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
