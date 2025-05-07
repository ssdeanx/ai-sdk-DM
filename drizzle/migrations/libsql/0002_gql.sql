CREATE TABLE `gql_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`query` text NOT NULL,
	`variables` text,
	`response` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
