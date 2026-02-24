-- AlterTable
ALTER TABLE "users" ADD COLUMN "idImage" TEXT;

-- AlterTable
ALTER TABLE "properties" ADD COLUMN "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 12;

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
