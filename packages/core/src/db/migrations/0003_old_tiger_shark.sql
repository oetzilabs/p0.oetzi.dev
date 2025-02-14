PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_servers` (
	`name` text NOT NULL,
	`url` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`deleted_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_servers`("name", "url", "id", "created_at", "updated_at", "deleted_at") SELECT "name", "url", "id", "created_at", "updated_at", "deleted_at" FROM `servers`;--> statement-breakpoint
DROP TABLE `servers`;--> statement-breakpoint
ALTER TABLE `__new_servers` RENAME TO `servers`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_load_balancers` (
	`url` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`deleted_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_load_balancers`("url", "id", "created_at", "updated_at", "deleted_at") SELECT "url", "id", "created_at", "updated_at", "deleted_at" FROM `load_balancers`;--> statement-breakpoint
DROP TABLE `load_balancers`;--> statement-breakpoint
ALTER TABLE `__new_load_balancers` RENAME TO `load_balancers`;--> statement-breakpoint
CREATE TABLE `__new_brokers` (
	`url` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`deleted_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_brokers`("url", "id", "created_at", "updated_at", "deleted_at") SELECT "url", "id", "created_at", "updated_at", "deleted_at" FROM `brokers`;--> statement-breakpoint
DROP TABLE `brokers`;--> statement-breakpoint
ALTER TABLE `__new_brokers` RENAME TO `brokers`;