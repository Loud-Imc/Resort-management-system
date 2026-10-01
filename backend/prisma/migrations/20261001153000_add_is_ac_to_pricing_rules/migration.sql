-- AlterTable
ALTER TABLE "pricing_rules" ADD COLUMN IF NOT EXISTS "isAc" BOOLEAN;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pricing_rules_roomTypeId_channelTarget_isAc_startDate_endDate_idx" 
ON "pricing_rules"("roomTypeId", "channelTarget", "isAc", "startDate", "endDate");
