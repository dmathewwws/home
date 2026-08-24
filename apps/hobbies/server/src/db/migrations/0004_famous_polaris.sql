CREATE TABLE `hobbies` (
	`id` text PRIMARY KEY NOT NULL,
	`did` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`hue_index` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_hobbies_did` ON `hobbies` (`did`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_hobbies_did_name` ON `hobbies` (`did`,`name`);--> statement-breakpoint
CREATE TABLE `pieces` (
	`id` text PRIMARY KEY NOT NULL,
	`did` text NOT NULL,
	`hobby_id` text NOT NULL,
	`name` text NOT NULL,
	`links` text DEFAULT '[]' NOT NULL,
	`source` text DEFAULT 'user' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_pieces_did` ON `pieces` (`did`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_pieces_hobby_name` ON `pieces` (`hobby_id`,`name`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`did` text NOT NULL,
	`hobby_id` text NOT NULL,
	`piece_id` text,
	`piece_name` text,
	`date` text NOT NULL,
	`photo_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_did_date` ON `sessions` (`did`,`date`);--> statement-breakpoint
CREATE INDEX `idx_sessions_did_created` ON `sessions` (`did`,`created_at`);