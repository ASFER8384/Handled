-- A payment schedule: the invoice is one document, paid in named steps.
CREATE TABLE "invoice_instalment" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "dueAt" TIMESTAMP(3),
    "position" INTEGER NOT NULL DEFAULT 0,
    "invoiceId" TEXT NOT NULL,

    CONSTRAINT "invoice_instalment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "invoice_instalment_invoiceId_idx" ON "invoice_instalment"("invoiceId");

ALTER TABLE "invoice_instalment"
  ADD CONSTRAINT "invoice_instalment_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
