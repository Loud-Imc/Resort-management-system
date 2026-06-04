-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "isPaid" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "paymentMethod" TEXT;
