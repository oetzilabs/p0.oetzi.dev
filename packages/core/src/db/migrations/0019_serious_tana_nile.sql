CREATE TABLE `virtual_machine_snapshots` (
	`vm_id` text NOT NULL,
	`server_id` text NOT NULL,
	`snapshot_path` text NOT NULL,
	`mem_file_path` text NOT NULL,
	`snapshot_type` text NOT NULL,
	`snapshot_version` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`deleted_at` integer,
	FOREIGN KEY (`vm_id`) REFERENCES `virtual_machines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON UPDATE no action ON DELETE no action
);
