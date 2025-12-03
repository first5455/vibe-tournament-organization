PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_matches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tournament_id` integer NOT NULL,
	`round_number` integer NOT NULL,
	`player1_id` integer,
	`player2_id` integer,
	`winner_id` integer,
	`result` text,
	`is_bye` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player1_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player2_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`winner_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_matches`("id", "tournament_id", "round_number", "player1_id", "player2_id", "winner_id", "result", "is_bye", "created_at") SELECT "id", "tournament_id", "round_number", "player1_id", "player2_id", "winner_id", "result", "is_bye", "created_at" FROM `matches`;--> statement-breakpoint
DROP TABLE `matches`;--> statement-breakpoint
ALTER TABLE `__new_matches` RENAME TO `matches`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_participants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tournament_id` integer NOT NULL,
	`user_id` integer,
	`guest_name` text,
	`score` integer DEFAULT 0 NOT NULL,
	`tie_breakers` text DEFAULT '{"buchholz":0}',
	`dropped` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_participants`("id", "tournament_id", "user_id", "guest_name", "score", "tie_breakers", "dropped") SELECT "id", "tournament_id", "user_id", "guest_name", "score", "tie_breakers", "dropped" FROM `participants`;--> statement-breakpoint
DROP TABLE `participants`;--> statement-breakpoint
ALTER TABLE `__new_participants` RENAME TO `participants`;--> statement-breakpoint
ALTER TABLE `tournaments` ADD `start_date` text;--> statement-breakpoint
ALTER TABLE `tournaments` ADD `end_date` text;--> statement-breakpoint
ALTER TABLE `users` ADD `security_question` text;--> statement-breakpoint
ALTER TABLE `users` ADD `security_answer_hash` text;