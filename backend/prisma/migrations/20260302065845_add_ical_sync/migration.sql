-- CreateTable
CREATE TABLE "property_icals" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "icalUrl" TEXT NOT NULL,
    "platformName" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_icals_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "property_icals" ADD CONSTRAINT "property_icals_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
