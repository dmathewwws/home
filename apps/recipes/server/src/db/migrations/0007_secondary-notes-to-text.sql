-- Secondary-source notes: string[] -> single free-text block.
-- Join each notes array into "- note" lines (the new bullet style).
UPDATE recipes
SET secondary_sources = (
  SELECT json_group_array(json_object(
    'url',   json_extract(s.value, '$.url'),
    'label', json_extract(s.value, '$.label'),
    'notes', coalesce((SELECT group_concat('- ' || j.value, char(10))
                       FROM json_each(s.value, '$.notes') j), '')
  ))
  FROM json_each(recipes.secondary_sources) s
)
WHERE secondary_sources != '[]';