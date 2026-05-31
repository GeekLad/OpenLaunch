-- Phase cleanup: Drop obsolete columns replaced by market-cap-based parameters
-- SQLite 3.35.0+ supports DROP COLUMN; this project runs 3.46.1.

ALTER TABLE `tokens` DROP COLUMN `initial_price`;
ALTER TABLE `tokens` DROP COLUMN `price_range_min`;
ALTER TABLE `tokens` DROP COLUMN `price_range_max`;
ALTER TABLE `tokens` DROP COLUMN `start_rate`;
ALTER TABLE `tokens` DROP COLUMN `end_rate`;
ALTER TABLE `tokens` DROP COLUMN `fixed_base_fee_bps`;
ALTER TABLE `tokens` DROP COLUMN `holdback_percentage`;
