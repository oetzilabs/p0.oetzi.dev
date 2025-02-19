ALTER TABLE `actors` ADD `name` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `actors_name_unique` ON `actors` (`name`);