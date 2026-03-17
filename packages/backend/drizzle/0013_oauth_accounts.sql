CREATE TABLE IF NOT EXISTS `oauth_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`email` text,
	`display_name` text,
	`avatar_url` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
