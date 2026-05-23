# Architecture

**Analysis Date:** 2026-05-23

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         Next.js App Router                           │
│  `app/` — Pages, Layouts, API Routes                                 │
├────────────────────┬────────────────────┬───────────────────────────┤
│   UI Layer         │   Service Layer    │   Blockchain Layer        │
│   `components/`    │   `lib/services/` │   `lib/solana/`          │
│   `app/**/page.tsx`│   `lib/db/service` │   `lib/meteora/`         │
│   React + Tailwind │   Business Logic   │   Transaction Building   │
└────────┬───────────┴────────┬───────────┴───────────┬─────────────┘
         │                    │                       │
         ▼                    ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Data & External Services                        │
│  `lib/db/` — SQLite + Drizzle ORM                                   │
│  `lib/services/ipfsService.ts` — IPFS via Pinata/Filebase           │
│  `lib/meteora/client.ts` — Meteora DAMMv2 API                        │
│  Solana RPC — Wallet signing, on-chain state                        │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| TokenLaunchService | Orchestrates full token launch flow: mint → metadata → pool creation | `lib/services/launchService.ts` |
| dbService | All database CRUD: tokens, pool stats, fee schedules | `lib/db/service.ts` |
| IPFS Service | Client-side upload helpers; server routes handle actual Pinata/Filebase calls | `lib/services/ipfsService.ts` |
| Price Service | SOL/USD price fetch with 5-minute in-memory cache | `lib/services/priceService.ts` |
| Solana Connection | Singleton RPC connection with health checks | `lib/solana/connection.ts` |
| Token Utils | SPL Token Program interactions: mint, mint-to, revoke authorities | `lib/solana/tokenUtils.ts` |
| Metadata Utils | Metaplex Token Metadata Program: create account, build JSON metadata | `lib/solana/metadataUtils.ts` |
| Pool Utils | Meteora DAMMv2 SDK: pool creation, price math, pool info | `lib/solana/poolUtils.ts` |
| Fee Updater Cron | Background cron: every 5 minutes fetches Meteora metrics and updates DB | `lib/cron/fee-updater.ts` |

## Pattern Overview

**Overall:** Next.js App Router + Service Layer + Domain-Driven Modules

**Key Characteristics:**
- **API-first server actions:** Database mutations go through Next.js API routes (`app/api/**/route.ts`), not server actions/direct DB calls from pages
- **Client/service split:** `ENV` (public, client-safe) vs `SERVER_ENV` (server-only secrets like Pinata keys)
- **Singleton connections:** SQLite (`lib/db/client.ts`) and Solana RPC (`lib/solana/connection.ts`) use module-level singletons with lazy initialization
- **Service object pattern:** `dbService` is a barrel object exporting all DB functions (`lib/db/service.ts:612`)
- **Class-based service:** `TokenLaunchService` encapsulates the multi-step launch flow with status callbacks

## Layers

**Presentation Layer (UI):**
- Purpose: React components, pages, forms, wallet integration
- Location: `app/`, `components/`
- Contains: Next.js pages, layout, form components, reusable UI primitives, wallet provider
- Depends on: `lib/services/launchService`, `lib/services/ipfsService`, `@solana/wallet-adapter-react`
- Used by: Browser/client

**API Routes Layer (Server Entry):**
- Purpose: HTTP endpoints for DB mutations and IPFS uploads (keeps secrets server-side)
- Location: `app/api/**/route.ts`
- Contains: `POST /api/tokens/create`, `GET /api/tokens/list`, `GET /api/tokens/[mintAddress]`, `POST /api/ipfs/upload-file`, `POST /api/ipfs/upload-metadata`, `POST /api/tokens/update-fees`
- Depends on: `lib/db/service`, `lib/meteora/client`, `config/environment` (SERVER_ENV)
- Used by: Client-side fetch calls and cron job

**Service Layer (Business Logic):**
- Purpose: Orchestrate complex operations like token launches, IPFS uploads, price fetching
- Location: `lib/services/`
- Contains: `launchService.ts`, `ipfsService.ts`, `priceService.ts`
- Depends on: `lib/solana/*`, `lib/meteora/*`, `lib/db/service` (launch service calls DB after on-chain success)
- Used by: UI components, API routes

**Blockchain Layer (Domain):**
- Purpose: Solana transaction building, Meteora pool creation, token metadata
- Location: `lib/solana/`, `lib/meteora/`
- Contains: `connection.ts`, `tokenUtils.ts`, `metadataUtils.ts`, `poolUtils.ts`, `client.ts`, `polling-strategy.ts`
- Depends on: `@solana/web3.js`, `@solana/spl-token`, `@meteora-ag/cp-amm-sdk`, `@metaplex-foundation/*`
- Used by: `lib/services/launchService.ts`

**Data Layer (Persistence):**
- Purpose: SQLite database schema, migrations, query layer
- Location: `lib/db/`
- Contains: `client.ts` (connection), `schema/` (Drizzle ORM schema), `service.ts` (query functions), `migrations/`
- Depends on: `better-sqlite3`, `drizzle-orm`
- Used by: API routes, cron job, launch page (after on-chain success)

**Infrastructure/Config Layer:**
- Purpose: Environment validation, startup checks
- Location: `config/`, `lib/validation/`, `lib/cron/`
- Contains: `environment.ts`, `startup.ts`, `fee-updater.ts`
- Depends on: `zod` (implied by startup validation)
- Used by: App init, cron job scheduling

## Data Flow

### Primary Request Path: Token Launch

1. **User fills form** (`components/forms/TokenLaunchForm.tsx:66`) → client-side validation with `react-hook-form` + Zod
2. **Launch page orchestrates** (`app/launch/page.tsx:50`) → checks wallet balance, instantiates `TokenLaunchService`
3. **Service builds transactions** (`lib/services/launchService.ts:38`) → 3-step flow:
   - Generate or parse custom mint keypair
   - Build 3 transactions: mint creation, mint+metadata+revoke authorities, DAMMv2 pool
   - Upload logo + metadata to IPFS via server API (`/api/ipfs/upload-file`, `/api/ipfs/upload-metadata`)
4. **User signs all 3 transactions at once** via `wallet.signAllTransactions` (`app/launch/page.tsx:71`)
5. **Submit sequentially** with fresh blockhash (`lib/services/launchService.ts:337`)
6. **Save to database** via `POST /api/tokens/create` (`app/launch/page.tsx:98`)
7. **Redirect** to token detail page (`/tokens/[mintAddress]`)

### Token Listing / Detail Flow

1. **Tokens page** (`app/tokens/page.tsx`) fetches from `GET /api/tokens/list?page=&sortBy=...`
2. **API route** (`app/api/tokens/list/route.ts`) queries `dbService.getTokensByDate()` or `getTokensByFees()`
3. **Token detail page** (`app/tokens/[mintAddress]/page.tsx`) fetches from `GET /api/tokens/[mintAddress]`
4. **API route** returns token + latest `poolStats` from `dbService.getLatestPoolStats()`

### Background Fee Update Flow

1. **App init** (`lib/init.ts:13`) starts cron if `NODE_ENV=production` or `ENABLE_CRON=true`
2. **Cron fires every 5 minutes** (`lib/cron/fee-updater.ts:135`)
3. **Fetch pools due for update** (`dbService.getPoolsDueForUpdate()`)
4. **Call Meteora API** (`lib/meteora/client.ts:60`) for each pool
5. **Update DB**: `updateCumulativeFeesSnapshot`, `createPoolStatsSnapshot`, `upsertFeeUpdateSchedule`

## Key Abstractions

**TokenLaunchService:**
- Purpose: Encapsulates the multi-step, stateful token launch process with progress callbacks
- File: `lib/services/launchService.ts`
- Pattern: Class with status callback injection; each step updates progress

**dbService:**
- Purpose: Database-agnostic CRUD abstraction (could migrate from SQLite)
- File: `lib/db/service.ts:612`
- Pattern: Barrel object exporting all functions; uses Drizzle ORM query builder

**Environment Config Split:**
- Purpose: Prevent server secrets leaking to client
- Files: `config/environment.ts`
- Pattern: `ENV` (public, `NEXT_PUBLIC_*` prefixed) vs `SERVER_ENV` (server-only)

**Age-Based Polling Strategy:**
- Purpose: Dynamically adjust how frequently each token's pool metrics are refreshed
- File: `lib/meteora/polling-strategy.ts`
- Pattern: Pure function `calculateNextUpdateTime(launchDate)` returns interval + next timestamp

## Entry Points

**Web Application Entry:**
- Location: `app/layout.tsx`
- Triggers: Next.js renders root layout on every request
- Responsibilities: Mounts `SolanaProvider`, `ThemeProvider`, `Header`, `Footer`; imports `app/init.ts` to trigger cron

**API Route Entry Points:**
- `POST /api/tokens/create` — `app/api/tokens/create/route.ts` — persists successful token launch
- `GET /api/tokens/list` — `app/api/tokens/list/route.ts` — paginated token listing
- `GET /api/tokens/[mintAddress]` — `app/api/tokens/[mintAddress]/route.ts` — token detail + stats
- `POST /api/ipfs/upload-file` — `app/api/ipfs/upload-file/route.ts` — server-side IPFS upload (keeps API keys secret)
- `POST /api/ipfs/upload-metadata` — `app/api/ipfs/upload-metadata/route.ts` — server-side metadata JSON upload
- `POST /api/tokens/update-fees` — `app/api/tokens/update-fees/route.ts` — manual trigger for fee updates

**Background Service Entry:**
- Location: `lib/init.ts`
- Triggers: Imported by `app/init.ts` which is imported by `app/layout.tsx`
- Responsibilities: Validates startup config, starts `fee-updater` cron if conditions met

## Architectural Constraints

- **Threading:** Single-threaded Node.js event loop. Cron job (`node-cron`) runs in the same process as the Next.js server.
- **Global state:** Module-level singletons exist for SQLite connection (`lib/db/client.ts:11`), Solana RPC connection (`lib/solana/connection.ts:11`), SOL price cache (`lib/services/priceService.ts:15`), cron job handle (`lib/cron/fee-updater.ts:11`), and app init flag (`lib/init.ts:45`).
- **Build-time skip:** App init explicitly skips during Next.js build phase (`NEXT_PHASE === 'phase-production-build'`).
- **No RSC for data:** Token list/detail pages use `"use client"` and client-side `fetch()`, not React Server Components or server actions. This is a deliberate choice for wallet-interactive pages.
- **Solana browser constraints:** Webpack config (`next.config.ts:36`) polyfills `fs`, `os`, `path`, `crypto` to `false` for browser bundle.

## Anti-Patterns

### Client-Side Database Save After Launch

**What happens:** After a successful on-chain launch, the launch page (`app/launch/page.tsx:98`) calls `fetch("/api/tokens/create")` to persist the token. The DB save is non-blocking and failures are swallowed with a console log.
**Why it's wrong:** If the API call fails or the server restarts between launch and save, the token exists on-chain but not in the local database. The token becomes invisible in the UI.
**Do this instead:** Queue the save or make the final step of `TokenLaunchService.launchToken()` include a synchronous/retryable DB persistence step. Alternatively, detect on-chain tokens missing from the DB via a reconciliation job.

### Module-Level Mutable Singletons Without Cleanup

**What happens:** `connection.ts`, `client.ts`, and `priceService.ts` all maintain module-level mutable variables (`let connection: Connection | null = null`).
**Why it's wrong:** In test environments or during hot reload, these singletons can hold stale state. No cleanup/teardown is exposed for test isolation.
**Do this instead:** Export a `resetConnection()` or accept an optional `connection` parameter in service constructors for dependency injection.

## Error Handling

**Strategy:** Log-and-continue for non-critical paths; throw-and-display for user-facing flows.

**Patterns:**
- API routes catch all errors, log to `console.error`, and return `NextResponse.json({ error, details }, { status: 500 })`
- `TokenLaunchService` catches errors in `launchToken()`, calls `updateStatus({ step: "error", ... })`, then re-throws so the UI can display it
- Background cron records failures per-token in `feeUpdateSchedule.consecutiveFailures` and `lastError`

## Cross-Cutting Concerns

**Logging:** `console.log` / `console.error` throughout. Prefixes like `[API]`, `[Cron]`, `[Database]`, `[Meteora API]` used for filtering.

**Validation:**
- Form validation: `react-hook-form` + Zod in `TokenLaunchForm.tsx`
- Startup validation: `lib/validation/startup.ts` checks required env vars before app starts
- API route validation: Manual param checks in each route handler

**Authentication:** None (application-level). Wallet connection via `@solana/wallet-adapter-react` provides user identity (public key). No session/auth system beyond wallet presence.

---

*Architecture analysis: 2026-05-23*
