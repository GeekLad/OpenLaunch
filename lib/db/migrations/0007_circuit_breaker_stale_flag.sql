-- Phase 6: Circuit breaker stale flag on fee_update_schedule
-- Boolean columns in SQLite are stored as INTEGER (0/1); drizzle-kit emits
-- `integer({ mode: 'boolean' })` columns as `ADD COLUMN ... INTEGER NOT NULL DEFAULT 0`.

ALTER TABLE `fee_update_schedule` ADD COLUMN `stale` integer NOT NULL DEFAULT 0;