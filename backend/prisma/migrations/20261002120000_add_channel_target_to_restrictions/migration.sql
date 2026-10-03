-- AlterTable restriction_rules
ALTER TABLE "restriction_rules" ADD COLUMN IF NOT EXISTS "channelTarget" TEXT NOT NULL DEFAULT 'ALL';
ALTER TABLE "restriction_rules" ADD COLUMN IF NOT EXISTS "daysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- CreateIndex restriction_rules
CREATE INDEX IF NOT EXISTS "restriction_rules_propertyId_channelTarget_startDate_endDate_idx" ON "restriction_rules"("propertyId", "channelTarget", "startDate", "endDate");
CREATE INDEX IF NOT EXISTS "restriction_rules_roomTypeId_channelTarget_startDate_endDate_idx" ON "restriction_rules"("roomTypeId", "channelTarget", "startDate", "endDate");

-- AlterTable stop_sell_restrictions
ALTER TABLE "stop_sell_restrictions" ADD COLUMN IF NOT EXISTS "channelTarget" TEXT NOT NULL DEFAULT 'ALL';

-- CreateIndex stop_sell_restrictions
CREATE INDEX IF NOT EXISTS "stop_sell_restrictions_propertyId_channelTarget_startDate_endDate_idx" ON "stop_sell_restrictions"("propertyId", "channelTarget", "startDate", "endDate");
CREATE INDEX IF NOT EXISTS "stop_sell_restrictions_roomTypeId_channelTarget_startDate_endDate_idx" ON "stop_sell_restrictions"("roomTypeId", "channelTarget", "startDate", "endDate");
