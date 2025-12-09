CREATE TABLE `decks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`link` text,
	`color` text DEFAULT '#ffffff' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `duel_rooms` ADD `player1_deck_id` integer REFERENCES decks(id);--> statement-breakpoint
ALTER TABLE `duel_rooms` ADD `player2_deck_id` integer REFERENCES decks(id);--> statement-breakpoint
ALTER TABLE `participants` ADD `deck_id` integer REFERENCES decks(id);