-- Cards now offer every field the project dialog asks for, with only the few
-- a card needs turned on. Views made before this never named the new fields
-- in hiddenProps, so they would come on all at once; name them here instead.
-- 'value' is left in the list where it sits: the property is gone, and an
-- unknown key is ignored.
UPDATE "project_view"
SET "hiddenProps" = ARRAY(
  SELECT DISTINCT unnest("hiddenProps" || ARRAY['endDate', 'leadSource', 'location', 'description'])
)
-- Board only: a list view's own columns are named by some of the same keys.
WHERE "layout" = 'BOARD';
