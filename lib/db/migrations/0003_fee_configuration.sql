ALTER TABLE tokens ADD COLUMN fee_scheduler_mode TEXT NOT NULL DEFAULT 'market-cap-based';--> statement-breakpoint
ALTER TABLE tokens ADD COLUMN fee_token_mode TEXT NOT NULL DEFAULT 'quoteOnly';--> statement-breakpoint
ALTER TABLE tokens ADD COLUMN starting_market_cap TEXT NOT NULL DEFAULT '0';--> statement-breakpoint
ALTER TABLE tokens ADD COLUMN ending_market_cap TEXT NOT NULL DEFAULT '0';--> statement-breakpoint
ALTER TABLE tokens ADD COLUMN start_rate REAL NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE tokens ADD COLUMN end_rate REAL NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE tokens ADD COLUMN duration_minutes INTEGER NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE tokens ADD COLUMN fixed_base_fee_bps INTEGER NOT NULL DEFAULT 0;
