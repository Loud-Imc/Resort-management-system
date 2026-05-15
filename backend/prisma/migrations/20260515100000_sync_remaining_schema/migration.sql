-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('HOMEPAGE_FEATURED', 'SEARCH_SPONSORED');

-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('PENDING_APPROVAL', 'WAITLISTED', 'PAYMENT_PENDING', 'ACTIVE', 'EXPIRED', 'REJECTED');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "preArrivalWelcomeSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "isSponsored" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "promotionEnd" TIMESTAMP(3),
ADD COLUMN     "promotionStart" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "hero_content" (
    "id" TEXT NOT NULL,
    "tagline" TEXT,
    "heading" TEXT NOT NULL,
    "subheading" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hero_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_requests" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "type" "PromotionType" NOT NULL,
    "status" "PromotionStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "paymentId" TEXT,
    "paymentDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotion_requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "promotion_requests" ADD CONSTRAINT "promotion_requests_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
