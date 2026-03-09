-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "groupPriceAdult" DECIMAL(10,2),
ADD COLUMN     "groupPriceChild" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "room_types" ADD COLUMN     "groupMaxOccupancy" INTEGER;
