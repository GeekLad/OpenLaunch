# Codebase Concerns

**Analysis Date:** 2026-05-23

## Tech Debt

### IPFS Upload Failure Fallbacks
- **Issue:** The token launch flow silently falls back to mock IPFS uploads when real services fail, producing non-working URLs. `launchService.ts` catches upload errors and calls `mockIPFSUpload()`/`mockMetadataUpload()` instead of failing the launch.
- **Files:** `lib/services/launchService.ts` (lines 120-143), `lib/services/ipfsService.ts` (lines 136-167)
- **Impact:** Users may launch tokens with broken metadata/image links that appear successful on-chain but are inaccessible off-chain. The mock CIDs are random and non-resolvable.
- **Fix approach:** Remove the mock fallback from production paths. Fail the launch if IPFS is unavailable, or at minimum require explicit opt-in to test mode. Consider pre-launch IPFS health checks.

### Database Migration Management
- **Issue:** Multiple ad-hoc migration scripts exist (`lib/db/migrate.ts`, `lib/db/migrate-fee-schedules.ts`) alongside Drizzle Kit migrations. There is no unified migration runner or versioning strategy.
- **Files:** `lib/db/migrate.ts`, `lib/db/migrate-fee-schedules.ts`, `lib/db/migrations/`
- **Impact:** Risk of migration ordering issues, missed schema changes, or duplicate schedule creation. No rollback mechanism exists.
- **Fix approach:** Consolidate all migrations into Drizzle Kit workflow. Remove standalone `.ts` migration scripts and use `drizzle-kit generate` / `drizzle-kit migrate` exclusively.

### Hardcoded Database Filename
- **Issue:** Database filename `openlaunch.db` is hardcoded in multiple files with no environment override possible.
- **Files:** `lib/db/client.ts` (line 9-16), `drizzle.config.ts` (line 5), `lib/validation/startup.ts` (line 27)
- **Impact:** Inflexible for multi-tenant or multi-instance deployments.
- **Fix approach:** Extract database filename into an environment variable with the current value as default.

### Console Logging in Production
- **Issue:** Extensive `console.log`/`console.error` usage throughout the codebase with no logging abstraction. 178+ matches found in production code.
- **Files:** `lib/services/launchService.ts`, `lib/cron/fee-updater.ts`, `lib/meteora/client.ts`, `lib/services/priceService.ts`, `lib/validation/startup.ts`
- **Impact:** Logs may leak sensitive data (pool addresses, transaction details) in production. No log level control, log rotation, or structured formatting.
- **Fix approach:** Replace all `console.*` calls with a proper logger (e.g., `pino`, `winston`) that supports log levels, redaction, and structured JSON output. Remove `console.log` calls from production paths.

### Feature Flag for Fee Display
- **Issue:** Fee display is behind a feature flag (`ENABLE_FEES_DISPLAY`) due to API issues, per recent git commit `c5cf598`. This suggests unstable integration with fee data sources.
- **Files:** `config/environment.ts` (line 45), `app/tokens/page.tsx`, `app/tokens/[mintAddress]/page.tsx`
- **Impact:** Core functionality (fee leaderboard) is disabled by default. Users cannot see token performance metrics unless explicitly enabled.
- **Fix approach:** Resolve underlying Meteora API reliability issues. Add caching and fallback strategies for fee data. Remove the feature flag once stable.

## Known Bugs

### Private Key Handling in Browser
- **Bug description:** Users can input a raw private key into a browser form (`TokenLaunchForm.tsx`). While the code claims it is "not stored or transmitted," the key passes through React state and is sent to the server-side launch service.
- **Symptoms:** Security risk if browser extensions, XSS, or memory inspection tools access the key. The key exists in memory during the launch flow.
- **Files:** `components/forms/TokenLaunchForm.tsx` (lines 33-56, 632-672), `lib/services/launchService.ts` (lines 53-66), `lib/utils/keypairUtils.ts`
- **Trigger:** Any user enabling "Advanced Settings" -> "Use Custom Private Key"
- **Workaround:** None. Users must trust the application environment completely.

### Launch Time Race Condition
- **Bug description:** The token launch attempts to handle `InvalidActivationPoint` errors by recreating the pool with immediate activation, but there is a narrow race between validation and transaction signing.
- **Symptoms:** If a user schedules a launch too close to current time, the pool may be created twice (first attempt fails, second succeeds), wasting transaction fees.
- **Files:** `lib/services/launchService.ts` (lines 231-292, 383-480)
- **Trigger:** Set a timed launch within ~2 minutes of current time.
- **Workaround:** The code auto-adjusts to immediate activation, but users may not be aware their scheduled launch was cancelled.

### Database Service Type Mismatch
- **Bug description:** `updateCumulativeFeesSnapshot` expects `mintAddress: string` but is called with `tokenId` (number) in `app/api/tokens/update-fees/route.ts`.
- **Symptoms:** Could update the wrong token or fail silently depending on whether any token ID accidentally matches a mint address prefix.
- **Files:** `app/api/tokens/update-fees/route.ts` (line 40: `updateCumulativeFeesSnapshot(tokenId, ...)`), `lib/db/service.ts` (line 270: `mintAddress: string`)
- **Trigger:** POST to `/api/tokens/update-fees` with `tokenId`.
- **Workaround:** None. This is a latent bug that may cause incorrect leaderboard data.

## Security Considerations

### API Keys in Environment Variables (No Encryption at Rest)
- **Risk:** `PINATA_API_KEY`, `PINATA_SECRET_KEY`, and `FILEBASE_API_KEY` are stored as plain environment variables. No encryption or secret management system is used.
- **Files:** `config/environment.ts` (lines 50-52), `.env.local` (implied)
- **Current mitigation:** Keys are server-side only (not exposed to client via `NEXT_PUBLIC_` prefix).
- **Recommendations:** Use a secret manager (e.g., AWS Secrets Manager, HashiCorp Vault) or at minimum encrypt `.env.local` in production deployments. Rotate keys regularly.

### Mock IPFS CID Generation
- **Risk:** `mockIPFSUpload` uses `Math.random()` to generate fake CIDs, which could collide or be predictable in rare scenarios. More importantly, the mock URLs are indistinguishable from real ones in logs.
- **Files:** `lib/services/ipfsService.ts` (lines 137-148, 156-167)
- **Current mitigation:** Mock upload is only a fallback.
- **Recommendations:** Remove mock uploads entirely from production. Use a dedicated test/staging IPFS gateway.

### No Rate Limiting on API Routes
- **Risk:** API routes (`/api/tokens/create`, `/api/ipfs/upload-file`, `/api/ipfs/upload-metadata`) have no rate limiting. Could be abused for spam, DoS, or excessive IPFS upload costs.
- **Files:** `app/api/tokens/create/route.ts`, `app/api/ipfs/upload-file/route.ts`, `app/api/ipfs/upload-metadata/route.ts`
- **Current mitigation:** None.
- **Recommendations:** Add `next-rate-limit` or middleware-based rate limiting. Limit IPFS uploads per IP/hour.

### SQL Injection via Search
- **Risk:** `searchTokens` constructs a SQL `LIKE` clause by concatenating user input directly: `like(tokens.searchText, \`%${searchTerm}%\`)`. While Drizzle ORM parameterizes the query, the input is not sanitized or length-limited.
- **Files:** `lib/db/service.ts` (lines 245-264)
- **Current mitigation:** Drizzle ORM parameterization prevents direct SQL injection, but no input validation on search term length or characters.
- **Recommendations:** Add search term length limit (e.g., 100 chars) and strip special characters.

## Performance Bottlenecks

### Sequential Token Fee Updates
- **Problem:** `/api/tokens/update-fees` updates all tokens sequentially in a single loop. For large token lists, this can take seconds or minutes, potentially timing out the HTTP request.
- **Files:** `app/api/tokens/update-fees/route.ts` (lines 102-146)
- **Cause:** No parallelization; each token requires an external API call to Meteora.
- **Improvement path:** Process updates in batches with `Promise.all()` or offload to the existing cron job exclusively. Add pagination or limit the bulk update endpoint.

### Unbounded Token List Queries
- **Problem:** `getAllTokens()` selects all tokens without pagination. Used by cron job and the update-fees API.
- **Files:** `lib/db/service.ts` (lines 604-609)
- **Cause:** No limit clause. As the token list grows, memory and query time increase linearly.
- **Improvement path:** Add pagination or batch processing. The cron job should process tokens in chunks.

### Connection Singleton Without Health Checks
- **Problem:** `getConnection()` creates a singleton `Connection` object but never recreates it if the RPC becomes unhealthy. `checkConnection()` exists but is never used to refresh the connection.
- **Files:** `lib/solana/connection.ts` (lines 11-18, 64-71)
- **Cause:** Connection is cached indefinitely. RPC failures may persist until process restart.
- **Improvement path:** Add periodic health checks and connection refresh logic. Retry with backoff on RPC errors.

## Fragile Areas

### Meteora API Dependency
- **Files:** `lib/meteora/client.ts`, `lib/cron/fee-updater.ts`, `app/api/tokens/update-fees/route.ts`
- **Why fragile:** Single third-party API with no caching layer or fallback. If Meteora API is down or changes response format, fee tracking breaks completely.
- **Safe modification:** Add response schema validation (e.g., Zod). Cache metrics in Redis or SQLite with TTL.
- **Test coverage:** No tests exist for Meteora client or fee updater.

### Cron Job Singleton Management
- **Files:** `lib/cron/fee-updater.ts` (lines 11, 128-141)
- **Why fragile:** The cron job uses a module-level `cronJob` variable. In Next.js development mode, the module may be reloaded, creating duplicate cron jobs or losing the reference to the original.
- **Safe modification:** Use a robust process manager (e.g., `pm2`, `bree`) or run cron in a separate Node.js worker. Store job state externally.
- **Test coverage:** Not tested.

### Token Launch Transaction Sequencing
- **Files:** `lib/services/launchService.ts` (lines 317-382)
- **Why fragile:** Three transactions (mint, setup, pool) must succeed in sequence. If any fail mid-flight, the token may be partially created (mint exists but no pool, or pool exists but no metadata). No atomic rollback or cleanup exists.
- **Safe modification:** Implement a launch state machine that tracks each step. On failure, provide guidance for manual cleanup or automatic idempotent retry.
- **Test coverage:** Not tested against devnet or with mocked Solana transactions.

## Scaling Limits

### SQLite Concurrency
- **Current capacity:** Single-file SQLite database with WAL mode enabled.
- **Limit:** Better-sqlite3 is synchronous and single-writer. Under high concurrency (many simultaneous launches or API requests), write operations will queue and block.
- **Scaling path:** Migrate to PostgreSQL or another server-grade database. Drizzle ORM makes this migration straightforward. Use connection pooling.

### IPFS Upload Bottleneck
- **Current capacity:** Uploads go through a single server-side Next.js API route, then to Pinata or Filebase.
- **Limit:** Large images or many concurrent uploads will bottleneck the Next.js server. Filebase/Pinata rate limits may apply.
- **Scaling path:** Add a CDN or presigned upload URLs. Offload image processing to a queue-based worker.

### RPC Rate Limiting
- **Current capacity:** Uses a single RPC endpoint (default: public Solana mainnet RPC).
- **Limit:** Public RPCs have aggressive rate limits. Under load, transactions may fail or be delayed.
- **Scaling path:** Use a dedicated RPC provider (e.g., QuickNode, Helius) with higher quotas. Implement RPC failover and request batching.

## Dependencies at Risk

### `@meteora-ag/cp-amm-sdk`
- **Risk:** Meteora SDK is relatively new (v1.2.3). Breaking API changes could affect pool creation logic.
- **Impact:** Pool creation is the core feature. A breaking change would prevent new token launches.
- **Migration plan:** Pin exact version. Monitor Meteora changelog. Consider abstracting pool creation behind an internal adapter to isolate SDK changes.

### `better-sqlite3`
- **Risk:** Native Node.js module requiring compilation. May fail in certain deployment environments (e.g., Alpine Linux, restricted containers).
- **Impact:** Application will not start if native module fails to load.
- **Migration plan:** Ensure Docker images include build tools. Consider migrating to `libsql` (Turso) or PostgreSQL for easier deployment.

### `@solana/web3.js` v1.x
- **Risk:** Solana ecosystem is rapidly evolving. v1.x may eventually be superseded by a new major version or `@anza-xyz/kit`.
- **Impact:** Transaction building and signing logic may need refactoring.
- **Migration plan:** Monitor Anza Labs announcements. Keep wallet adapter dependencies up to date.

## Missing Critical Features

### Transaction Retry / Idempotency
- **Problem:** Token launch is not idempotent. If a user refreshes the page mid-launch or the wallet popup is closed, there is no way to resume or recover.
- **Blocks:** Users may lose SOL on failed or partial launches with no guidance.

### Comprehensive Error Recovery
- **Problem:** Many catch blocks simply log errors and rethrow or return generic 500 responses. No structured error codes or user-facing recovery steps.
- **Files:** `lib/services/launchService.ts` (line 522), `app/api/tokens/create/route.ts` (line 115), `app/api/ipfs/upload-file/route.ts` (line 54)
- **Blocks:** Difficult to debug production issues or provide meaningful feedback to users.

## Test Coverage Gaps

### No Automated Tests
- **What's not tested:** Entire codebase lacks unit tests, integration tests, and E2E tests. No `*.test.ts` or `*.spec.ts` files exist.
- **Files:** All `lib/`, `app/`, `components/` directories
- **Risk:** Regressions in token launch logic, database schema changes, or Solana transaction building cannot be caught automatically.
- **Priority:** High. The token launch flow involves irreversible blockchain transactions. Every code path should be tested against a mock Solana environment (e.g., `solana-test-validator`, `bankrun`).

### No Fee Updater Tests
- **What's not tested:** The cron-based fee updater (`lib/cron/fee-updater.ts`) has no tests for schedule calculation, failure handling, or Meteora API response parsing.
- **Files:** `lib/cron/fee-updater.ts`, `lib/meteora/polling-strategy.ts`
- **Risk:** Fee calculation bugs or scheduling logic errors may go unnoticed until leaderboard data is visibly wrong.
- **Priority:** High.

### No Database Migration Tests
- **What's not tested:** Migration scripts are not tested for idempotency or correctness against production-like data.
- **Files:** `lib/db/migrate.ts`, `lib/db/migrate-fee-schedules.ts`
- **Risk:** A bad migration could corrupt the production database or leave it in an inconsistent state.
- **Priority:** Medium.

---

*Concerns audit: 2026-05-23*
