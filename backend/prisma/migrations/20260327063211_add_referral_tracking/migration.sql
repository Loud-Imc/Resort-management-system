-- AlterTable
ALTER TABLE "property_requests" ADD COLUMN     "referredById" TEXT,
ALTER COLUMN "rejectedAt" SET DATA TYPE TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "property_requests" ADD CONSTRAINT "property_requests_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
