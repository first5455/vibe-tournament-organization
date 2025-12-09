ALTER TABLE `duel_rooms` ADD `first_player_id` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `matches` ADD `first_player_id` integer REFERENCES participants(id);