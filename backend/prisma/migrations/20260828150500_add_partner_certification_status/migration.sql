-- CreateEnum IF NOT EXISTS
DO $$ BEGIN
    CREATE TYPE "ConnectivityCertificationStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PASSED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "connectivity_partners" ADD COLUMN IF NOT EXISTS "certificationDetails" JSONB,
ADD COLUMN IF NOT EXISTS "certificationStatus" "ConnectivityCertificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN IF NOT EXISTS "certifiedAt" TIMESTAMP(3);
