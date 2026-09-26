-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "AcOption" AS ENUM ('AC_ONLY', 'NON_AC_ONLY', 'BOTH');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable: Add dual AC pricing fields to RoomType
ALTER TABLE "room_types" 
ADD COLUMN IF NOT EXISTS "acOption" "AcOption" NOT NULL DEFAULT 'AC_ONLY',
ADD COLUMN IF NOT EXISTS "basePriceAc" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "extraAdultPriceAc" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "extraChildPriceAc" DECIMAL(10,2);

-- AlterTable: Add propertyId to rate_plans
ALTER TABLE "rate_plans"
ADD COLUMN IF NOT EXISTS "propertyId" TEXT;

-- Populate propertyId from RoomType if roomTypeId exists and propertyId is null
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rate_plans' AND column_name = 'roomTypeId') THEN
        UPDATE "rate_plans" rp
        SET "propertyId" = rt."propertyId"
        FROM "room_types" rt
        WHERE rp."roomTypeId" = rt."id" AND rp."propertyId" IS NULL;
    END IF;
END $$;

-- Drop foreign key on roomTypeId if exists
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rate_plans_roomTypeId_fkey') THEN
        ALTER TABLE "rate_plans" DROP CONSTRAINT "rate_plans_roomTypeId_fkey";
    END IF;
END $$;

-- Make propertyId NOT NULL if it has been populated
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rate_plans' AND column_name = 'propertyId') THEN
        ALTER TABLE "rate_plans" ALTER COLUMN "propertyId" SET NOT NULL;
    END IF;
END $$;

-- Add foreign key to properties on propertyId
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rate_plans_propertyId_fkey') THEN
        ALTER TABLE "rate_plans" ADD CONSTRAINT "rate_plans_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Deactivate legacy room-scoped rate plans before dropping roomTypeId
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rate_plans' AND column_name = 'roomTypeId') THEN
        UPDATE "rate_plans"
        SET "isActive" = false, "isPrimary" = false
        WHERE "roomTypeId" IS NOT NULL;
    END IF;
END $$;

-- Drop acType and roomTypeId from rate_plans if exists
ALTER TABLE "rate_plans" DROP COLUMN IF EXISTS "acType";
ALTER TABLE "rate_plans" DROP COLUMN IF EXISTS "roomTypeId";

-- CreateTable: room_type_rate_plan_prices
CREATE TABLE IF NOT EXISTS "room_type_rate_plan_prices" (
    "id" TEXT NOT NULL,
    "ratePlanId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "extraAdultPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "extraChildPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "basePriceAc" DECIMAL(10,2),
    "extraAdultPriceAc" DECIMAL(10,2),
    "extraChildPriceAc" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_type_rate_plan_prices_pkey" PRIMARY KEY ("id")
);

-- Unique index
CREATE UNIQUE INDEX IF NOT EXISTS "room_type_rate_plan_prices_ratePlanId_roomTypeId_key" ON "room_type_rate_plan_prices"("ratePlanId", "roomTypeId");

-- Foreign keys for room_type_rate_plan_prices
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'room_type_rate_plan_prices_ratePlanId_fkey') THEN
        ALTER TABLE "room_type_rate_plan_prices" ADD CONSTRAINT "room_type_rate_plan_prices_ratePlanId_fkey" FOREIGN KEY ("ratePlanId") REFERENCES "rate_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'room_type_rate_plan_prices_roomTypeId_fkey') THEN
        ALTER TABLE "room_type_rate_plan_prices" ADD CONSTRAINT "room_type_rate_plan_prices_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AlterTable: Add rate plan & AC selection to bookings
ALTER TABLE "bookings"
ADD COLUMN IF NOT EXISTS "ratePlanId" TEXT,
ADD COLUMN IF NOT EXISTS "mealPlan" "MealPlan" NOT NULL DEFAULT 'EP',
ADD COLUMN IF NOT EXISTS "isAcSelected" BOOLEAN NOT NULL DEFAULT true;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_ratePlanId_fkey') THEN
        ALTER TABLE "bookings" ADD CONSTRAINT "bookings_ratePlanId_fkey" FOREIGN KEY ("ratePlanId") REFERENCES "rate_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AlterTable: Add rate plan & AC selection to booking_rooms
ALTER TABLE "booking_rooms"
ADD COLUMN IF NOT EXISTS "ratePlanId" TEXT,
ADD COLUMN IF NOT EXISTS "mealPlan" "MealPlan" DEFAULT 'EP',
ADD COLUMN IF NOT EXISTS "isAcSelected" BOOLEAN NOT NULL DEFAULT true;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_rooms_ratePlanId_fkey') THEN
        ALTER TABLE "booking_rooms" ADD CONSTRAINT "booking_rooms_ratePlanId_fkey" FOREIGN KEY ("ratePlanId") REFERENCES "rate_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
