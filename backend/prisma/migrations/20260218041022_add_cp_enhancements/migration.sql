/*
  Warnings:

  - You are about to drop the column `isActive` on the `channel_partners` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('INDIVIDUAL', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "ChannelPartnerStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- AlterTable
ALTER TABLE "channel_partners" DROP COLUMN "isActive",
ADD COLUMN     "authorizedPersonName" TEXT,
ADD COLUMN     "businessAddress" TEXT,
ADD COLUMN     "isRateOverridden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "organizationName" TEXT,
ADD COLUMN     "partnerType" "PartnerType" NOT NULL DEFAULT 'INDIVIDUAL',
ADD COLUMN     "status" "ChannelPartnerStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "taxId" TEXT;

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "status" "PropertyStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "partner_levels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minPoints" INTEGER NOT NULL,
    "commissionRate" DECIMAL(5,2) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rewards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pointCost" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cp_reward_redemptions" (
    "id" TEXT NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "channelPartnerId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cp_reward_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partner_levels_name_key" ON "partner_levels"("name");

-- CreateIndex
CREATE UNIQUE INDEX "partner_levels_minPoints_key" ON "partner_levels"("minPoints");

-- AddForeignKey
ALTER TABLE "cp_reward_redemptions" ADD CONSTRAINT "cp_reward_redemptions_channelPartnerId_fkey" FOREIGN KEY ("channelPartnerId") REFERENCES "channel_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cp_reward_redemptions" ADD CONSTRAINT "cp_reward_redemptions_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "rewards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
