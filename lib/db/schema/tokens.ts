import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

/**
 * Tokens table - stores information about launched tokens
 */
export const tokens = sqliteTable('tokens', {
  // Primary identifier
  id: integer('id').primaryKey({ autoIncrement: true }),

  // Token identifiers (blockchain)
  mintAddress: text('mint_address').notNull().unique(),
  poolAddress: text('pool_address').notNull().unique(),

  // Featured flag for highlighting tokens
  featured: integer('featured', { mode: 'boolean' }).notNull().default(false),

  // Token metadata
  name: text('name').notNull(),
  symbol: text('symbol').notNull(),
  description: text('description'),
  logoUrl: text('logo_url').notNull(),
  metadataUri: text('metadata_uri'),

  // Token configuration
  decimals: integer('decimals').notNull().default(9),
  totalSupply: text('total_supply').notNull(),

  // Pool configuration (market cap-based, replacing price-based)
  initialMarketCap: real('initial_market_cap').notNull(),
  quoteTokenMint: text('quote_token_mint').notNull(),
  poolLiquidityPercentage: real('pool_liquidity_percentage').notNull(),
  marketCapRangeMax: real('market_cap_range_max').notNull().default(1000000),

  // Fee configuration
  feeDecayDurationMinutes: integer('fee_decay_duration_minutes').notNull().default(0),
  feeDecayPeriods: integer('fee_decay_periods').notNull().default(0),
  feeSchedulerMode: text('fee_scheduler_mode').notNull().default('market-cap-based'),
  feeTokenMode: text('fee_token_mode').notNull().default('quoteOnly'),
  startingMarketCap: text('starting_market_cap').notNull().default('10000'),
  endingMarketCap: text('ending_market_cap').notNull().default('100000'),
  // Fee rates stored as percent (e.g., 0.5 = 0.5%), not bps
  startRatePercent: real('start_rate_percent').notNull().default(0.5),
  endRatePercent: real('end_rate_percent').notNull().default(0.25),
  durationMinutes: integer('duration_minutes').notNull().default(0),
  fixedBaseFeePercent: real('fixed_base_fee_percent').notNull().default(0.25),
  // Locked liquidity % (inverse of holdback, default 100% = all to pool)
  lockedLiquidityPercentage: real('locked_liquidity_percentage').notNull().default(100),

  // Launch timestamps
  launchDate: integer('launch_date', { mode: 'timestamp' }).notNull(),
  launchSlot: integer('launch_slot'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),

  // Transaction signatures
  mintTxSignature: text('mint_tx_signature').notNull(),
  metadataTxSignature: text('metadata_tx_signature').notNull(),
  poolTxSignature: text('pool_tx_signature').notNull(),

  // Creator information
  creatorWallet: text('creator_wallet').notNull(),

  // Performance optimization
  cumulativeFeesSnapshot: text('cumulative_fees_snapshot').notNull().default('0'),
  cumulativeFeesUpdatedAt: integer('cumulative_fees_updated_at', { mode: 'timestamp' }),

  // Search optimization
  searchText: text('search_text'),
}, (table) => ({
  launchDateIdx: index('launch_date_idx').on(table.launchDate),
  symbolIdx: index('symbol_idx').on(table.symbol),
  creatorIdx: index('creator_wallet_idx').on(table.creatorWallet),
  searchIdx: index('search_text_idx').on(table.searchText),
  cumulativeFeesIdx: index('cumulative_fees_idx').on(table.cumulativeFeesSnapshot),
}));

export type Token = typeof tokens.$inferSelect;
export type NewToken = typeof tokens.$inferInsert;
