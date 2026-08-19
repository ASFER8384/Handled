-- A project can carry more people than the client it belongs to.
CREATE TABLE IF NOT EXISTS "project_contact" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "projectId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  CONSTRAINT "project_contact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "project_contact_projectId_clientId_key"
  ON "project_contact" ("projectId", "clientId");
CREATE INDEX IF NOT EXISTS "project_contact_projectId_idx" ON "project_contact" ("projectId");

ALTER TABLE "project_contact"
  ADD CONSTRAINT "project_contact_projectId_fkey" FOREIGN KEY ("projectId")
  REFERENCES "project" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_contact"
  ADD CONSTRAINT "project_contact_clientId_fkey" FOREIGN KEY ("clientId")
  REFERENCES "client" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
