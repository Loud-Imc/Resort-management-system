-- Add missing enum values to ConnectivityConnectionStatus enum in PostgreSQL
ALTER TYPE "ConnectivityConnectionStatus" ADD VALUE IF NOT EXISTS 'INACTIVE';
ALTER TYPE "ConnectivityConnectionStatus" ADD VALUE IF NOT EXISTS 'DISCONNECTED';
ALTER TYPE "ConnectivityConnectionStatus" ADD VALUE IF NOT EXISTS 'DEGRADED';
