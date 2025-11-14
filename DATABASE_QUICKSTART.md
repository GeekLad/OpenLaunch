# Database Quick Start Guide

## Setup (First Time Only)

1. **Run migrations** to create the database:
   ```bash
   npm run db:migrate
   ```

2. **Seed sample data** for testing:
   ```bash
   npm run db:seed
   ```

3. **Verify everything works**:
   ```bash
   npm run db:test
   ```

## Common Commands

### View Database
```bash
npm run db:studio
```
Opens Drizzle Studio in your browser for visual database exploration.

### Run All Tests
```bash
npm run db:test
```

### Reset Database
```bash
rm data/openlaunch.db*
npm run db:migrate
npm run db:seed
```

## Using the Database in Code

### Import the Service

```typescript
import { dbService } from '@/lib/db/service';
```

### Common Operations

#### Create a Token (on successful launch)
```typescript
const token = await dbService.createToken({
  mintAddress: 'ABC...',
  poolAddress: 'XYZ...',
  name: 'My Token',
  symbol: 'TKN',
  description: 'A great token',
  logoUrl: 'https://ipfs.io/...',
  decimals: 9,
  totalSupply: '1000000000',
  initialPrice: 0.0000001,
  quoteTokenMint: 'So11111111111111111111111111111111111111112',
  poolLiquidityPercentage: 1.0,
  feeDecayDurationMinutes: 60,
  feeDecayPeriods: 60,
  launchDate: new Date(),
  mintTxSignature: 'sig1...',
  metadataTxSignature: 'sig2...',
  poolTxSignature: 'sig3...',
  creatorWallet: 'wallet...',
});
```

#### Get a Token
```typescript
const token = await dbService.getToken('mintAddress...');
```

#### List Tokens (for infinite scroll)
```typescript
const { tokens, total, hasMore } = await dbService.listTokens({
  offset: 0,
  limit: 20,
  sortBy: 'launchDate', // or 'cumulativeFees'
  sortOrder: 'desc',
});
```

#### Search Tokens
```typescript
const results = await dbService.searchTokens('moon');
// Searches: mint address, symbol, name, description, creator wallet
```

#### Create Pool Stats Snapshot
```typescript
await dbService.createPoolStatsSnapshot(tokenId, poolAddress, {
  totalFeesGenerated: '1000000',
  fees24h: '250000',
  volume24h: '5000000000',
  currentPrice: 0.0000001,
  currentPriceUsd: 0.00001,
});
```

#### Get Leaderboard
```typescript
const leaderboard = await dbService.getLeaderboard(100);
```

## Environment Variables

Create `.env.local` (copy from `.env.local.example`):

```bash
# Required for database
DATABASE_URL=./data/openlaunch.db
DATABASE_TYPE=sqlite

# Required for Meteora integration (Phase 3)
METEORA_API_BASE_URL=https://dlmm-api.meteora.ag
METEORA_API_RATE_LIMIT=10
```

## Database Location

Default: `./data/openlaunch.db`

The database file is automatically created when you run migrations. The `/data` directory is gitignored.

## Schema Overview

### tokens
Stores successful token launches with:
- Token metadata
- Pool configuration
- Launch information
- Cumulative fees snapshot (for fast leaderboard)
- Search text (for full-text search)

### pool_stats_history
Historical snapshots of:
- Fee metrics (24h, 7d, 30d, cumulative)
- Volume metrics
- Price and liquidity data

### fee_update_schedule
Tracks when each pool should be updated based on age:
- 0-1 hour: Every 1 minute
- 1-24 hours: Every 5 minutes
- 24-96 hours: Every 10 minutes
- 96+ hours: Every 60 minutes

## Troubleshooting

### Database locked error
SQLite uses WAL mode for better concurrency, but if you see locking errors:
```bash
# Close any open Drizzle Studio instances
# Then reset the WAL files:
rm data/openlaunch.db-shm data/openlaunch.db-wal
```

### Migration failed
```bash
# Check the error message, then:
rm data/openlaunch.db*
npm run db:migrate
```

### Want to inspect the database directly?
```bash
npm run db:studio
# or use sqlite3 CLI:
sqlite3 data/openlaunch.db
```

## Next Steps

See [PHASE_1_COMPLETE.md](PHASE_1_COMPLETE.md) for full documentation of Phase 1 implementation.

Phase 2 will integrate the database into the launch flow!
