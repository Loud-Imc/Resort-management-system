-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "defaultCheckInTime" TEXT NOT NULL DEFAULT '14:00',
ADD COLUMN     "defaultCheckOutTime" TEXT NOT NULL DEFAULT '11:00';
