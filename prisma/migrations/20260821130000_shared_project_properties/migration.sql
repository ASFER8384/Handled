-- The table now offers the same project fields as a card, from one list, so a
-- view shows the same work whichever way you look at it. Two things follow for
-- views made before this: the date column was keyed 'date' and is now
-- 'serviceDate', and the fields that start off have to be named, or they would
-- all come on at once. Stale keys left in the list are ignored.
UPDATE "project_view"
SET "hiddenProps" = ARRAY(
  SELECT DISTINCT unnest(
    ARRAY(
      SELECT CASE WHEN key = 'date' THEN 'serviceDate' ELSE key END
      FROM unnest("hiddenProps") AS key
    )
    || ARRAY['endDate', 'leadSource', 'location', 'description']
  )
)
WHERE "layout" = 'LIST';
