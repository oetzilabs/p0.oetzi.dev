CREATE TABLE `machine_configs` (
	`vcpu_count` integer NOT NULL,
	`mem_size_mib` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `boot_sources` (
	`kernel_image_path` text NOT NULL,
	`initrd_path` text,
	`boot_args` text,
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `virtual_machines` (
	`type` text DEFAULT 'jailed_vm' NOT NULL,
	`jailed` integer DEFAULT true NOT NULL,
	`boot_source_id` text NOT NULL,
	`machine_config_id` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`deleted_at` integer,
	FOREIGN KEY (`boot_source_id`) REFERENCES `boot_sources`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`machine_config_id`) REFERENCES `machine_configs`(`id`) ON UPDATE no action ON DELETE no action
);
