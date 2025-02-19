CREATE TABLE `brokers_load_balancers` (
	`broker_id` text NOT NULL,
	`load_balancer_id` text NOT NULL,
	FOREIGN KEY (`broker_id`) REFERENCES `brokers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`load_balancer_id`) REFERENCES `servers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `brokers_load_balancers_uid` ON `brokers_load_balancers` (`broker_id`,`load_balancer_id`);