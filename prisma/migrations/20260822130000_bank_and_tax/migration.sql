-- Where the money goes, and what the taxman is owed on it.
ALTER TABLE "workspace" ADD COLUMN "bankName" TEXT;
ALTER TABLE "workspace" ADD COLUMN "bankAccountName" TEXT;
ALTER TABLE "workspace" ADD COLUMN "bankAccountNumber" TEXT;
ALTER TABLE "workspace" ADD COLUMN "bankIban" TEXT;
ALTER TABLE "workspace" ADD COLUMN "bankSwift" TEXT;
ALTER TABLE "workspace" ADD COLUMN "bankNotes" TEXT;
ALTER TABLE "workspace" ADD COLUMN "taxLabel" TEXT NOT NULL DEFAULT 'VAT';
ALTER TABLE "workspace" ADD COLUMN "taxNumber" TEXT;
ALTER TABLE "workspace" ADD COLUMN "taxRateBp" INTEGER NOT NULL DEFAULT 0;

-- Snapshotted on the invoice: a rate changed next year must not rewrite what
-- was already sent.
ALTER TABLE "invoice" ADD COLUMN "taxRateBp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "invoice" ADD COLUMN "taxLabel" TEXT;
