-- AlterTable: Update defaultCommission precision on offline_channel_partners
ALTER TABLE "offline_channel_partners" ALTER COLUMN "defaultCommission" TYPE DECIMAL(10, 2);
