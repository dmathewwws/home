-- Ingredient roles expanded from 4 to 10 (dairy, spice, grain, fat, sauce, sweet).
--
-- Part 1 re-files the built-in staples seeded by 0004 into the new roles. Rows are
-- matched by their deterministic seed UUIDs, never by name, so anything the user
-- renamed or added themselves is left alone. Recipe->ingredient links are by id,
-- so no recipe data is rewritten — only the role (and therefore chip colour) shifts.
UPDATE `ingredients` SET `role` = 'dairy' WHERE `id` IN (
  'a0000000-0000-4000-8000-00000000001a', -- Mozzarella
  'a0000000-0000-4000-8000-00000000001b', -- Parmesan
  'a0000000-0000-4000-8000-00000000001c', -- Feta
  'a0000000-0000-4000-8000-000000000039'  -- Butter
);
--> statement-breakpoint
UPDATE `ingredients` SET `role` = 'spice' WHERE `id` IN (
  'a0000000-0000-4000-8000-00000000003f', -- Sichuan pepper
  'a0000000-0000-4000-8000-000000000040', -- Cumin
  'a0000000-0000-4000-8000-000000000041'  -- Smoked paprika
);
--> statement-breakpoint
UPDATE `ingredients` SET `role` = 'grain' WHERE `id` IN (
  'a0000000-0000-4000-8000-000000000035', -- Rice
  'a0000000-0000-4000-8000-000000000036', -- Bread flour
  'a0000000-0000-4000-8000-000000000037', -- Plain flour
  'a0000000-0000-4000-8000-00000000003a', -- White bread
  'a0000000-0000-4000-8000-00000000003c'  -- Cornstarch
);
--> statement-breakpoint
UPDATE `ingredients` SET `role` = 'fat' WHERE `id` IN (
  'a0000000-0000-4000-8000-000000000031', -- Olive oil
  'a0000000-0000-4000-8000-000000000032'  -- Sesame oil
);
--> statement-breakpoint
UPDATE `ingredients` SET `role` = 'sauce' WHERE `id` IN (
  'a0000000-0000-4000-8000-000000000033', -- Soy sauce
  'a0000000-0000-4000-8000-000000000034', -- Fish sauce
  'a0000000-0000-4000-8000-00000000003d', -- Doubanjiang
  'a0000000-0000-4000-8000-00000000003e'  -- Gochujang
);
--> statement-breakpoint
UPDATE `ingredients` SET `role` = 'sweet' WHERE `id` = 'a0000000-0000-4000-8000-00000000003b';
--> statement-breakpoint
-- Part 2 seeds staples for the new roles (plus Salt, which the catalog never had).
-- INSERT OR IGNORE keeps this idempotent against the unique lower(name) index.
INSERT OR IGNORE INTO `ingredients` (`id`, `name`, `role`) VALUES
('a0000000-0000-4000-8000-000000000051', 'Milk', 'dairy'),
('a0000000-0000-4000-8000-000000000052', 'Cream', 'dairy'),
('a0000000-0000-4000-8000-000000000053', 'Yogurt', 'dairy'),
('a0000000-0000-4000-8000-000000000054', 'Cheddar', 'dairy'),
('a0000000-0000-4000-8000-000000000055', 'Sour cream', 'dairy'),
('a0000000-0000-4000-8000-000000000061', 'Black pepper', 'spice'),
('a0000000-0000-4000-8000-000000000062', 'Coriander seed', 'spice'),
('a0000000-0000-4000-8000-000000000063', 'Turmeric', 'spice'),
('a0000000-0000-4000-8000-000000000064', 'Cinnamon', 'spice'),
('a0000000-0000-4000-8000-000000000065', 'Chilli flakes', 'spice'),
('a0000000-0000-4000-8000-000000000066', 'Garam masala', 'spice'),
('a0000000-0000-4000-8000-000000000067', 'Bay leaf', 'spice'),
('a0000000-0000-4000-8000-000000000071', 'Pasta', 'grain'),
('a0000000-0000-4000-8000-000000000072', 'Noodles', 'grain'),
('a0000000-0000-4000-8000-000000000073', 'Oats', 'grain'),
('a0000000-0000-4000-8000-000000000074', 'Breadcrumbs', 'grain'),
('a0000000-0000-4000-8000-000000000075', 'Tortilla', 'grain'),
('a0000000-0000-4000-8000-000000000081', 'Vegetable oil', 'fat'),
('a0000000-0000-4000-8000-000000000082', 'Ghee', 'fat'),
('a0000000-0000-4000-8000-000000000091', 'Rice vinegar', 'sauce'),
('a0000000-0000-4000-8000-000000000092', 'Tomato paste', 'sauce'),
('a0000000-0000-4000-8000-000000000093', 'Dijon mustard', 'sauce'),
('a0000000-0000-4000-8000-000000000094', 'Oyster sauce', 'sauce'),
('a0000000-0000-4000-8000-0000000000a1', 'Honey', 'sweet'),
('a0000000-0000-4000-8000-0000000000a2', 'Brown sugar', 'sweet'),
('a0000000-0000-4000-8000-0000000000a3', 'Maple syrup', 'sweet'),
('a0000000-0000-4000-8000-0000000000a4', 'Dark chocolate', 'sweet'),
('a0000000-0000-4000-8000-0000000000b1', 'Salt', 'pantry'),
('a0000000-0000-4000-8000-0000000000b2', 'Baking powder', 'pantry');
