-- Everything a business puts on its own letterhead: where it stands, how it
-- describes itself, where else it can be found, and the marks it is known by.
ALTER TABLE "workspace" ADD COLUMN "phoneCode" TEXT;
ALTER TABLE "workspace" ADD COLUMN "street" TEXT;
ALTER TABLE "workspace" ADD COLUMN "city" TEXT;
ALTER TABLE "workspace" ADD COLUMN "postcode" TEXT;
ALTER TABLE "workspace" ADD COLUMN "region" TEXT;
ALTER TABLE "workspace" ADD COLUMN "country" TEXT;
ALTER TABLE "workspace" ADD COLUMN "timezone" TEXT;
ALTER TABLE "workspace" ADD COLUMN "oneLiner" TEXT;
ALTER TABLE "workspace" ADD COLUMN "about" TEXT;
ALTER TABLE "workspace" ADD COLUMN "socials" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "workspace" ADD COLUMN "brandColor" TEXT NOT NULL DEFAULT '#c25a3a';
ALTER TABLE "workspace" ADD COLUMN "logoKey" TEXT;
ALTER TABLE "workspace" ADD COLUMN "logoMime" TEXT;
ALTER TABLE "workspace" ADD COLUMN "logoAltKey" TEXT;
ALTER TABLE "workspace" ADD COLUMN "logoAltMime" TEXT;
