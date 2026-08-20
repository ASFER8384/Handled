-- What a client sees at the top of anything you send them, and what a new file
-- starts out looking like.
ALTER TABLE "workspace" ADD COLUMN "email" TEXT;
ALTER TABLE "workspace" ADD COLUMN "phone" TEXT;
ALTER TABLE "workspace" ADD COLUMN "website" TEXT;
ALTER TABLE "workspace" ADD COLUMN "address" TEXT;
ALTER TABLE "workspace" ADD COLUMN "trade" TEXT;
ALTER TABLE "workspace" ADD COLUMN "themeColor" TEXT NOT NULL DEFAULT 'ink';
ALTER TABLE "workspace" ADD COLUMN "themeFont" TEXT NOT NULL DEFAULT 'sans';
