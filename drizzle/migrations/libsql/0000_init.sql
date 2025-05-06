CREATE TABLE `agent_states` (
	`memory_thread_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`state_data` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`memory_thread_id`, `agent_id`)
);
--> statement-breakpoint
CREATE TABLE `embeddings` (
	`id` text PRIMARY KEY NOT NULL,
	`vector` blob NOT NULL,
	`model` text,
	`dimensions` integer,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `memory_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text,
	`network_id` text,
	`name` text NOT NULL,
	`summary` text,
	`metadata` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`memory_thread_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`tool_call_id` text,
	`tool_name` text,
	`token_count` integer,
	`embedding_id` text,
	`metadata` text,
	`created_at` text NOT NULL
);
