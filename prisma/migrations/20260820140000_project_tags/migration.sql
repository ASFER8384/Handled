-- Loose labels on a project, kept in the order they were added.
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT '{}';
