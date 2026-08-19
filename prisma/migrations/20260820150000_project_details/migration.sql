-- The detail page can now edit a project properly: its main date has a name
-- and a calendar availability, extra dates hang off it, and a workspace can
-- invent fields of its own.
CREATE TYPE "Availability" AS ENUM ('BUSY', 'FREE');
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'LONG_TEXT', 'DATE', 'NUMBER', 'LINK', 'SELECT');

ALTER TABLE "project"
  ADD COLUMN IF NOT EXISTS "dateTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "availability" "Availability" NOT NULL DEFAULT 'BUSY';

CREATE TABLE "project_date" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "startAt" TIMESTAMP(3),
  "endAt" TIMESTAMP(3),
  "allDay" BOOLEAN NOT NULL DEFAULT false,
  "availability" "Availability" NOT NULL DEFAULT 'BUSY',
  "location" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "projectId" TEXT NOT NULL,
  CONSTRAINT "project_date_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "project_date_projectId_position_idx" ON "project_date" ("projectId", "position");
ALTER TABLE "project_date"
  ADD CONSTRAINT "project_date_projectId_fkey" FOREIGN KEY ("projectId")
  REFERENCES "project" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "custom_field" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "FieldType" NOT NULL DEFAULT 'TEXT',
  "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "visibleToClient" BOOLEAN NOT NULL DEFAULT true,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "workspaceId" TEXT NOT NULL,
  CONSTRAINT "custom_field_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "custom_field_workspaceId_position_idx" ON "custom_field" ("workspaceId", "position");
ALTER TABLE "custom_field"
  ADD CONSTRAINT "custom_field_workspaceId_fkey" FOREIGN KEY ("workspaceId")
  REFERENCES "workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "project_field_value" (
  "id" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "fieldId" TEXT NOT NULL,
  CONSTRAINT "project_field_value_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "project_field_value_projectId_fieldId_key"
  ON "project_field_value" ("projectId", "fieldId");
CREATE INDEX "project_field_value_projectId_idx" ON "project_field_value" ("projectId");
ALTER TABLE "project_field_value"
  ADD CONSTRAINT "project_field_value_projectId_fkey" FOREIGN KEY ("projectId")
  REFERENCES "project" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_field_value"
  ADD CONSTRAINT "project_field_value_fieldId_fkey" FOREIGN KEY ("fieldId")
  REFERENCES "custom_field" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
