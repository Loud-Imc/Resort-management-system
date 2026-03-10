-- AlterTable
ALTER TABLE "property_icals" ADD COLUMN     "roomTypeId" TEXT;

-- AddForeignKey
ALTER TABLE "property_icals" ADD CONSTRAINT "property_icals_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
