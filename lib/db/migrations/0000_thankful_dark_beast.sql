CREATE TABLE `tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mint_address` text NOT NULL,
	`pool_address` text NOT NULL,
	`name` text NOT NULL,
	`symbol` text NOT NULL,
	`description` text,
	`logo_url` text NOT NULL,
	`metadata_uri` text,
	`decimals` integer DEFAULT 9 NOT NULL,
	`total_supply` text NOT NULL,
	`initial_price` real NOT NULL,
	`quote_token_mint` text NOT NULL,
	`pool_liquidity_percentage` real NOT NULL,
	`fee_decay_duration_minutes` integer NOT NULL,
	`fee_decay_periods` integer NOT NULL,
	`launch_date` integer NOT NULL,
	`launch_slot` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`mint_tx_signature` text NOT NULL,
	`metadata_tx_signature` text NOT NULL,
	`pool_tx_signature` text NOT NULL,
	`creator_wallet` text NOT NULL,
	`cumulative_fees_snapshot` text DEFAULT '0' NOT NULL,
	`cumulative_fees_updated_at` integer,
	`search_text` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tokens_mint_address_unique` ON `tokens` (`mint_address`);--> statement-breakpoint
CREATE UNIQUE INDEX `tokens_pool_address_unique` ON `tokens` (`pool_address`);--> statement-breakpoint
CREATE INDEX `launch_date_idx` ON `tokens` (`launch_date`);--> statement-breakpoint
CREATE INDEX `symbol_idx` ON `tokens` (`symbol`);--> statement-breakpoint
CREATE INDEX `creator_wallet_idx` ON `tokens` (`creator_wallet`);--> statement-breakpoint
CREATE INDEX `search_text_idx` ON `tokens` (`search_text`);--> statement-breakpoint
CREATE INDEX `cumulative_fees_idx` ON `tokens` (`cumulative_fees_snapshot`);--> statement-breakpoint
CREATE TABLE `pool_stats_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token_id` integer NOT NULL,
	`pool_address` text NOT NULL,
	`total_fees_generated` text DEFAULT '0' NOT NULL,
	`fees_24h` text DEFAULT '0' NOT NULL,
	`fees_7d` text,
	`fees_30d` text,
	`volume_24h` text,
	`volume_7d` text,
	`volume_30d` text,
	`current_liquidity` text,
	`current_price` real,
	`current_price_usd` real,
	`price_change_24h` real,
	`apr` real,
	`apy` real,
	`snapshot_at` integer NOT NULL,
	FOREIGN KEY (`token_id`) REFERENCES `tokens`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pool_time_idx` ON `pool_stats_history` (`pool_address`,`snapshot_at`);--> statement-breakpoint
CREATE INDEX `token_time_idx` ON `pool_stats_history` (`token_id`,`snapshot_at`);--> statement-breakpoint
CREATE INDEX `snapshot_at_idx` ON `pool_stats_history` (`snapshot_at`);--> statement-breakpoint
CREATE TABLE `fee_update_schedule` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token_id` integer NOT NULL,
	`pool_address` text NOT NULL,
	`last_updated` integer NOT NULL,
	`next_update` integer NOT NULL,
	`update_interval_minutes` integer DEFAULT 1 NOT NULL,
	`consecutive_failures` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`last_error_at` integer,
	FOREIGN KEY (`token_id`) REFERENCES `tokens`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fee_update_schedule_token_id_unique` ON `fee_update_schedule` (`token_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `fee_update_schedule_pool_address_unique` ON `fee_update_schedule` (`pool_address`);--> statement-breakpoint
CREATE INDEX `next_update_idx` ON `fee_update_schedule` (`next_update`);--> statement-breakpoint
CREATE INDEX `pool_address_idx` ON `fee_update_schedule` (`pool_address`);--> statement-breakpoint
CREATE INDEX `consecutive_failures_idx` ON `fee_update_schedule` (`consecutive_failures`);