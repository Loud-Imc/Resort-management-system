-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "MealPlan" AS ENUM ('EP', 'CP', 'MAP', 'AP');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "RatePlanPricingType" AS ENUM ('ABSOLUTE', 'DERIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterEnum
ALTER TYPE "PricingAdjustmentType" ADD VALUE IF NOT EXISTS 'SET_FIXED_PRICE';

-- AlterTable: Add new fields to pricing_rules
ALTER TABLE "pricing_rules" 
ADD COLUMN IF NOT EXISTS "daysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN IF NOT EXISTS "ratePlanId" TEXT,
ADD COLUMN IF NOT EXISTS "isFestivalRule" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "festivalName" TEXT;

-- AlterTable: Add ratePlanId to channel_room_type_mappings
ALTER TABLE "channel_room_type_mappings" 
ADD COLUMN IF NOT EXISTS "ratePlanId" TEXT;

-- AlterTable: Add ratePlanId to connectivity_room_type_mappings
ALTER TABLE "connectivity_room_type_mappings" 
ADD COLUMN IF NOT EXISTS "ratePlanId" TEXT;

-- CreateTable: rate_plans
CREATE TABLE IF NOT EXISTS "rate_plans" (
    "id" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "mealPlan" "MealPlan" NOT NULL DEFAULT 'EP',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "pricingType" "RatePlanPricingType" NOT NULL DEFAULT 'ABSOLUTE',
    "derivedFromId" TEXT,
    "derivedAmount" DECIMAL(10,2),
    "derivedPercentage" DECIMAL(5,2),
    "basePrice" DECIMAL(10,2) NOT NULL,
    "extraAdultPrice" DECIMAL(10,2) NOT NULL,
    "extraChildPrice" DECIMAL(10,2) NOT NULL,
    "cancellationPolicyId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable: calendar_event_markers
CREATE TABLE IF NOT EXISTS "calendar_event_markers" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "colorTag" TEXT NOT NULL DEFAULT '#EF4444',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_event_markers_pkey" PRIMARY KEY ("id")
);

-- Foreign Keys
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pricing_rules_ratePlanId_fkey') THEN
        ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_ratePlanId_fkey" FOREIGN KEY ("ratePlanId") REFERENCES "rate_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rate_plans_roomTypeId_fkey') THEN
        ALTER TABLE "rate_plans" ADD CONSTRAINT "rate_plans_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rate_plans_derivedFromId_fkey') THEN
        ALTER TABLE "rate_plans" ADD CONSTRAINT "rate_plans_derivedFromId_fkey" FOREIGN KEY ("derivedFromId") REFERENCES "rate_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calendar_event_markers_propertyId_fkey') THEN
        ALTER TABLE "calendar_event_markers" ADD CONSTRAINT "calendar_event_markers_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'channel_room_type_mappings_ratePlanId_fkey') THEN
        ALTER TABLE "channel_room_type_mappings" ADD CONSTRAINT "channel_room_type_mappings_ratePlanId_fkey" FOREIGN KEY ("ratePlanId") REFERENCES "rate_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'connectivity_room_type_mappings_ratePlanId_fkey') THEN
        ALTER TABLE "connectivity_room_type_mappings" ADD CONSTRAINT "connectivity_room_type_mappings_ratePlanId_fkey" FOREIGN KEY ("ratePlanId") REFERENCES "rate_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;
