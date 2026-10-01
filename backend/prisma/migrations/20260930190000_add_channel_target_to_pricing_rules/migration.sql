-- AlterTable
ALTER TABLE "pricing_rules" ADD COLUMN "channelTarget" TEXT NOT NULL DEFAULT 'OREEDU_PMS';

-- CreateIndex
CREATE INDEX "pricing_rules_roomTypeId_channelTarget_startDate_endDate_idx" ON "pricing_rules"("roomTypeId", "channelTarget", "startDate", "endDate");
