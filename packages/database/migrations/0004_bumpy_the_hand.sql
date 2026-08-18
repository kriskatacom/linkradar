CREATE TABLE `sites` (
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`name` varchar(150) NOT NULL,
	`url` varchar(2048) NOT NULL,
	`normalized_url` varchar(700) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`last_scanned_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	CONSTRAINT `sites_id` PRIMARY KEY(`id`),
	CONSTRAINT `sites_workspace_normalized_url_unique` UNIQUE(`workspace_id`,`normalized_url`)
);
--> statement-breakpoint
CREATE TABLE `workspace_members` (
	`workspace_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`role` varchar(30) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workspace_members_pk` PRIMARY KEY(`workspace_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` varchar(36) NOT NULL,
	`name` varchar(150) NOT NULL,
	`slug` varchar(180) NOT NULL,
	`owner_user_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	CONSTRAINT `workspaces_id` PRIMARY KEY(`id`),
	CONSTRAINT `workspaces_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `sites` ADD CONSTRAINT `sites_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workspace_members` ADD CONSTRAINT `workspace_members_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workspace_members` ADD CONSTRAINT `workspace_members_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workspaces` ADD CONSTRAINT `workspaces_owner_user_id_users_id_fk` FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `sites_workspace_id_idx` ON `sites` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `sites_deleted_at_idx` ON `sites` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `workspace_members_workspace_id_idx` ON `workspace_members` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `workspace_members_user_id_idx` ON `workspace_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `workspaces_owner_user_id_idx` ON `workspaces` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `workspaces_deleted_at_idx` ON `workspaces` (`deleted_at`);