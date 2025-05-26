CREATE TABLE `file_tree_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`app_id` text,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`network_id` text,
	`agent_id` text,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`input` text,
	`output` text,
	`error` text,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`network_id`) REFERENCES `networks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE set null
);
