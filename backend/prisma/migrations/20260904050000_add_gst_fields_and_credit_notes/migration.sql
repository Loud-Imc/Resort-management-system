-- AlterTable
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "isGstApplicable" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "invoiceNumber" TEXT,
ADD COLUMN IF NOT EXISTS "invoiceDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "financialYear" TEXT;

-- AlterTable
ALTER TABLE "property_settlements" ADD COLUMN IF NOT EXISTS "commissionGst" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "propertyTaxCollected" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "credit_notes" (
    "id" TEXT NOT NULL,
    "creditNoteNumber" TEXT NOT NULL,
    "financialYear" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "originalAmount" DECIMAL(10,2) NOT NULL,
    "creditedAmount" DECIMAL(10,2) NOT NULL,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "refundPercentage" DECIMAL(5,2) NOT NULL,
    "reason" TEXT,
    "issuedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "credit_notes_creditNoteNumber_key" ON "credit_notes"("creditNoteNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "credit_notes_bookingId_idx" ON "credit_notes"("bookingId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "credit_notes_propertyId_idx" ON "credit_notes"("propertyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "credit_notes_financialYear_idx" ON "credit_notes"("financialYear");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_notes_bookingId_fkey') THEN
        ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_notes_propertyId_fkey') THEN
        ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_notes_issuedById_fkey') THEN
        ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
