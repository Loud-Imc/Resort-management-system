-- Add rejection fields to property_requests table
ALTER TABLE "property_requests"
  ADD COLUMN IF NOT EXISTS "reason" TEXT,
  ADD COLUMN IF NOT EXISTS "rejectedById" TEXT,
  ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP;

-- Add foreign key constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'property_requests_rejectedById_fkey'
  ) THEN
    ALTER TABLE "property_requests"
      ADD CONSTRAINT "property_requests_rejectedById_fkey"
      FOREIGN KEY ("rejectedById") REFERENCES "users"("id")
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END$$;
