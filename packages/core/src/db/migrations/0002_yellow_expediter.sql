CREATE TABLE `load_balancers` (
	`url` text,
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `brokers` (
	`url` text,
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`deleted_at` integer
);
