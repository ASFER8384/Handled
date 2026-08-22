-- Files kept where a deploy cannot lose them. A serverless machine's disk is
-- gone by the next request, which is why every logo came back broken.
CREATE TABLE "upload" (
    "id" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "bytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "upload_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "upload_workspaceId_idx" ON "upload"("workspaceId");

ALTER TABLE "upload" ADD CONSTRAINT "upload_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
