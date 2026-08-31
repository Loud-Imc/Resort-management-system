-- CreateTable
CREATE TABLE "restriction_rules" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "roomTypeId" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "minStayArrival" INTEGER,
    "minStayThrough" INTEGER,
    "maxStay" INTEGER,
    "closedToArrival" BOOLEAN NOT NULL DEFAULT false,
    "closedToDeparture" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restriction_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "restriction_rules_propertyId_startDate_endDate_idx" ON "restriction_rules"("propertyId", "startDate", "endDate");

-- AddForeignKey
ALTER TABLE "restriction_rules" ADD CONSTRAINT "restriction_rules_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restriction_rules" ADD CONSTRAINT "restriction_rules_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
