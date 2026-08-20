-- Parts of the letterhead an invoice leaves off. Empty means all of it.
ALTER TABLE "invoice" ADD COLUMN "hidden" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
