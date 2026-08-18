CREATE TABLE `roles` (
	`id` varchar(36) NOT NULL,
	`name` varchar(50) NOT NULL,
	`label` varchar(100) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `system_state` (
	`key` varchar(100) NOT NULL,
	`value` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_state_key` PRIMARY KEY(`key`),
	CONSTRAINT `system_state_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`user_id` varchar(36) NOT NULL,
	`role_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_roles_pk` PRIMARY KEY(`user_id`,`role_id`)
);
--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `user_roles_user_id_idx` ON `user_roles` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_roles_role_id_idx` ON `user_roles` (`role_id`);