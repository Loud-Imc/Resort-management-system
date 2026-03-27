-- CreateEnum (idempotent)
DO $$ BEGIN
    CREATE TYPE "BookingPaymentMethod" AS ENUM ('WALLET', 'ONLINE', 'CASH', 'UPI');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum (idempotent)
DO $$ BEGIN
    CREATE TYPE "SettlementStatus" AS ENUM ('CALCULATED', 'APPROVED', 'PROCESSING', 'PAID', 'FAILED', 'REVERSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum (idempotent)
DO $$ BEGIN
    CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum (idempotent)
DO $$ BEGIN
    CREATE TYPE "AdjustmentType" AS ENUM ('WALLET', 'POINTS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterEnum (idempotent)
DO $$ BEGIN
    ALTER TYPE "CPTransactionType" ADD VALUE 'REFUND';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterEnum (idempotent)
DO $$ BEGIN
    ALTER TYPE "RedemptionStatus" ADD VALUE 'REQUESTED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TYPE "RedemptionStatus" ADD VALUE 'APPROVED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TYPE "RedemptionStatus" ADD VALUE 'PROCESSING';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TYPE "RedemptionStatus" ADD VALUE 'PAID';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TYPE "RedemptionStatus" ADD VALUE 'FAILED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

