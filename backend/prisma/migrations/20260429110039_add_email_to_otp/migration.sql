-- AlterTable
ALTER TABLE "one_time_passwords" ADD COLUMN     "email" TEXT,
ALTER COLUMN "phone" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "one_time_passwords_email_type_idx" ON "one_time_passwords"("email", "type");
