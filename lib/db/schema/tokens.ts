import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

/**
 * Tokens table - stores information about launched tokens
 * Only successful launches are stored (failed launches are skipped)
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
  logoUrl: text('logo_url').notNull(), // Required - IPFS URL
  metadataUri: text('metadata_uri'), // Metaplex metadata URI

  // Token configuration
  decimals: integer('decimals').notNull().default(9),
  totalSupply: text('total_supply').notNull(), // String for large numbers (supports arbitrary precision)

  // Pool configuration
  initialPrice: real('initial_price').notNull(),
  quoteTokenMint: text('quote_token_mint').notNull(), // Usually SOL wrapped mint
  poolLiquidityPercentage: real('pool_liquidity_percentage').notNull(),
  // Phase 1: Core launch params
  priceRangeMin: real('price_range_min').notNull().default(0.000001),
  priceRangeMax: real('price_range_max').notNull().default(0.0001),

  // Fee configuration
  feeDecayDurationMinutes: integer('fee_decay_duration_minutes').notNull().default(0),
  feeDecayPeriods: integer('fee_decay_periods').notNull().default(0),
  // Phase 1: Fee configuration
  feeSchedulerMode: text('fee_scheduler_mode').notNull().default('market-cap-based'),
  feeTokenMode: text('fee_token_mode').notNull().default('quoteOnly'),
  startingMarketCap: text('starting_market_cap').notNull().default('1000'),
  endingMarketCap: text('ending_market_cap').notNull().default('100000'),
  startRate: real('start_rate').notNull().default(0),
  endRate: real('end_rate').notNull().default(0),
  durationMinutes: integer('duration_minutes').notNull().default(0),
  fixedBaseFeeBps: integer('fixed_base_fee_bps').notNull().default(0),
  // Phase 1: Pool configuration
  holdbackPercentage: real('holdback_percentage').notNull().default(0),

  // Launch timestamps
  launchDate: integer('launch_date', { mode: 'timestamp' }).notNull(), // JavaScript Date object
  launchSlot: integer('launch_slot'), // Solana slot number for exact timing
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),

  // Transaction signatures (all 3 required for successful launch)
  mintTxSignature: text('mint_tx_signature').notNull(),
  metadataTxSignature: text('metadata_tx_signature').notNull(),
  poolTxSignature: text('pool_tx_signature').notNull(),

  // Creator information
  creatorWallet: text('creator_wallet').notNull(),

  // Performance optimization: Snapshot current cumulative fees
  // Updated periodically by the fee update service
  // Used for fast leaderboard queries without joining to pool_stats_history
  cumulativeFeesSnapshot: text('cumulative_fees_snapshot').notNull().default('0'),
  cumulativeFeesUpdatedAt: integer('cumulative_fees_updated_at', { mode: 'timestamp' }),

  // Search optimization - concatenated searchable fields (lowercase)
  // Format: "mintAddress symbol name description creatorWallet"
  // Allows single-query search across all fields
  searchText: text('search_text'),
}, (table) => ({
  // Indexes for common queries
  launchDateIdx: index('launch_date_idx').on(table.launchDate),
  symbolIdx: index('symbol_idx').on(table.symbol),
  creatorIdx: index('creator_wallet_idx').on(table.creatorWallet),
  searchIdx: index('search_text_idx').on(table.searchText),
  cumulativeFeesIdx: index('cumulative_fees_idx').on(table.cumulativeFeesSnapshot),
}));

// TypeScript type inference
export type Token = typeof tokens.$inferSelect;
export type NewToken = typeof tokens.$inferInsert;
