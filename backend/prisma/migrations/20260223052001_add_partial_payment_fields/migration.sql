-- CreateEnum
CREATE TYPE "BookingPaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'FULL');

-- CreateEnum
CREATE TYPE "BookingPaymentOption" AS ENUM ('FULL', 'PARTIAL');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "paymentOption" "BookingPaymentOption" NOT NULL DEFAULT 'FULL',
ADD COLUMN     "paymentStatus" "BookingPaymentStatus" NOT NULL DEFAULT 'UNPAID';
