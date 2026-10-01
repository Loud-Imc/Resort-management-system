-- CreateTable: channel_rate_plan_mappings
CREATE TABLE IF NOT EXISTS "channel_rate_plan_mappings" (
    "id" TEXT NOT NULL,
    "propertyMappingId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "ratePlanId" TEXT NOT NULL,
    "acType" "AcType" NOT NULL DEFAULT 'DEFAULT',
    "externalRatePlanId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_rate_plan_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "channel_rate_plan_mappings_propertyMappingId_roomTypeId_ratePlanId_acType_key" ON "channel_rate_plan_mappings"("propertyMappingId", "roomTypeId", "ratePlanId", "acType");

-- AddForeignKey: propertyMappingId -> channel_property_mappings
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'channel_rate_plan_mappings_propertyMappingId_fkey') THEN
        ALTER TABLE "channel_rate_plan_mappings" ADD CONSTRAINT "channel_rate_plan_mappings_propertyMappingId_fkey" FOREIGN KEY ("propertyMappingId") REFERENCES "channel_property_mappings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: roomTypeId -> room_types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'channel_rate_plan_mappings_roomTypeId_fkey') THEN
        ALTER TABLE "channel_rate_plan_mappings" ADD CONSTRAINT "channel_rate_plan_mappings_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: ratePlanId -> rate_plans
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'channel_rate_plan_mappings_ratePlanId_fkey') THEN
        ALTER TABLE "channel_rate_plan_mappings" ADD CONSTRAINT "channel_rate_plan_mappings_ratePlanId_fkey" FOREIGN KEY ("ratePlanId") REFERENCES "rate_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
