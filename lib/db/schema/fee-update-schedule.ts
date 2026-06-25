import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { tokens } from './tokens';

/**
 * Fee Update Schedule table - tracks when each pool should be updated
 * Implements age-based polling strategy:
 * - 0-1 hour: Update every 1 minute
 * - 1-24 hours: Update every 5 minutes
 * - 24-96 hours: Update every 10 minutes
 * - 96+ hours: Update every 60 minutes
 */
export const feeUpdateSchedule = sqliteTable('fee_update_schedule', {
  // Primary identifier
  id: integer('id').primaryKey({ autoIncrement: true }),

  // Foreign key to tokens table (one-to-one relationship)
  tokenId: integer('token_id')
    .notNull()
    .unique()
    .references(() => tokens.id, { onDelete: 'cascade' }),
  poolAddress: text('pool_address').notNull().unique(),

  // Polling metadata
  lastUpdated: integer('last_updated', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  nextUpdate: integer('next_update', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updateIntervalMinutes: integer('update_interval_minutes').notNull().default(1),

  // Error tracking for monitoring and debugging
  consecutiveFailures: integer('consecutive_failures').notNull().default(0),
  lastError: text('last_error'), // Last error message (if any)
  lastErrorAt: integer('last_error_at', { mode: 'timestamp' }), // When the error occurred

  // Circuit breaker flag — when true, cron skips this pool entirely (D-14/D-15)
  stale: integer('stale', { mode: 'boolean' }).notNull().default(false),
}, (table) => ({
  // Index for efficient polling queries
  // Query pattern: "Get all pools that need updating (nextUpdate <= now)"
  nextUpdateIdx: index('next_update_idx').on(table.nextUpdate),

  // Index for pool lookup
  poolAddressIdx: index('pool_address_idx').on(table.poolAddress),

  // Index for error monitoring
  // Query pattern: "Get all pools with recent failures"
  failuresIdx: index('consecutive_failures_idx').on(table.consecutiveFailures),
}));

// TypeScript type inference
export type FeeUpdateSchedule = typeof feeUpdateSchedule.$inferSelect;
export type NewFeeUpdateSchedule = typeof feeUpdateSchedule.$inferInsert;
