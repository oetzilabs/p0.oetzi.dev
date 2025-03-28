PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_server_has_server_tag` (
	`server_id` text NOT NULL,
	`server_tag_id` text NOT NULL,
	PRIMARY KEY(`server_id`, `server_tag_id`),
	FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`server_tag_id`) REFERENCES `server_tags`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_server_has_server_tag`("server_id", "server_tag_id") SELECT "server_id", "server_tag_id" FROM `server_has_server_tag`;--> statement-breakpoint
DROP TABLE `server_has_server_tag`;--> statement-breakpoint
ALTER TABLE `__new_server_has_server_tag` RENAME TO `server_has_server_tag`;--> statement-breakpoint
PRAGMA foreign_keys=ON;