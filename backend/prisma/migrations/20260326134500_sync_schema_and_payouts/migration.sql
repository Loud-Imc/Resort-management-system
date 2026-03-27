-- CreateEnum
CREATE TYPE "BookingPaymentMethod" AS ENUM ('WALLET', 'ONLINE', 'CASH', 'UPI');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('CALCULATED', 'APPROVED', 'PROCESSING', 'PAID', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('WALLET', 'POINTS');

-- AlterEnum
ALTER TYPE "CPTransactionType" ADD VALUE 'REFUND';

-- AlterEnum
ALTER TYPE "RedemptionStatus" ADD VALUE 'REQUESTED';
ALTER TYPE "RedemptionStatus" ADD VALUE 'APPROVED';
ALTER TYPE "RedemptionStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "RedemptionStatus" ADD VALUE 'PAID';
ALTER TYPE "RedemptionStatus" ADD VALUE 'FAILED';
