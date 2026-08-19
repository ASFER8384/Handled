-- A view can narrow by more than one field at once.
ALTER TABLE "project_view" ADD COLUMN "filters" JSONB NOT NULL DEFAULT '[]';

-- Carry the single filter each view already had into the list.
UPDATE "project_view"
SET "filters" = jsonb_build_array(
  jsonb_build_object('field', "filterField", 'value', COALESCE("filterValue", ''))
)
WHERE "filterField" IS NOT NULL;

ALTER TABLE "project_view" DROP COLUMN "filterField", DROP COLUMN "filterValue";
