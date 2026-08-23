CREATE TABLE `site_content` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`block_type` text NOT NULL,
	`data_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `site_content_tenant_id_idx` ON `site_content` (`tenant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `site_content_tenant_block_uidx` ON `site_content` (`tenant_id`,`block_type`);--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`slug` text NOT NULL,
	`domain` text NOT NULL,
	`theme_config` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenants_slug_uidx` ON `tenants` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `tenants_domain_uidx` ON `tenants` (`domain`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`tenant_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_uidx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_tenant_id_idx` ON `users` (`tenant_id`);