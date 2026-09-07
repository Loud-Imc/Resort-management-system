-- AlterTable: Add documentDetails JSON column to properties table
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "documentDetails" JSONB;
