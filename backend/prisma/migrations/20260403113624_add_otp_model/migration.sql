-- CreateTable
CREATE TABLE "one_time_passwords" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "one_time_passwords_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "one_time_passwords_phone_type_idx" ON "one_time_passwords"("phone", "type");
