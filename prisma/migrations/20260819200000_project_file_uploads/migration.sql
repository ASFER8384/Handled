-- A file is either an upload we store, or a link to one somewhere else.
ALTER TABLE "project_file"
  ALTER COLUMN "url" DROP NOT NULL,
  ADD COLUMN "storageKey" TEXT,
  ADD COLUMN "mimeType" TEXT,
  ADD COLUMN "sizeBytes" INTEGER;
