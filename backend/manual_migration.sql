-- Add billUrl and images columns to the assets table
ALTER TABLE "assets" ADD COLUMN "billUrl" TEXT;
ALTER TABLE "assets" ADD COLUMN "images" TEXT[] DEFAULT ARRAY[]::TEXT[];
