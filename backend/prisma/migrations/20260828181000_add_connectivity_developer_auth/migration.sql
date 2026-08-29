-- AlterTable
ALTER TABLE "connectivity_partners" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT,
ADD COLUMN IF NOT EXISTS "webhookSecret" TEXT;
