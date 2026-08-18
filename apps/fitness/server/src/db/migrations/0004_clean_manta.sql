CREATE TABLE `activity_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`did` text NOT NULL,
	`date` text NOT NULL,
	`activities` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_activity_logs_did_date` ON `activity_logs` (`did`,`date`);--> statement-breakpoint
CREATE TABLE `weight_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`did` text NOT NULL,
	`date` text NOT NULL,
	`kg` real NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_weight_entries_did_date` ON `weight_entries` (`did`,`date`);