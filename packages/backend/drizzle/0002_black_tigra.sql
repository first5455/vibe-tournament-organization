CREATE TABLE `duel_rooms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`player1_id` integer NOT NULL,
	`player2_id` integer,
	`winner_id` integer,
	`result` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`player1_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player2_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`winner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `tournaments` ADD `type` text DEFAULT 'swiss' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `color` text DEFAULT '#ffffff';--> statement-breakpoint
ALTER TABLE `users` ADD `avatar_url` text;