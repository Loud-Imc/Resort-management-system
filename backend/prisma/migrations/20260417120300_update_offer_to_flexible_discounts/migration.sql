/*
  Warnings:

  - You are about to drop the column `discountPercentage` on the `offers` table. All the data in the column will be lost.
  - Added the required column `discountValue` to the `offers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "offers" DROP COLUMN "discountPercentage",
ADD COLUMN     "discountType" "DiscountType" NOT NULL DEFAULT 'PERCENTAGE',
ADD COLUMN     "discountValue" DECIMAL(10,2) NOT NULL;
