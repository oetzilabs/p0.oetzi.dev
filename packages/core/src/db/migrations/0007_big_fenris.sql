CREATE TABLE `server_brokers` (
	`server_id` text NOT NULL,
	`broker_id` text NOT NULL,
	FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`broker_id`) REFERENCES `brokers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `server_brokers_uid` ON `server_brokers` (`server_id`,`broker_id`);