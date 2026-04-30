-- AlterTable
ALTER TABLE "partner_levels" ADD COLUMN     "pointsPerUnit" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "unitAmount" INTEGER NOT NULL DEFAULT 100;
