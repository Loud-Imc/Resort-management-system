-- CreateTable
CREATE TABLE "_BookingToExpense" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_BookingToExpense_AB_unique" ON "_BookingToExpense"("A", "B");

-- CreateIndex
CREATE INDEX "_BookingToExpense_B_index" ON "_BookingToExpense"("B");

-- AddForeignKey
ALTER TABLE "_BookingToExpense" ADD CONSTRAINT "_BookingToExpense_A_fkey" FOREIGN KEY ("A") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BookingToExpense" ADD CONSTRAINT "_BookingToExpense_B_fkey" FOREIGN KEY ("B") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
