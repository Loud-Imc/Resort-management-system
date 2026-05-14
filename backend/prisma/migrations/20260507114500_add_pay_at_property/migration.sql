-- AlterEnum
ALTER TYPE "BookingPaymentOption" ADD VALUE 'PAY_AT_PROPERTY';

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "papReminder12hSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "papReminder24hSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "papReminder6hSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payAtPropertyReminderSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "room_types" ADD COLUMN     "allowPayAtProperty" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "size" INTEGER;
