-- CreateTable
CREATE TABLE IF NOT EXISTS "app_update_policies" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "minimumSupportedVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "latestVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "updateType" TEXT NOT NULL DEFAULT 'none',
    "title" TEXT NOT NULL DEFAULT 'Update Required',
    "message" TEXT NOT NULL DEFAULT 'A new version of the app is required to continue using the service.',
    "storeUrl" TEXT NOT NULL DEFAULT '',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "rolloutPercentage" INTEGER NOT NULL DEFAULT 100,
    "policyVersion" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "app_update_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "app_update_policies_platform_key" ON "app_update_policies"("platform");

-- Seed default initial policies for Android and iOS if not present
INSERT INTO "app_update_policies" (
    "id", "platform", "minimumSupportedVersion", "latestVersion", "updateType", "title", "message", "storeUrl", "enabled", "rolloutPercentage", "policyVersion", "publishedAt", "createdAt", "updatedAt"
)
VALUES 
    ('android-default-policy', 'android', '1.0.0', '1.0.0', 'none', 'Update Required', 'A new version of the app is required to continue using the service.', 'https://play.google.com/store/apps/details?id=com.oreedu.app', true, 100, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('ios-default-policy', 'ios', '1.0.0', '1.0.0', 'none', 'Update Required', 'A new version of the app is required to continue using the service.', 'https://apps.apple.com/app/id6740000000', true, 100, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("platform") DO NOTHING;
