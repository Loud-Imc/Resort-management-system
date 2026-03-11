-- DropForeignKey
ALTER TABLE "income" DROP CONSTRAINT "income_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "income" DROP CONSTRAINT "income_eventBookingId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_eventBookingId_fkey";

-- DropForeignKey
ALTER TABLE "room_blocks" DROP CONSTRAINT "room_blocks_bookingId_fkey";

-- CreateIndex
CREATE INDEX "bookings_propertyId_idx" ON "bookings"("propertyId");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_checkInDate_checkOutDate_idx" ON "bookings"("checkInDate", "checkOutDate");

-- CreateIndex
CREATE INDEX "bookings_userId_idx" ON "bookings"("userId");

-- CreateIndex
CREATE INDEX "coupons_isActive_idx" ON "coupons"("isActive");

-- CreateIndex
CREATE INDEX "income_bookingId_idx" ON "income"("bookingId");

-- CreateIndex
CREATE INDEX "income_date_idx" ON "income"("date");

-- CreateIndex
CREATE INDEX "payments_bookingId_idx" ON "payments"("bookingId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "room_blocks_roomId_idx" ON "room_blocks"("roomId");

-- CreateIndex
CREATE INDEX "room_blocks_startDate_endDate_idx" ON "room_blocks"("startDate", "endDate");

-- AddForeignKey
ALTER TABLE "room_blocks" ADD CONSTRAINT "room_blocks_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_eventBookingId_fkey" FOREIGN KEY ("eventBookingId") REFERENCES "event_bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income" ADD CONSTRAINT "income_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income" ADD CONSTRAINT "income_eventBookingId_fkey" FOREIGN KEY ("eventBookingId") REFERENCES "event_bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add Custom Check Constraints for Booking Integrity
ALTER TABLE bookings ADD CONSTRAINT chk_paid_lte_total CHECK ("paidAmount" <= "totalAmount");
ALTER TABLE bookings ADD CONSTRAINT chk_amounts_positive CHECK ("totalAmount" >= 0 AND "paidAmount" >= 0);

-- Add Custom Check Constraints for Payment Integrity
ALTER TABLE payments ADD CONSTRAINT chk_refund_limit CHECK ("refundAmount" IS NULL OR "refundAmount" <= amount);

-- Add Custom Check Constraints for Wallet Integrity
ALTER TABLE channel_partners ADD CONSTRAINT chk_wallet_positive CHECK ("walletBalance" >= 0);

-- Add Custom Check Constraints for Coupon Integrity
ALTER TABLE coupons ADD CONSTRAINT chk_coupon_limit CHECK ("maxUses" IS NULL OR "usedCount" <= "maxUses");

-- Add Exclusion Constraint for Overlapping RoomBlocks
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE room_blocks ADD CONSTRAINT prevent_room_double_book EXCLUDE USING GIST ("roomId" WITH =, tsrange("startDate", "endDate") WITH &&);
