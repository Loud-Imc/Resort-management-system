-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[];
