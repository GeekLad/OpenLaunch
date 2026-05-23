# External Integrations

**Analysis Date:** 2026-05-23

## APIs & External Services

**Solana Blockchain:**
- RPC endpoint: Configurable via `NEXT_PUBLIC_RPC_URL` (default: `https://api.mainnet-beta.solana.com`)
- Network: `mainnet-beta` or `devnet` (configured via `NEXT_PUBLIC_SOLANA_NETWORK`)
- Client: `@solana/web3.js` Connection singleton (`lib/solana/connection.ts`)
- Usage: Transaction submission, account queries, token minting, pool creation

**Meteora DAMMv2 API:**
- Mainnet: `https://dammv2-api.meteora.ag`
- Devnet: `https://dammv2-api.devnet.meteora.ag`
- Client: Custom fetch wrapper (`lib/meteora/client.ts`)
- Usage: Pool metrics (volume, fees, TVL, APR) for fee leaderboards and token cards
- Endpoints: `GET /pools/{poolAddress}/metrics`
- Polling: Every 5 minutes via cron, with age-based intervals (1 min → 5 min → 10 min → 60 min)

**CoinGecko API:**
- Endpoint: `https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd`
- Client: Direct fetch with 5-minute in-memory cache (`lib/services/priceService.ts`)
- Usage: SOL price in USD for market cap calculations and UI display

**IPFS / File Storage:**

*Pinata Cloud:*
- File upload: `POST https://api.pinata.cloud/pinning/pinFileToIPFS`
- Metadata upload: `POST https://api.pinata.cloud/pinning/pinJSONToIPFS`
- Auth: `PINATA_API_KEY` + `PINATA_SECRET_KEY` (server-side only, `config/environment.ts`)
- Gateway: `https://gateway.pinata.cloud/ipfs/{cid}`

*Filebase:*
- Upload: `POST https://rpc.filebase.io/api/v0/add`
- Auth: `FILEBASE_API_KEY` (server-side only)
- Gateway: `https://ipfs.filebase.io/ipfs/{cid}`

*IPFS Gateways (read):*
- `https://ipfs.io/ipfs/` (default)
- `https://**.ipfs.w3s.link`
- `https://gateway.pinata.cloud`
- `https://**.mypinata.cloud`

- Upload implementation: Server-side API routes (`app/api/ipfs/upload-file/route.ts`, `app/api/ipfs/upload-metadata/route.ts`)
- Client-side: `lib/services/ipfsService.ts` calls internal API routes to keep keys secure

## Data Storage

**Database:**
- SQLite via `better-sqlite3` 12.4.1
- Connection: `lib/db/client.ts` (singleton with WAL mode, foreign keys enabled)
- ORM: Drizzle ORM 0.44.7 with schema in `lib/db/schema/`
- Migrations: `drizzle-kit` generates to `lib/db/migrations/`
- File: `openlaunch.db` in `DATA_DIR` (default `./data/`)
- Tables:
  - `tokens` — Launched token records (`lib/db/schema/tokens.ts`)
  - `pool_stats_history` — Fee/volume snapshots (`lib/db/schema/pool-stats-history.ts`)
  - `fee_update_schedule` — Cron polling schedule (`lib/db/schema/fee-update-schedule.ts`)

**File Storage:**
- IPFS for token logos and metadata JSON (via Pinata or Filebase)
- Local filesystem for SQLite database only

**Caching:**
- In-memory: SOL price cache (`lib/services/priceService.ts`, 5-minute TTL)
- SQLite: Search text index and cumulative fees snapshot on tokens table for fast leaderboard queries

## Authentication & Identity

**Auth Provider:**
- Solana wallet authentication (no traditional auth system)
- Wallets supported: Phantom, Solflare, Coinbase, Trust, Ledger, Trezor, Torus, Coin98, WalletConnect
- Implementation: `@solana/wallet-adapter-react` (`components/providers/SolanaProvider.tsx`)
- User identification: Wallet public key (`creatorWallet` field in database)

## Monitoring & Observability

**Error Tracking:**
- None (console.error logging only)

**Logs:**
- Structured console logs with prefixes (e.g., `[Cron]`, `[Meteora API]`, `[Database]`)
- Cron job status logged on startup and each run

**Health Checks:**
- Docker healthcheck: `curl -f http://localhost:3000/api/init`
- Database health check: `lib/db/client.ts` `checkDatabaseHealth()`

## CI/CD & Deployment

**Hosting:**
- Self-hosted via Docker (`docker/Dockerfile` + `docker/docker-compose.yml`)
- Next.js standalone output for minimal container image
- Non-root user (`node:node`) in production container

**CI Pipeline:**
- None detected

## Environment Configuration

**Required env vars (client-side, `NEXT_PUBLIC_*`):**
- `NEXT_PUBLIC_RPC_URL` — Solana RPC endpoint
- `NEXT_PUBLIC_SOLANA_NETWORK` — `mainnet-beta` or `devnet`
- `NEXT_PUBLIC_APP_NAME` — Application name
- `NEXT_PUBLIC_QUOTE_TOKEN_MINT` — Quote token (default: wrapped SOL)
- `NEXT_PUBLIC_TOKEN_DECIMALS` — Token decimals (default: 9)
- `NEXT_PUBLIC_TOTAL_SUPPLY` — Total supply (default: 1,000,000,000)
- `NEXT_PUBLIC_INITIAL_PRICE` — Pool initial price
- `NEXT_PUBLIC_PRICE_RANGE_MIN` / `NEXT_PUBLIC_PRICE_RANGE_MAX` — Price bounds
- `NEXT_PUBLIC_FEE_DECAY_DURATION_MINUTES` — Fee scheduler duration
- `NEXT_PUBLIC_FEE_DECAY_PERIODS` — Number of fee decay periods
- `NEXT_PUBLIC_POOL_LIQUIDITY_PERCENTAGE` — Liquidity allocation (default: 1.0 = 100%)
- `NEXT_PUBLIC_IPFS_GATEWAY` — IPFS read gateway
- `NEXT_PUBLIC_MAX_IMAGE_SIZE_MB` — Logo upload limit (default: 1)

**Required env vars (server-side):**
- `PINATA_API_KEY` + `PINATA_SECRET_KEY` — Pinata IPFS upload (or)
- `FILEBASE_API_KEY` — Filebase IPFS upload
- `DATA_DIR` — SQLite directory (default: `./data`)
- `ENABLE_CRON` — Set to `true` to run fee updater in development

**Secrets location:**
- `.env.local` file (never committed; listed in `.gitignore`)
- Docker Compose passes secrets as environment variables
- Server-side API routes keep IPFS keys away from client

## Webhooks & Callbacks

**Incoming:**
- None (no external webhook endpoints)

**Outgoing:**
- None (no outbound webhooks registered)

**Internal API Routes:**
- `POST /api/ipfs/upload-file` — Upload logo to IPFS (server-side)
- `POST /api/ipfs/upload-metadata` — Upload metadata JSON to IPFS (server-side)
- `POST /api/tokens/create` — Record successful launch in database
- `GET /api/tokens/list` — Paginated token listing with sort/filter
- `GET /api/tokens/{mintAddress}` — Token detail
- `POST /api/tokens/update-fees` — Trigger fee update (manual or cron)
- `GET /api/init` — App initialization and health check

---

*Integration audit: 2026-05-23*
