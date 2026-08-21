ALTER TABLE `recipes` ADD `notes` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `recipes` ADD `sources` text DEFAULT '[]' NOT NULL;