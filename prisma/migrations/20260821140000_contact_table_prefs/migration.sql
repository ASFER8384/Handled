-- The Contacts table remembers what it shows and how it is ordered.
ALTER TABLE "workspace"
  ADD COLUMN IF NOT EXISTS "contactHiddenColumns" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "contactSortField" TEXT,
  ADD COLUMN IF NOT EXISTS "contactSortDir" TEXT NOT NULL DEFAULT 'asc';

-- Workspaces that predate this start with the same columns a new one gets:
-- who they are and how to reach them, with the rest a tick away.
UPDATE "workspace"
SET "contactHiddenColumns" = ARRAY['jobTitle', 'website', 'address', 'tags']
WHERE "contactHiddenColumns" = '{}';
