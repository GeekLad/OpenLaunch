-- Phase 5.1: Add market cap and locked liquidity columns, rename fee rate columns

-- Add new columns for market-cap-based pool params
ALTER TABLE `tokens` ADD COLUMN `initial_market_cap` real NOT NULL DEFAULT 10000;
ALTER TABLE `tokens` ADD COLUMN `market_cap_range_min` real NOT NULL DEFAULT 1000;
ALTER TABLE `tokens` ADD COLUMN `market_cap_range_max` real NOT NULL DEFAULT 1000000;

-- Add new percent-based fee rate columns
ALTER TABLE `tokens` ADD COLUMN `start_rate_percent` real NOT NULL DEFAULT 0.5;
ALTER TABLE `tokens` ADD COLUMN `end_rate_percent` real NOT NULL DEFAULT 0.25;
ALTER TABLE `tokens` ADD COLUMN `fixed_base_fee_percent` real NOT NULL DEFAULT 0.25;

-- Add locked liquidity column (inverse of holdback, default 100%)
ALTER TABLE `tokens` ADD COLUMN `locked_liquidity_percentage` real NOT NULL DEFAULT 100;

-- NOTE: Old columns (initial_price, price_range_min, price_range_max, start_rate,
-- end_rate, fixed_base_fee_bps, holdback_percentage) remain for backward compatibility
-- but are no longer used by the application. They can be dropped in a future cleanup migration.
