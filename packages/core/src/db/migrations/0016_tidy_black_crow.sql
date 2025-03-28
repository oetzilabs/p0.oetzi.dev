PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_server_has_server_tag` (
	`server_id` text NOT NULL,
	`server_tag_id` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`deleted_at` integer,
	FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`server_tag_id`) REFERENCES `server_tags`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_server_has_server_tag`("server_id", "server_tag_id", "id", "created_at", "updated_at", "deleted_at") SELECT "server_id", "server_tag_id", "id", "created_at", "updated_at", "deleted_at" FROM `server_has_server_tag`;--> statement-breakpoint
DROP TABLE `server_has_server_tag`;--> statement-breakpoint
ALTER TABLE `__new_server_has_server_tag` RENAME TO `server_has_server_tag`;--> statement-breakpoint
PRAGMA foreign_keys=ON;