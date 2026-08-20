-- How an invoice is painted when it is read, kept with the invoice itself so
-- the one that was sent stays the one they see.
ALTER TABLE "invoice" ADD COLUMN "themeColor" TEXT NOT NULL DEFAULT 'ink';
ALTER TABLE "invoice" ADD COLUMN "themeFont" TEXT NOT NULL DEFAULT 'sans';
