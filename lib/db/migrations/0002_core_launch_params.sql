ALTER TABLE tokens ADD COLUMN price_range_min REAL NOT NULL DEFAULT 0.000001;--> statement-breakpoint
ALTER TABLE tokens ADD COLUMN price_range_max REAL NOT NULL DEFAULT 0.0001;
