/*
  Warnings:

  - You are about to drop the column `discountPercentage` on the `offers` table. All the data in the column will be lost.
  - Added the required column `discountValue` to the `offers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "offers" ADD COLUMN "discountType" "DiscountType" NOT NULL DEFAULT 'PERCENTAGE';
ALTER TABLE "offers" ADD COLUMN "discountValue" DECIMAL(10,2);

-- Migrate data
UPDATE "offers" SET "discountValue" = "discountPercentage";

-- Handle potential nulls
UPDATE "offers" SET "discountValue" = 0 WHERE "discountValue" IS NULL;

-- Make NOT NULL
ALTER TABLE "offers" ALTER COLUMN "discountValue" SET NOT NULL;

-- Drop old column
ALTER TABLE "offers" DROP COLUMN "discountPercentage";
