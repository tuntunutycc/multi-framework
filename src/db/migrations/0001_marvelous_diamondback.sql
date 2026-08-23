ALTER TABLE `users` ADD `is_superadmin` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `requires_password_change` integer DEFAULT false NOT NULL;