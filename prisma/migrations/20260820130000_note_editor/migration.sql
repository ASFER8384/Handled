-- Notes are written documents now: a title, formatting, and a sharing switch.
ALTER TABLE "project_note"
  ADD COLUMN IF NOT EXISTS "title" TEXT,
  ADD COLUMN IF NOT EXISTS "bodyHtml" TEXT,
  ADD COLUMN IF NOT EXISTS "sharedWithClient" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- An existing note has never been edited, so it was last touched when written.
UPDATE "project_note" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
