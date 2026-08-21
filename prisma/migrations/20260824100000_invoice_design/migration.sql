-- Which sheet design an invoice is drawn in. Everything written before this
-- was drawn in the only one there was.
ALTER TABLE "invoice" ADD COLUMN "design" TEXT NOT NULL DEFAULT 'classic';
