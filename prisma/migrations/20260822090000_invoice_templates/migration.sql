-- An invoice worth writing once: its lines and its terms, without the prices,
-- the client, or the dates that belong to one particular job.
CREATE TABLE "invoice_template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "dueInDays" INTEGER NOT NULL DEFAULT 14,
    "items" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "invoice_template_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "invoice_template_workspaceId_name_idx" ON "invoice_template"("workspaceId", "name");

ALTER TABLE "invoice_template" ADD CONSTRAINT "invoice_template_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
