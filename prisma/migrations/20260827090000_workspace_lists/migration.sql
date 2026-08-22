-- The kinds of work a business does, and where it comes from. Empty means the
-- list Handled ships with.
ALTER TABLE "workspace" ADD COLUMN "projectTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "workspace" ADD COLUMN "leadSources" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
