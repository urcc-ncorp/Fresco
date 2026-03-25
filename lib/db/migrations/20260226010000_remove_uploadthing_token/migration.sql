-- Delete any stored uploadThingToken rows
DELETE FROM "AppSettings" WHERE "key" = 'uploadThingToken';

-- Remove the uploadThingToken value from the AppSetting enum
-- PostgreSQL requires creating a new enum type without the value
CREATE TYPE "AppSetting_new" AS ENUM ('configured', 'allowAnonymousRecruitment', 'limitInterviews', 'initializedAt', 'installationId', 'disableAnalytics', 'disableSmallScreenOverlay');

-- Update the column to use the new enum
ALTER TABLE "AppSettings" ALTER COLUMN "key" TYPE "AppSetting_new" USING ("key"::text::"AppSetting_new");

-- Drop the old enum and rename the new one
DROP TYPE "AppSetting";
ALTER TYPE "AppSetting_new" RENAME TO "AppSetting";
