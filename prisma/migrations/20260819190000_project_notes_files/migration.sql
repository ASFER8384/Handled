-- Notes and file references hang off a project and die with it.
CREATE TABLE "project_note" (
  "id" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "projectId" TEXT NOT NULL,
  CONSTRAINT "project_note_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_file" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "projectId" TEXT NOT NULL,
  CONSTRAINT "project_file_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "project_note_projectId_createdAt_idx" ON "project_note"("projectId", "createdAt");
CREATE INDEX "project_file_projectId_createdAt_idx" ON "project_file"("projectId", "createdAt");

ALTER TABLE "project_note" ADD CONSTRAINT "project_note_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_file" ADD CONSTRAINT "project_file_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
