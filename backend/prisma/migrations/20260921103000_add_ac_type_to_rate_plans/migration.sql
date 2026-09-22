-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "AcType" AS ENUM ('AC', 'NON_AC', 'DEFAULT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "rate_plans" ADD COLUMN IF NOT EXISTS "acType" "AcType" NOT NULL DEFAULT 'DEFAULT';
