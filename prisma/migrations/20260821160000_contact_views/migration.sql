-- The Contacts table gets saved views, the way the project board already has
-- them: a tab per way of looking at the list.
CREATE TABLE "contact_view" (
  "id"            TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "position"      INTEGER NOT NULL,
  "hiddenColumns" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "sortField"     TEXT,
  "sortDir"       TEXT NOT NULL DEFAULT 'asc',
  "filters"       JSONB NOT NULL DEFAULT '[]',
  "isDefault"     BOOLEAN NOT NULL DEFAULT false,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  "workspaceId"   TEXT NOT NULL,
  CONSTRAINT "contact_view_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "contact_view_workspaceId_position_idx" ON "contact_view"("workspaceId", "position");

ALTER TABLE "contact_view"
  ADD CONSTRAINT "contact_view_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Every workspace keeps what it had. The settings lived on the workspace
-- itself until now, so the first view is made out of them rather than from
-- defaults, and the columns they came from go.
INSERT INTO "contact_view" ("id", "name", "position", "hiddenColumns", "sortField", "sortDir", "isDefault", "updatedAt", "workspaceId")
SELECT
  'cv_' || "id",
  'Main view',
  0,
  "contactHiddenColumns",
  "contactSortField",
  "contactSortDir",
  true,
  CURRENT_TIMESTAMP,
  "id"
FROM "workspace";

ALTER TABLE "workspace"
  DROP COLUMN "contactHiddenColumns",
  DROP COLUMN "contactSortField",
  DROP COLUMN "contactSortDir";
