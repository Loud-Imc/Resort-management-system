-- Add missing values to ConnectivityEventStatus enum in PostgreSQL
ALTER TYPE "ConnectivityEventStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "ConnectivityEventStatus" ADD VALUE IF NOT EXISTS 'RETRYING';
ALTER TYPE "ConnectivityEventStatus" ADD VALUE IF NOT EXISTS 'FAILED_PERMANENT';
ALTER TYPE "ConnectivityEventStatus" ADD VALUE IF NOT EXISTS 'FAILED_DEAD_LETTER';

-- Add missing values to ConnectivityPartnerType enum in PostgreSQL
ALTER TYPE "ConnectivityPartnerType" ADD VALUE IF NOT EXISTS 'OTA';
ALTER TYPE "ConnectivityPartnerType" ADD VALUE IF NOT EXISTS 'CUSTOM';
