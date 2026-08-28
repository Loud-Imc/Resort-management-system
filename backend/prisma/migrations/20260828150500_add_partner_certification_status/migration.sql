-- CreateEnum
CREATE TYPE "ConnectivityCertificationStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PASSED', 'FAILED');

-- AlterTable
ALTER TABLE "connectivity_partners" ADD COLUMN     "certificationDetails" JSONB,
ADD COLUMN     "certificationStatus" "ConnectivityCertificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "certifiedAt" TIMESTAMP(3);
