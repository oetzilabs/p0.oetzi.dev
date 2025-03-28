ALTER TABLE `machine_configs` ADD `name` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `machine_configs_name_unique` ON `machine_configs` (`name`);--> statement-breakpoint
ALTER TABLE `boot_sources` ADD `name` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `boot_sources_name_unique` ON `boot_sources` (`name`);--> statement-breakpoint
ALTER TABLE `virtual_machines` ADD `status` text DEFAULT 'unknown';