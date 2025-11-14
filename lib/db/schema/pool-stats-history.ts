import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { tokens } from './tokens';

/**
 * Pool Stats History table - stores historical fee and trading statistics
 * Snapshots are taken periodically based on token age (age-based polling)
 * Used for:
 * - Historical charts and analytics
 * - Calculating cumulative fees for tokens > 30 days old
 * - Time-series data for pool performance
 */
export const poolStatsHistory = sqliteTable('pool_stats_history', {
  // Primary identifier
  id: integer('id').primaryKey({ autoIncrement: true }),

  // Foreign key to tokens table
  tokenId: integer('token_id')
    .notNull()
    .references(() => tokens.id, { onDelete: 'cascade' }),
  poolAddress: text('pool_address').notNull(),

  // Fee metrics from Meteora API
  // Note: Meteora API only provides 30-day history
  // For older tokens, we use these snapshots to calculate cumulative fees
  totalFeesGenerated: text('total_fees_generated').notNull().default('0'), // Cumulative fees in quote token
  fees24h: text('fees_24h').notNull().default('0'), // Fees in last 24 hours
  fees7d: text('fees_7d'), // Fees in last 7 days (if available)
  fees30d: text('fees_30d'), // Fees in last 30 days (if available)

  // Volume metrics (in quote token, usually SOL)
  volume24h: text('volume_24h'),
  volume7d: text('volume_7d'),
  volume30d: text('volume_30d'),

  // Liquidity metrics
  currentLiquidity: text('current_liquidity'), // Total liquidity in pool

  // Price metrics
  currentPrice: real('current_price'), // Price in quote token (SOL)
  currentPriceUsd: real('current_price_usd'), // Price in USD (from Meteora)
  priceChange24h: real('price_change_24h'), // 24h price change percentage

  // APR/APY metrics (if available from Meteora)
  apr: real('apr'), // Annual Percentage Rate
  apy: real('apy'), // Annual Percentage Yield

  // Snapshot timestamp
  snapshotAt: integer('snapshot_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  // Composite indexes for efficient time-series queries
  // Query pattern: "Get all snapshots for a specific pool ordered by time"
  poolTimeIdx: index('pool_time_idx').on(table.poolAddress, table.snapshotAt),

  // Query pattern: "Get all snapshots for a specific token ordered by time"
  tokenTimeIdx: index('token_time_idx').on(table.tokenId, table.snapshotAt),

  // Index for cleanup queries (e.g., delete old snapshots)
  snapshotAtIdx: index('snapshot_at_idx').on(table.snapshotAt),
}));

// TypeScript type inference
export type PoolStatsHistory = typeof poolStatsHistory.$inferSelect;
export type NewPoolStatsHistory = typeof poolStatsHistory.$inferInsert;
