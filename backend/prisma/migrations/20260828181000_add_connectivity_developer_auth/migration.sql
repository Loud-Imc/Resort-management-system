-- AlterTable
ALTER TABLE "connectivity_partners" ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "webhookSecret" TEXT;
