-- AlterTable: Add channelName and externalBookingId to bookings
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "channelName" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "externalBookingId" TEXT;

-- CreateIndex: Unique index on externalBookingId
CREATE UNIQUE INDEX IF NOT EXISTS "bookings_externalBookingId_key" ON "bookings"("externalBookingId");

-- CreateTable: channel_property_mappings
CREATE TABLE IF NOT EXISTS "channel_property_mappings" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "channelName" TEXT NOT NULL DEFAULT 'CHANNEX',
    "externalPropertyId" TEXT NOT NULL,
    "apiKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_property_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable: channel_room_type_mappings
CREATE TABLE IF NOT EXISTS "channel_room_type_mappings" (
    "id" TEXT NOT NULL,
    "propertyMappingId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "externalRoomTypeId" TEXT NOT NULL,
    "externalRatePlanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_room_type_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "channel_property_mappings_propertyId_channelName_key" ON "channel_property_mappings"("propertyId", "channelName");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "channel_room_type_mappings_propertyMappingId_roomTypeId_key" ON "channel_room_type_mappings"("propertyMappingId", "roomTypeId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'channel_property_mappings_propertyId_fkey') THEN
        ALTER TABLE "channel_property_mappings" ADD CONSTRAINT "channel_property_mappings_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'channel_room_type_mappings_roomTypeId_fkey') THEN
        ALTER TABLE "channel_room_type_mappings" ADD CONSTRAINT "channel_room_type_mappings_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'channel_room_type_mappings_propertyMappingId_fkey') THEN
        ALTER TABLE "channel_room_type_mappings" ADD CONSTRAINT "channel_room_type_mappings_propertyMappingId_fkey" FOREIGN KEY ("propertyMappingId") REFERENCES "channel_property_mappings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
