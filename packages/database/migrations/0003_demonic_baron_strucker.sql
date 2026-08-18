ALTER TABLE `roles` ADD `is_system` boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE `roles` SET `is_system` = true WHERE `name` IN ('admin', 'user');