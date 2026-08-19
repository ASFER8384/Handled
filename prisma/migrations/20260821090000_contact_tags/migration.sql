-- Loose labels on a contact, kept in the order they were added.
ALTER TABLE "client" ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT '{}';
