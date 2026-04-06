-- CreateEnum
CREATE TYPE "BannerType" AS ENUM ('HERO', 'PROMO');

-- AlterTable
ALTER TABLE "banners" ADD COLUMN     "type" "BannerType" NOT NULL DEFAULT 'PROMO';
