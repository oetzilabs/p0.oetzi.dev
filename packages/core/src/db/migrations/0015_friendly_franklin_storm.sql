CREATE TABLE `server_has_server_tag` (
	`server_id` text NOT NULL,
	`server_tag_id` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `server_tags` (
	`title` text NOT NULL,
	`hidden` integer DEFAULT false NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`deleted_at` integer
);
