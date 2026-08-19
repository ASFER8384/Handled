-- A view remembers how it is sorted and filtered, so each tab is its own lens.
ALTER TABLE "project_view"
  ADD COLUMN "sortField" TEXT,
  ADD COLUMN "sortDir" TEXT NOT NULL DEFAULT 'asc',
  ADD COLUMN "filterField" TEXT,
  ADD COLUMN "filterValue" TEXT;
