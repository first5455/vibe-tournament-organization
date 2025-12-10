ALTER TABLE `user_game_stats` ADD `duel_wins` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_game_stats` ADD `duel_losses` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_game_stats` ADD `duel_draws` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_game_stats` ADD `tournament_wins` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_game_stats` ADD `tournament_losses` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_game_stats` ADD `tournament_draws` integer DEFAULT 0 NOT NULL;