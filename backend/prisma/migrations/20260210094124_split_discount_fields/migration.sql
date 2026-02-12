/*
  Warnings:

  - You are about to drop the column `discountAmount` on the `bookings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "discountAmount",
ADD COLUMN     "couponDiscountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "offerDiscountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
