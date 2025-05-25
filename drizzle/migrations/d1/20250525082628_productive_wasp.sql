CREATE TABLE `database_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`connection_type` text NOT NULL,
	`pool_name` text NOT NULL,
	`connection_url` text NOT NULL,
	`max_connections` integer,
	`idle_timeout_ms` integer,
	`connection_timeout_ms` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `database_queries` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text,
	`query_text` text NOT NULL,
	`query_type` text,
	`execution_time_ms` integer,
	`row_count` integer,
	`status` text NOT NULL,
	`error_message` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `database_transactions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `database_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`connection_id` text,
	`transaction_type` text,
	`start_time` integer NOT NULL,
	`end_time` integer,
	`duration_ms` integer,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`query_count` integer DEFAULT 0 NOT NULL,
	`error_message` text,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`connection_id`) REFERENCES `database_connections`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `evaluation_examples` (
	`id` text PRIMARY KEY NOT NULL,
	`evaluation_id` text NOT NULL,
	`input` text NOT NULL,
	`expected_output` text,
	`actual_output` text,
	`scores` text,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`evaluation_id`) REFERENCES `model_evaluations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `evaluation_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`evaluation_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`value` real NOT NULL,
	`threshold` real,
	`weight` real,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`evaluation_id`) REFERENCES `model_evaluations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`trace_id` text NOT NULL,
	`span_id` text,
	`name` text NOT NULL,
	`timestamp` integer NOT NULL,
	`attributes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`trace_id`) REFERENCES `traces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`span_id`) REFERENCES `spans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `model_costs` (
	`id` text PRIMARY KEY NOT NULL,
	`model_id` text NOT NULL,
	`date` integer NOT NULL,
	`cost` real DEFAULT 0 NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`requests` integer DEFAULT 0 NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`model_id`) REFERENCES `models`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `model_evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`model_id` text NOT NULL,
	`version` text,
	`evaluation_date` integer NOT NULL,
	`dataset_name` text,
	`dataset_size` integer,
	`overall_score` real,
	`previous_score` real,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`model_id`) REFERENCES `models`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `model_performance` (
	`id` text PRIMARY KEY NOT NULL,
	`model_id` text NOT NULL,
	`timestamp` integer NOT NULL,
	`latency_ms` real,
	`tokens_per_second` real,
	`success_rate` real,
	`request_count` integer DEFAULT 0 NOT NULL,
	`total_tokens` integer DEFAULT 0 NOT NULL,
	`error_count` integer DEFAULT 0 NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`model_id`) REFERENCES `models`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `scheduled_task_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`start_time` integer NOT NULL,
	`end_time` integer,
	`duration_ms` integer,
	`status` text NOT NULL,
	`result_summary` text,
	`error_message` text,
	`metadata` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `scheduled_tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `scheduled_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`cron_expression` text NOT NULL,
	`job_name` text NOT NULL,
	`sql_command` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`last_run_at` integer,
	`next_run_at` integer,
	`run_count` integer DEFAULT 0 NOT NULL,
	`error_count` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scheduled_tasks_job_name_unique` ON `scheduled_tasks` (`job_name`);--> statement-breakpoint
CREATE TABLE `spans` (
	`id` text PRIMARY KEY NOT NULL,
	`trace_id` text NOT NULL,
	`parent_span_id` text,
	`name` text NOT NULL,
	`start_time` integer NOT NULL,
	`end_time` integer,
	`duration_ms` integer,
	`status` text NOT NULL,
	`attributes` text,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`trace_id`) REFERENCES `traces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `system_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`time_range` text,
	`timestamp` integer NOT NULL,
	`cpu_usage` real,
	`memory_usage` real,
	`database_connections` integer,
	`api_requests_per_minute` integer,
	`average_response_time_ms` real,
	`active_users` integer,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `traces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`start_time` integer NOT NULL,
	`end_time` integer,
	`duration_ms` integer,
	`status` text NOT NULL,
	`user_id` text,
	`session_id` text,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
