import { db } from './client';
import { tokens, poolStatsHistory, feeUpdateSchedule } from './schema';
import type { Token, PoolStatsHistory, FeeUpdateSchedule } from './schema';
import { eq, desc, asc, like, or, and, lt, lte, gt, gte, sql } from 'drizzle-orm';
import { calculateNextUpdateTime } from '@/lib/meteora/polling-strategy';

/**
 * Database Service Layer
 * Provides database-agnostic operations for tokens, pool stats, and fee updates
 * This abstraction allows easy migration to different databases
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface TokenCreateInput {
  // Token identifiers
  mintAddress: string;
  poolAddress: string;

  // Token metadata
  name: string;
  symbol: string;
  description?: string;
  logoUrl: string;
  metadataUri?: string;

  // Token configuration
  decimals: number;
  totalSupply: string;

  // Pool configuration
  initialMarketCap: number;
  quoteTokenMint: string;
  poolLiquidityPercentage: number;
  marketCapRangeMax: number;

  // Fee configuration
  feeDecayDurationMinutes?: number;
  feeDecayPeriods?: number;
  feeSchedulerMode: string;
  feeTokenMode: string;
  startingMarketCap: string;
  endingMarketCap: string;
  startRatePercent: number;
  endRatePercent: number;
  durationMinutes: number;
  fixedBaseFeePercent: number;
  lockedLiquidityPercentage: number;

  // Launch info
  launchDate: Date;
  launchSlot?: number;

  // Transaction signatures
  mintTxSignature: string;
  metadataTxSignature: string;
  poolTxSignature: string;

  // Creator
  creatorWallet: string;
}

export interface TokenListParams {
  offset?: number;
  limit?: number;
  sortBy?: 'launchDate' | 'cumulativeFees';
  sortOrder?: 'asc' | 'desc';
  filter?: {
    creatorWallet?: string;
  };
}

export interface PaginatedTokens {
  tokens: Token[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface PoolStatsInput {
  totalFeesGenerated?: string;
  fees24h?: string;
  fees7d?: string;
  fees30d?: string;
  volume24h?: string;
  volume7d?: string;
  volume30d?: string;
  currentLiquidity?: string;
  apr?: number;
  apy?: number;
}

export interface LeaderboardEntry {
  id: number;
  name: string;
  symbol: string;
  logoUrl: string;
  mintAddress: string;
  poolAddress: string;
  cumulativeFees: string;
  launchDate: Date;
  fees24h?: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate searchable text from token data
 * Used for efficient full-text search across multiple fields
 */
export function generateSearchText(data: {
  mintAddress: string;
  symbol: string;
  name: string;
  description?: string;
  creatorWallet: string;
}): string {
  return [
    data.mintAddress.toLowerCase(),
    data.symbol.toLowerCase(),
    data.name.toLowerCase(),
    data.description?.toLowerCase() || '',
    data.creatorWallet.toLowerCase(),
  ]
    .filter(Boolean)
    .join(' ');
}

// ============================================================================
// Token Operations
// ============================================================================

/**
 * Create a new token record
 * Only called for successful launches (failed launches are skipped)
 */
export async function createToken(data: TokenCreateInput): Promise<Token> {
  const searchText = generateSearchText(data);

  const [token] = await db
    .insert(tokens)
    .values({
      ...data,
      searchText,
      cumulativeFeesSnapshot: '0',
    })
    .returning();

  // Initialize fee update schedule for the new token
  const { nextUpdate, intervalMinutes } = calculateNextUpdateTime(data.launchDate);
  await upsertFeeUpdateSchedule(
    token.id,
    data.poolAddress,
    nextUpdate,
    intervalMinutes
  );

  return token;
}

/**
 * Get token by mint address
 */
export async function getToken(mintAddress: string): Promise<Token | null> {
  const [token] = await db
    .select()
    .from(tokens)
    .where(eq(tokens.mintAddress, mintAddress))
    .limit(1);

  return token || null;
}

/**
 * Get token by pool address
 */
export async function getTokenByPoolAddress(poolAddress: string): Promise<Token | null> {
  const [token] = await db
    .select()
    .from(tokens)
    .where(eq(tokens.poolAddress, poolAddress))
    .limit(1);

  return token || null;
}

/**
 * Get token by ID
 */
export async function getTokenById(id: number): Promise<Token | null> {
  const [token] = await db
    .select()
    .from(tokens)
    .where(eq(tokens.id, id))
    .limit(1);

  return token || null;
}

/**
 * List tokens with pagination and sorting
 */
export async function listTokens(params: TokenListParams = {}): Promise<PaginatedTokens> {
  const {
    offset = 0,
    limit = 20,
    sortBy = 'launchDate',
    sortOrder = 'desc',
    filter = {},
  } = params;

  // Build WHERE clause
  const whereConditions = [];
  if (filter.creatorWallet) {
    whereConditions.push(eq(tokens.creatorWallet, filter.creatorWallet));
  }

  // Build ORDER BY clause
  const orderByColumn = sortBy === 'cumulativeFees' ? tokens.cumulativeFeesSnapshot : tokens.launchDate;
  const orderByDirection = sortOrder === 'asc' ? asc : desc;

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(tokens)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

  // Get paginated results
  const results = await db
    .select()
    .from(tokens)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    .orderBy(desc(tokens.featured), orderByDirection(orderByColumn), desc(tokens.launchDate)) // Featured first, then sort, then newest
    .limit(limit)
    .offset(offset);

  return {
    tokens: results,
    total: count,
    offset,
    limit,
    hasMore: offset + results.length < count,
  };
}

/**
 * Search tokens by query string
 * Searches across mint address, symbol, name, description, and creator wallet
 */
export async function searchTokens(query: string, limit: number = 20): Promise<Token[]> {
  const searchTerm = query.toLowerCase().trim();

  if (!searchTerm) {
    return [];
  }

  return await db
    .select()
    .from(tokens)
    .where(
      or(
        like(tokens.searchText, `%${searchTerm}%`),
        eq(tokens.mintAddress, query), // Exact mint address match
        eq(tokens.creatorWallet, query) // Exact creator match
      )
    )
    .orderBy(desc(tokens.launchDate))
    .limit(limit);
}

/**
 * Update token's cumulative fees snapshot
 * Used by fee updater service for fast leaderboard queries
 */
export async function updateCumulativeFeesSnapshot(
  mintAddress: string,
  cumulativeFees: string
): Promise<void> {
  await db
    .update(tokens)
    .set({
      cumulativeFeesSnapshot: cumulativeFees,
      cumulativeFeesUpdatedAt: new Date(),
    })
    .where(eq(tokens.mintAddress, mintAddress));
}

// ============================================================================
// Pool Stats History Operations
// ============================================================================

/**
 * Create a new pool stats snapshot
 */
export async function createPoolStatsSnapshot(
  tokenId: number,
  poolAddress: string,
  stats: PoolStatsInput
): Promise<PoolStatsHistory> {
  const [snapshot] = await db
    .insert(poolStatsHistory)
    .values({
      tokenId,
      poolAddress,
      ...stats,
    })
    .returning();

  return snapshot;
}

/**
 * Get latest pool stats snapshot
 */
export async function getLatestPoolStats(poolAddress: string): Promise<PoolStatsHistory | null> {
  const [snapshot] = await db
    .select()
    .from(poolStatsHistory)
    .where(eq(poolStatsHistory.poolAddress, poolAddress))
    .orderBy(desc(poolStatsHistory.snapshotAt))
    .limit(1);

  return snapshot || null;
}

/**
 * Get pool stats history for a specific time range
 */
export async function getPoolStatsHistory(
  poolAddress: string,
  startDate: Date,
  endDate: Date
): Promise<PoolStatsHistory[]> {
  return await db
    .select()
    .from(poolStatsHistory)
    .where(
      and(
        eq(poolStatsHistory.poolAddress, poolAddress),
        gte(poolStatsHistory.snapshotAt, startDate),
        lt(poolStatsHistory.snapshotAt, endDate)
      )
    )
    .orderBy(asc(poolStatsHistory.snapshotAt));
}

/**
 * Get oldest snapshot for a token (used for cumulative fee calculation)
 */
export async function getOldestPoolSnapshot(tokenId: number): Promise<PoolStatsHistory | null> {
  const [snapshot] = await db
    .select()
    .from(poolStatsHistory)
    .where(eq(poolStatsHistory.tokenId, tokenId))
    .orderBy(asc(poolStatsHistory.snapshotAt))
    .limit(1);

  return snapshot || null;
}

/**
 * Get most recent snapshot older than 30 days (for cumulative fee calculation)
 */
export async function getSnapshotBefore30Days(tokenId: number): Promise<PoolStatsHistory | null> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [snapshot] = await db
    .select()
    .from(poolStatsHistory)
    .where(
      and(
        eq(poolStatsHistory.tokenId, tokenId),
        lt(poolStatsHistory.snapshotAt, thirtyDaysAgo)
      )
    )
    .orderBy(desc(poolStatsHistory.snapshotAt))
    .limit(1);

  return snapshot || null;
}

// ============================================================================
// Fee Update Schedule Operations
// ============================================================================

/**
 * Create or update fee update schedule
 */
export async function upsertFeeUpdateSchedule(
  tokenId: number,
  poolAddress: string,
  nextUpdate: Date,
  updateIntervalMinutes: number
): Promise<FeeUpdateSchedule> {
  // Try to get existing schedule
  const [existing] = await db
    .select()
    .from(feeUpdateSchedule)
    .where(eq(feeUpdateSchedule.tokenId, tokenId))
    .limit(1);

  if (existing) {
    // Update existing
    const [updated] = await db
      .update(feeUpdateSchedule)
      .set({
        lastUpdated: new Date(),
        nextUpdate,
        updateIntervalMinutes,
        consecutiveFailures: 0,
        lastError: null,
      })
      .where(eq(feeUpdateSchedule.tokenId, tokenId))
      .returning();

    return updated;
  } else {
    // Create new
    const [created] = await db
      .insert(feeUpdateSchedule)
      .values({
        tokenId,
        poolAddress,
        lastUpdated: new Date(),
        nextUpdate,
        updateIntervalMinutes,
      })
      .returning();

    return created;
  }
}

/**
 * Get all pools that need updating (nextUpdate <= now)
 */
export async function getPoolsDueForUpdate(limit: number = 50): Promise<FeeUpdateSchedule[]> {
  const now = new Date();

  return await db
    .select()
    .from(feeUpdateSchedule)
    .where(lt(feeUpdateSchedule.nextUpdate, now))
    .orderBy(asc(feeUpdateSchedule.nextUpdate))
    .limit(limit);
}

/**
 * Record a failed update attempt
 */
export async function recordUpdateFailure(
  tokenId: number,
  error: string
): Promise<void> {
  await db
    .update(feeUpdateSchedule)
    .set({
      consecutiveFailures: sql`${feeUpdateSchedule.consecutiveFailures} + 1`,
      lastError: error,
      lastErrorAt: new Date(),
    })
    .where(eq(feeUpdateSchedule.tokenId, tokenId));
}

/**
 * Get fee update schedule for a specific token
 */
export async function getFeeUpdateSchedule(tokenId: number): Promise<FeeUpdateSchedule | null> {
  const [schedule] = await db
    .select()
    .from(feeUpdateSchedule)
    .where(eq(feeUpdateSchedule.tokenId, tokenId))
    .limit(1);

  return schedule || null;
}

// ============================================================================
// Leaderboard Operations
// ============================================================================

/**
 * Get fee leaderboard
 * Sorted by cumulative fees (descending), then by launch date (newest first) for tiebreaker
 */
export async function getLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
  const results = await db
    .select({
      id: tokens.id,
      name: tokens.name,
      symbol: tokens.symbol,
      logoUrl: tokens.logoUrl,
      mintAddress: tokens.mintAddress,
      poolAddress: tokens.poolAddress,
      cumulativeFees: tokens.cumulativeFeesSnapshot,
      launchDate: tokens.launchDate,
    })
    .from(tokens)
    .orderBy(
      desc(tokens.featured),
      desc(tokens.cumulativeFeesSnapshot),
      desc(tokens.launchDate) // Tiebreaker: newest first
    )
    .limit(limit);

  // Join with latest pool stats to get 24h fees
  const leaderboard: LeaderboardEntry[] = [];

  for (const token of results) {
    const latestStats = await getLatestPoolStats(token.poolAddress);

    leaderboard.push({
      ...token,
      fees24h: latestStats?.fees24h,
    });
  }

  return leaderboard;
}

/**
 * Get tokens sorted by launch date
 */
export async function getTokensByDate(
  limit: number = 20,
  offset: number = 0,
  sortOrder: 'asc' | 'desc' = 'desc',
  statusFilter?: 'all' | 'live' | 'upcoming'
): Promise<Token[]> {
  const orderByDirection = sortOrder === 'asc' ? asc : desc;
  const now = new Date();

  // Build WHERE conditions
  const whereConditions = [];
  if (statusFilter === 'live') {
    whereConditions.push(lte(tokens.launchDate, now));
  } else if (statusFilter === 'upcoming') {
    whereConditions.push(gt(tokens.launchDate, now));
  }

  return await db
    .select()
    .from(tokens)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    .orderBy(desc(tokens.featured), orderByDirection(tokens.launchDate))
    .limit(limit)
    .offset(offset);
}

/**
 * Get tokens sorted by cumulative fees (with launch date as tiebreaker)
 */
export async function getTokensByFees(
  limit: number = 20,
  offset: number = 0,
  sortOrder: 'asc' | 'desc' = 'desc',
  statusFilter?: 'all' | 'live' | 'upcoming'
): Promise<Token[]> {
  const orderByDirection = sortOrder === 'asc' ? asc : desc;
  const now = new Date();

  // Build WHERE conditions
  const whereConditions = [];
  if (statusFilter === 'live') {
    whereConditions.push(lte(tokens.launchDate, now));
  } else if (statusFilter === 'upcoming') {
    whereConditions.push(gt(tokens.launchDate, now));
  }

  return await db
    .select()
    .from(tokens)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    .orderBy(
      desc(tokens.featured),
      orderByDirection(tokens.cumulativeFeesSnapshot),
      desc(tokens.launchDate) // Tiebreaker: newest first
    )
    .limit(limit)
    .offset(offset);
}

/**
 * Get total count of tokens
 */
export async function getTotalTokenCount(statusFilter?: 'all' | 'live' | 'upcoming'): Promise<number> {
  const now = new Date();
  
  // Build WHERE conditions
  const whereConditions = [];
  if (statusFilter === 'live') {
    whereConditions.push(lte(tokens.launchDate, now));
  } else if (statusFilter === 'upcoming') {
    whereConditions.push(gt(tokens.launchDate, now));
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(tokens)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
  
  return count;
}

/**
 * Get all tokens (no pagination)
 * Used by cron jobs and background services
 */
export async function getAllTokens(): Promise<Token[]> {
  return await db
    .select()
    .from(tokens)
    .orderBy(desc(tokens.featured), desc(tokens.launchDate));
}

// Export all functions as a service object for easier importing
export const dbService = {
  // Token operations
  createToken,
  getToken,
  getTokenByPoolAddress,
  getTokenById,
  listTokens,
  getAllTokens,
  searchTokens,
  updateCumulativeFeesSnapshot,
  getTokensByDate,
  getTokensByFees,
  getTotalTokenCount,

  // Pool stats operations
  createPoolStatsSnapshot,
  getLatestPoolStats,
  getPoolStatsHistory,
  getOldestPoolSnapshot,
  getSnapshotBefore30Days,

  // Fee update schedule operations
  upsertFeeUpdateSchedule,
  getPoolsDueForUpdate,
  recordUpdateFailure,
  getFeeUpdateSchedule,

  // Leaderboard
  getLeaderboard,
};
