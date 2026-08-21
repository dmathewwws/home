-- Fold old secondary sources into the new shape (columns added in 0008):
-- url/label become a sources entry; each non-empty notes block lands in the
-- general notes column as "Label:\n<notes>", blocks separated by a blank line.
-- (0007 already converted per-source notes to plain text.)
UPDATE recipes
SET
  sources = (
    SELECT json_group_array(json_object(
      'url',   json_extract(s.value, '$.url'),
      'label', json_extract(s.value, '$.label')
    ))
    FROM json_each(recipes.secondary_sources) s
  ),
  notes = coalesce((
    SELECT group_concat(
      json_extract(s.value, '$.label') || ':' || char(10) || json_extract(s.value, '$.notes'),
      char(10) || char(10)
    )
    FROM json_each(recipes.secondary_sources) s
    WHERE json_extract(s.value, '$.notes') IS NOT NULL
      AND json_extract(s.value, '$.notes') != ''
  ), '')
WHERE secondary_sources != '[]';--> statement-breakpoint
ALTER TABLE `recipes` DROP COLUMN `secondary_sources`;