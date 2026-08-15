CREATE TABLE `ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_ingredients_name` ON `ingredients` (lower("name"));--> statement-breakpoint
CREATE TABLE `recipe_ingredients` (
	`recipe_id` text NOT NULL,
	`ingredient_id` text NOT NULL,
	`amount` text,
	`position` integer NOT NULL,
	PRIMARY KEY(`recipe_id`, `ingredient_id`),
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_ri_ingredient` ON `recipe_ingredients` (`ingredient_id`);--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`meal` text NOT NULL,
	`minutes` integer NOT NULL,
	`source_type` text NOT NULL,
	`source_url` text,
	`source_author` text,
	`source_detail` text,
	`thumb_url` text,
	`cards` text NOT NULL,
	`swaps` text DEFAULT '[]' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_recipes_created_at` ON `recipes` (`created_at`);--> statement-breakpoint
CREATE TABLE `reflections` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text,
	`recipe_title` text NOT NULL,
	`verdict` text NOT NULL,
	`note` text,
	`change_next_time` text,
	`minutes` integer,
	`rep` integer NOT NULL,
	`photo_id` text,
	`created_by` text NOT NULL,
	`cooked_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_reflections_recipe` ON `reflections` (`recipe_id`,`cooked_at`);--> statement-breakpoint
CREATE INDEX `idx_reflections_cooked_at` ON `reflections` (`cooked_at`);--> statement-breakpoint
ALTER TABLE `users` ADD `is_verified` integer DEFAULT false NOT NULL;