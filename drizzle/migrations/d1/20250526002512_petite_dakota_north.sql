CREATE TABLE `table_metadata` (
	`id` text PRIMARY KEY NOT NULL,
	`table_name` text NOT NULL,
	`description` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `table_metadata_table_name_unique` ON `table_metadata` (`table_name`);