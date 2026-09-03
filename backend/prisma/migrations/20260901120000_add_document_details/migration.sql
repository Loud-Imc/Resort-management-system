-- AlterTable: Add documentDetails JSON column to Property table
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "documentDetails" JSONB;
