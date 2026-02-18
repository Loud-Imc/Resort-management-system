/*
  Warnings:

  - A unique constraint covering the columns `[name,propertyId]` on the table `roles` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "RoleCategory" AS ENUM ('SYSTEM', 'PROPERTY', 'EVENT');

-- DropIndex
DROP INDEX "roles_name_key";

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "category" "RoleCategory" NOT NULL DEFAULT 'SYSTEM',
ADD COLUMN     "isSystem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "propertyId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_propertyId_key" ON "roles"("name", "propertyId");

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
