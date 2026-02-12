/*
  Warnings:

  - Made the column `propertyId` on table `room_types` required. This step will fail if there are existing NULL values in that column.
  - Made the column `propertyId` on table `rooms` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "room_types" DROP CONSTRAINT "room_types_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "rooms" DROP CONSTRAINT "rooms_propertyId_fkey";

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "propertyId" TEXT;

-- AlterTable
ALTER TABLE "income" ADD COLUMN     "propertyId" TEXT;

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "room_types" ADD COLUMN     "cancellationPolicy" TEXT,
ADD COLUMN     "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "inclusions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "propertyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "rooms" ALTER COLUMN "propertyId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income" ADD CONSTRAINT "income_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
