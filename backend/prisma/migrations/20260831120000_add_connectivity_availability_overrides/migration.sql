-- CreateTable
CREATE TABLE IF NOT EXISTS "connectivity_availability_overrides" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "allocatedQuantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connectivity_availability_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "connectivity_availability_overrides_propertyId_date_idx" ON "connectivity_availability_overrides"("propertyId", "date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "connectivity_availability_overrides_propertyId_roomTypeId_d_key" ON "connectivity_availability_overrides"("propertyId", "roomTypeId", "date");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'connectivity_availability_overrides_propertyId_fkey') THEN
        ALTER TABLE "connectivity_availability_overrides" ADD CONSTRAINT "connectivity_availability_overrides_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'connectivity_availability_overrides_roomTypeId_fkey') THEN
        ALTER TABLE "connectivity_availability_overrides" ADD CONSTRAINT "connectivity_availability_overrides_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
