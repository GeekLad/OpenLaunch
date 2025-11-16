# OpenLaunch Database Module

This directory contains the database layer for OpenLaunch, built with Drizzle ORM and SQLite.

## Overview

The database stores token launches, pool statistics, and fee update schedules. It's designed to be database-agnostic, allowing easy migration to PostgreSQL or other databases in the future.

**Status:** Fully implemented and integrated with the main application.

## Database Schema

### Tables

1. **tokens** - Stores successful token launches
   - Token metadata (name, symbol, logo, description)
   - Pool configuration (price, liquidity, fees)
   - Launch information (date, slot, transactions)
   - Cumulative fees snapshot (for fast leaderboard queries)
   - Search text (for full-text search)

2. **pool_stats_history** - Historical fee and trading statistics
   - Fee metrics (24h, 7d, 30d, cumulative)
   - Volume metrics
   - Liquidity and price data
   - Time-series snapshots

3. **fee_update_schedule** - Age-based polling schedule
   - Next update time
   - Update interval (based on token age)
   - Error tracking

## Scripts

### Generate Migrations

Create new migration files from schema changes:

```bash
npm run db:generate
```

### Run Migrations

Apply pending migrations to the database:

```bash
npm run db:migrate
```

### Seed Database

Populate database with sample data for testing:

```bash
npm run db:seed
```

### Run Tests

Verify database operations:

```bash
npm run db:test
```

### Drizzle Studio

Open visual database browser:

```bash
npm run db:studio
```

## Usage

### Import the Service

```typescript
import { dbService } from '@/lib/db/service';
```

### Create a Token

```typescript
const token = await dbService.createToken({
  mintAddress: '...',
  poolAddress: '...',
  name: 'My Token',
  symbol: 'TKN',
  // ... other fields
});
```

### List Tokens

```typescript
const { tokens, total, hasMore } = await dbService.listTokens({
  offset: 0,
  limit: 20,
  sortBy: 'launchDate',
  sortOrder: 'desc',
});
```

### Search Tokens

```typescript
const results = await dbService.searchTokens('MOON');
// Searches across: mint address, symbol, name, description, creator wallet
```

### Create Pool Stats Snapshot

```typescript
await dbService.createPoolStatsSnapshot(tokenId, poolAddress, {
  totalFeesGenerated: '1000000',
  fees24h: '250000',
  volume24h: '5000000000',
  currentPrice: 0.0000001,
});
```

### Get Leaderboard

```typescript
const leaderboard = await dbService.getLeaderboard(100);
// Returns tokens sorted by cumulative fees (desc), then launch date (newest first)
```

### Update Fee Schedule

```typescript
await dbService.upsertFeeUpdateSchedule(
  tokenId,
  poolAddress,
  nextUpdateTime,
  intervalMinutes
);
```

## Database Location

Default: `./data/openlaunch.db`

Configure via environment variable:

```bash
DATABASE_URL=./data/openlaunch.db
```

## Database-Agnostic Design

The service layer ([service.ts](service.ts)) provides an abstraction over Drizzle ORM. To migrate to a different database:

1. Update `drizzle.config.ts` with new dialect
2. Update `client.ts` with new driver
3. All service functions remain the same (database-agnostic)

## File Structure

```
lib/db/
├── README.md                    # This file
├── client.ts                    # Database connection and configuration
├── service.ts                   # Database service layer (abstraction)
├── migrate.ts                   # Migration runner script
├── seed.ts                      # Seed data script
├── test.ts                      # Simple test script
├── schema/
│   ├── index.ts                 # Schema exports
│   ├── tokens.ts                # Tokens table schema
│   ├── pool-stats-history.ts    # Pool stats table schema
│   └── fee-update-schedule.ts   # Fee update schedule schema
└── migrations/
    └── 0000_*.sql               # SQL migration files
```

## Environment Variables

```bash
# Database Configuration
DATABASE_URL=./data/openlaunch.db
DATABASE_TYPE=sqlite
```

## Development Workflow

1. **Make schema changes** in `schema/*.ts`
2. **Generate migration**: `npm run db:generate`
3. **Review migration** in `migrations/` directory
4. **Run migration**: `npm run db:migrate`
5. **Test changes**: `npm run db:test`

## Production Notes

- WAL mode is enabled for better concurrency
- Foreign keys are enforced
- All indexes are created for optimal query performance
- Database file is gitignored (`.gitignore` includes `/data/*.db`)

## Support

For database-related issues or questions:
- 📖 [Main README](../../../README.md) - Project documentation
- 🐛 [GitHub Issues](https://github.com/your-repo/issues) - Bug reports
- 💬 [Discord](https://discord.gg/XF83PypJDh) - Community support