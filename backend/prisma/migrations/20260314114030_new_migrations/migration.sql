/*
  Warnings:

  - You are about to drop the column `role` on the `property_staff` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[paymentId]` on the table `income` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `roleId` to the `property_staff` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "IncomeSource" ADD VALUE 'REFUND';

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "couponCode" TEXT;

-- AlterTable
ALTER TABLE "income" ADD COLUMN     "paymentId" TEXT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "commissionRate" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "property_staff" DROP COLUMN "role",
ADD COLUMN     "roleId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "income_paymentId_key" ON "income"("paymentId");

-- AddForeignKey
ALTER TABLE "income" ADD CONSTRAINT "income_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_staff" ADD CONSTRAINT "property_staff_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
