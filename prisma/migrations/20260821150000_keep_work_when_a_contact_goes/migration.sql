-- Deleting a contact took their projects and their invoices with them, at the
-- database level. The application checked first, but that made the check the
-- only thing standing between a contact and the work: any other caller, or a
-- query run by hand, would have wiped it silently.
--
-- Restrict means the database refuses instead. The check in the app stays as
-- the polite message, not as the defence.
ALTER TABLE "project" DROP CONSTRAINT "project_clientId_fkey";
ALTER TABLE "project"
  ADD CONSTRAINT "project_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "invoice" DROP CONSTRAINT "invoice_clientId_fkey";
ALTER TABLE "invoice"
  ADD CONSTRAINT "invoice_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
