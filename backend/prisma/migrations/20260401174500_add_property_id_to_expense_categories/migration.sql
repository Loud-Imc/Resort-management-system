-- AlterTable
ALTER TABLE "expense_categories" ADD COLUMN     "propertyId" TEXT;

-- DropIndex
DROP INDEX IF EXISTS "expense_categories_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_name_propertyId_key" ON "expense_categories"("name", "propertyId");

-- AddForeignKey
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
