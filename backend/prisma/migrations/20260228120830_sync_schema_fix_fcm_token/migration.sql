-- AlterEnum
ALTER TYPE "IncomeSource" ADD VALUE 'CP_REGISTRATION_FEE';

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "abandonedCartSentAt" TIMESTAMP(3),
ADD COLUMN     "isSeenByProperty" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewRequestSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "channel_partners" ADD COLUMN     "aadhaarImage" TEXT,
ADD COLUMN     "licenceImage" TEXT;

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "gstNumber" TEXT,
ADD COLUMN     "licenceImage" TEXT,
ADD COLUMN     "ownerAadhaarImage" TEXT,
ADD COLUMN     "ownerAadhaarNumber" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "fcmToken" TEXT;

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
