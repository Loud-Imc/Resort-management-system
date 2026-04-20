/*
  Warnings:

  - You are about to drop the column `roomTypeId` on the `offers` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "offers" DROP CONSTRAINT "offers_roomTypeId_fkey";

-- AlterTable
ALTER TABLE "offers" DROP COLUMN "roomTypeId";

-- CreateTable
CREATE TABLE "_OfferToRoomType" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OfferToRoomType_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_OfferToRoomType_B_index" ON "_OfferToRoomType"("B");

-- AddForeignKey
ALTER TABLE "_OfferToRoomType" ADD CONSTRAINT "_OfferToRoomType_A_fkey" FOREIGN KEY ("A") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OfferToRoomType" ADD CONSTRAINT "_OfferToRoomType_B_fkey" FOREIGN KEY ("B") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
