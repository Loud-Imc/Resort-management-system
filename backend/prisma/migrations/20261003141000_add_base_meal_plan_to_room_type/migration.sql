-- AlterTable room_types
ALTER TABLE "room_types" ADD COLUMN IF NOT EXISTS "baseMealPlan" "MealPlan" NOT NULL DEFAULT 'EP';
ALTER TABLE "room_types" ADD COLUMN IF NOT EXISTS "baseRatePlanId" TEXT;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'room_types_baseRatePlanId_fkey'
  ) THEN
    ALTER TABLE "room_types" ADD CONSTRAINT "room_types_baseRatePlanId_fkey" FOREIGN KEY ("baseRatePlanId") REFERENCES "rate_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
