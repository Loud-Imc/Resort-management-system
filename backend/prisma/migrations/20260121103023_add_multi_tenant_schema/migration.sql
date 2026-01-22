/*
  Warnings:

  - A unique constraint covering the columns `[propertyId,name]` on the table `room_types` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[propertyId,roomNumber]` on the table `rooms` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('RESORT', 'HOMESTAY', 'HOTEL', 'VILLA', 'OTHER');

-- CreateEnum
CREATE TYPE "CPTransactionType" AS ENUM ('COMMISSION', 'POINTS_EARNED', 'POINTS_REDEEMED', 'PAYOUT');

-- DropIndex
DROP INDEX "room_types_name_key";

-- DropIndex
DROP INDEX "rooms_roomNumber_key";

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "channelPartnerId" TEXT,
ADD COLUMN     "cpCommission" DECIMAL(10,2),
ADD COLUMN     "cpDiscount" DECIMAL(10,2),
ADD COLUMN     "propertyId" TEXT;

-- AlterTable
ALTER TABLE "room_types" ADD COLUMN     "propertyId" TEXT;

-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "propertyId" TEXT;

-- CreateTable
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "PropertyType" NOT NULL,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "pincode" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "images" TEXT[],
    "coverImage" TEXT,
    "amenities" TEXT[],
    "policies" JSONB,
    "rating" DECIMAL(2,1),
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_staff" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_partners" (
    "id" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "availablePoints" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidOut" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cp_transactions" (
    "id" TEXT NOT NULL,
    "type" "CPTransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "channelPartnerId" TEXT NOT NULL,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cp_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "properties_slug_key" ON "properties"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "property_staff_propertyId_userId_key" ON "property_staff"("propertyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "channel_partners_referralCode_key" ON "channel_partners"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "channel_partners_userId_key" ON "channel_partners"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "room_types_propertyId_name_key" ON "room_types"("propertyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_propertyId_roomNumber_key" ON "rooms"("propertyId", "roomNumber");

-- AddForeignKey
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_channelPartnerId_fkey" FOREIGN KEY ("channelPartnerId") REFERENCES "channel_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_staff" ADD CONSTRAINT "property_staff_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_staff" ADD CONSTRAINT "property_staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_partners" ADD CONSTRAINT "channel_partners_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cp_transactions" ADD CONSTRAINT "cp_transactions_channelPartnerId_fkey" FOREIGN KEY ("channelPartnerId") REFERENCES "channel_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
