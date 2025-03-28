PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_servers` (
	`name` text NOT NULL,
	`url` text NOT NULL,
	`status` text DEFAULT 'unknown' NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`deleted_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_servers`("name", "url", "status", "id", "created_at", "updated_at", "deleted_at") SELECT "name", "url", "status", "id", "created_at", "updated_at", "deleted_at" FROM `servers`;--> statement-breakpoint
DROP TABLE `servers`;--> statement-breakpoint
ALTER TABLE `__new_servers` RENAME TO `servers`;--> statement-breakpoint
PRAGMA foreign_keys=ON;