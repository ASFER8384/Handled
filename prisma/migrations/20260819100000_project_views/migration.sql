-- CreateEnum
CREATE TYPE "ViewLayout" AS ENUM ('BOARD', 'LIST');

-- CreateTable
CREATE TABLE "project_view" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "layout" "ViewLayout" NOT NULL DEFAULT 'BOARD',
    "showGroups" BOOLEAN NOT NULL DEFAULT true,
    "hiddenProps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "project_view_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_view_workspaceId_position_idx" ON "project_view"("workspaceId", "position");

-- AddForeignKey
ALTER TABLE "project_view" ADD CONSTRAINT "project_view_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Every workspace starts with the view it cannot delete.
INSERT INTO "project_view" ("id", "name", "position", "layout", "isDefault", "updatedAt", "workspaceId")
SELECT md5(w."id" || 'main-view')::text, 'Main view', 0, 'BOARD', true, CURRENT_TIMESTAMP, w."id"
FROM "workspace" w;
