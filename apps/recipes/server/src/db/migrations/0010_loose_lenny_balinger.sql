ALTER TABLE `recipes` ADD `variations` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `reflections` ADD `variation` text;