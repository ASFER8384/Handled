-- An email can carry an invoice, so the message knows what it sent.
ALTER TABLE "project_message" ADD COLUMN "invoiceId" TEXT;

ALTER TABLE "project_message"
  ADD CONSTRAINT "project_message_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "project_message_invoiceId_idx" ON "project_message"("invoiceId");
