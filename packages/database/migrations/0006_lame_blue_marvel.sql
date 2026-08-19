CREATE TABLE `email_verification_tokens` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`token_hash` varchar(255) NOT NULL,
	`expires_at` datetime NOT NULL,
	`used_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_verification_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_verification_tokens_token_hash_idx` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`token_hash` varchar(255) NOT NULL,
	`expires_at` datetime NOT NULL,
	`used_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_token_hash_idx` UNIQUE(`token_hash`)
);
--> statement-breakpoint
ALTER TABLE `email_verification_tokens` ADD CONSTRAINT `email_verification_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `email_verification_tokens_user_id_idx` ON `email_verification_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `email_verification_tokens_expires_at_idx` ON `email_verification_tokens` (`expires_at`);--> statement-breakpoint
CREATE INDEX `password_reset_tokens_user_id_idx` ON `password_reset_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `password_reset_tokens_expires_at_idx` ON `password_reset_tokens` (`expires_at`);