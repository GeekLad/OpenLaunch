<!-- GSD:project-start source:PROJECT.md -->
## Project

**OpenLaunch**

A Solana token launchpad built on Next.js that lets users create SPL tokens, upload metadata to IPFS, and launch Meteora DAMMv2 liquidity pools. The app provides a guided form for token parameters and handles the full on-chain transaction flow.

**Core Value:** Users can launch a token with a liquidity pool in a single guided flow, without writing code or manually building transactions.

### Constraints

- **Tech stack**: Must stay within Next.js 16 / React 19 / Tailwind / shadcn/ui component patterns already in use
- **Blockchain SDK**: Fee scheduler modes must be supported by @meteora-ag/cp-amm-sdk
- **Wallet compatibility**: All transaction building must remain compatible with standard Solana wallet adapters
- **UI simplicity**: Default form stays simple; all customizations live in an "Advanced Options" collapsible section
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.9.3 — All application code (`lib/`, `app/`, `components/`, `types/`)
- JavaScript/ESM — Configuration files (`eslint.config.mjs`, `postcss.config.mjs`, scripts)
- CSS — Styling (`app/globals.css`)
## Runtime
- Node.js 24.10.0 (specified in `docker/Dockerfile`)
- Next.js 16.0.1 (React framework, App Router)
- React 19.2.0 + React DOM 19.2.0
- npm (package-lock.json present)
- Lockfile: present
## Frameworks
- Next.js 16.0.1 — Full-stack React framework with App Router (`app/`)
- React 19.2.0 — UI library
- Tailwind CSS 3.4.18 — Utility-first CSS framework (`tailwind.config.ts`)
- Drizzle ORM 0.44.7 — Type-safe SQL-like ORM for SQLite
- @solana/web3.js 1.98.4 — Core Solana blockchain SDK
- @solana/spl-token 0.4.14 — SPL token program interactions
- @solana/wallet-adapter-react 0.15.39 — React wallet connection (`components/providers/SolanaProvider.tsx`)
- @solana/wallet-adapter-wallets 0.19.37 — Wallet adapters (Phantom, Solflare, Ledger, etc.)
- @metaplex-foundation/mpl-token-metadata 3.4.0 — Metaplex token metadata program
- @metaplex-foundation/umi 1.4.1 + umi-bundle-defaults + umi-web3js-adapters — Metaplex UMI framework for metadata operations
- @meteora-ag/cp-amm-sdk — Meteora DAMMv2 concentrated liquidity AMM SDK (`lib/solana/poolUtils.ts`)
- bs58 6.0.0 — Base58 encoding for Solana addresses and keys
- react-hook-form 7.66.0 — Form state management (`components/forms/TokenLaunchForm.tsx`)
- @hookform/resolvers 5.2.2 — Form validation resolvers
- zod 3.25.76 — Schema validation and TypeScript type inference
- lucide-react 0.553.0 — Icon library
- class-variance-authority 0.7.1 — Component variant management
- clsx 2.1.1 + tailwind-merge 3.4.0 — Conditional className utilities
- tailwindcss-animate 1.0.7 — Tailwind animation utilities
- node-cron 4.2.1 — Cron-based scheduling for fee updates (`lib/cron/fee-updater.ts`)
## Key Dependencies
- `@solana/web3.js` — All blockchain interactions (mint creation, transactions, pool creation)
- `@meteora-ag/cp-amm-sdk` — DAMMv2 pool creation and management
- `@solana/spl-token` — Token minting, ATA creation, authority revocation
- `better-sqlite3` 12.4.1 — SQLite database driver (`lib/db/client.ts`)
- `drizzle-orm` — Database operations and migrations
- `date-fns` 4.1.0 — Date manipulation utilities
- `next` — Framework runtime
- `typescript` 5.9.3 — Type checking
- `tsx` 4.20.6 — TypeScript execution for scripts and migrations
- `drizzle-kit` 0.31.6 — Database migration generation and studio
- `eslint` 9.39.1 + `eslint-config-next` 16.0.3 — Linting
- `autoprefixer` 10.4.21 + `postcss` 8.5.6 — CSS processing
## Configuration
- `.env.local` (not committed) — Runtime configuration
- `.env.local.example` — Template showing all required variables
- `config/environment.ts` — Centralized env variable parsing with defaults
- `next.config.ts` — Next.js config (standalone output, Turbopack aliases, webpack fallbacks for fs/os/path/crypto, remote image patterns for IPFS)
- `tsconfig.json` — TypeScript strict mode, bundler module resolution, path alias `@/*`
- `tailwind.config.ts` — Dark mode, custom color tokens, chart colors, border radius
- `drizzle.config.ts` — SQLite dialect, schema at `lib/db/schema/index.ts`, migrations at `lib/db/migrations`
- `eslint.config.mjs` — Next.js core-web-vitals + TypeScript rules, no-unused-vars, no-explicit-any, no-unused-expressions
- `postcss.config.mjs` — TailwindCSS + Autoprefixer
- Docker multi-stage build (`docker/Dockerfile`: deps → builder → runner)
- Next.js standalone output for production
- Healthcheck endpoint: `GET /api/init`
## Platform Requirements
- Node.js 24+ (matching Dockerfile)
- npm 10+
- Native build tools (python3, make, g++) for better-sqlite3 compilation
- Docker container (node:24.10.0-slim based)
- Exposes port 3000
- SQLite database persisted to `./data/` (configurable via `DATA_DIR`)
- Cron jobs auto-start in production (`NODE_ENV=production`) or when `ENABLE_CRON=true`
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Utility/service files: `camelCase.ts` — `tokenUtils.ts`, `poolUtils.ts`, `launchService.ts`, `keypairUtils.ts`
- Component files: `PascalCase.tsx` — `TokenLaunchForm.tsx`, `SolanaProvider.tsx`, `WalletButton.tsx`
- Schema/model files: `kebab-case.ts` — `pool-stats-history.ts`, `fee-update-schedule.ts`
- Barrel indexes: `index.ts` — `lib/db/schema/index.ts`, `lib/cron/index.ts`
- Exported utilities: `camelCase` — `createMint()`, `getPoolMetrics()`, `validateAndParsePrivateKey()`
- React components: `PascalCase` — `TokenLaunchForm`, `SolanaProvider`
- Private methods: `camelCase` prefixed — `updateStatus()` in `TokenLaunchService`
- Constants: `UPPER_SNAKE_CASE` for true constants — `DEFAULT_COMMITMENT`, `DAMM_V2_PROGRAM_ID`
- Configuration: `ENV` and `SERVER_ENV` objects in `config/environment.ts`
- React state: `camelCase` with `useState` — `enableFeeScheduler`, `logoPreview`
- Interfaces: `PascalCase` — `TokenCreateInput`, `PoolStatsInput`, `LaunchStatus`
- Drizzle-inferred types: `Token`, `NewToken` from `typeof tokens.$inferSelect`
- Function result types: `PascalCase` with suffix — `CreateMintResult`, `MintTokensResult`
## Code Style
- No Prettier configuration file detected
- Indentation: 2 spaces (observed in all files)
- Semicolons: Required (enforced by TypeScript strict mode)
- Quotes: Double quotes for strings in source files
- ESLint config: `eslint.config.mjs`
- Base: `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`
- Custom rules:
- Run: `npm run lint` (runs `type-check && eslint .`)
- Fix: `npm run lint:fix` (runs `eslint . --fix`)
- `strict: true` in `tsconfig.json`
- Target: `ES2017`
- Module resolution: `bundler`
- Path alias: `@/*` maps to `./*`
- JSX: `react-jsx`
## Import Organization
- `@/config/environment` — environment variables
- `@/lib/*` — all library code
- `@/components/*` — React components
- `@/types/*` — shared TypeScript types
## Error Handling
- Standard try-catch with typed error extraction:
- Error prefixing with component/service tag in brackets: `[Database]`, `[API]`, `[Cron]`, `[Meteora API]`
- `instanceof Error` check before accessing `.message`
- API routes return structured error responses with both `error` (user-friendly) and `details` (technical)
- Zod schemas for form validation — `tokenFormSchema` in `components/forms/TokenLaunchForm.tsx`
- `superRefine` for cross-field validation (custom private key when enabled)
- Custom validation functions — `validateImageFile()`, `validateMetadata()`
## Logging
- Prefixed tags: `[Database]`, `[API]`, `[Cron]`, `[Meteora API]`, `[Migrations]`, `[App Init]`, `[Price Service]`
- Success markers: `✓` (checkmark) for success logs
- Error markers: `✗` or `❌` for errors
- Warning markers: `⚠️` for warnings
- Structured startup output with emoji bullets in `lib/validation/startup.ts`
## Comments
- Every exported function has JSDoc with `@param` and `@returns`
- Complex logic sections have inline explanations
- Section dividers in large files: `// ============================================================================`
- Schema columns have inline comments explaining purpose
- Full JSDoc on public API functions
- Example: `lib/db/service.ts`, `lib/solana/tokenUtils.ts`, `lib/utils.ts`
- Type descriptions in interface fields
## Function Design
- Large service methods exist (e.g., `TokenLaunchService.launchToken()` is ~500 lines)
- Utility functions are small and focused (10-30 lines typical)
- Prefer object parameters for complex functions — `CreatePoolParams`, `CreateMetadataParams`
- Default values for optional params: `decimals: number = ENV.TOKEN_DECIMALS`
- Always return typed objects, never implicit returns for public APIs
- Null returns for "not found" cases: `Promise<Token | null>`
## Module Design
- Named exports exclusively (no default exports observed in library code)
- Service object pattern: `export const dbService = { createToken, getToken, ... }` in `lib/db/service.ts`
- Barrel files re-export from submodules: `lib/db/schema/index.ts`
- `lib/db/schema/index.ts` — exports all schema modules
- Used for clean imports: `import * as schema from './schema'`
## React Patterns
- "use client" directive for client-side components
- Functional components with typed props interface
- `React.forwardRef` for UI primitives (`Button`, `Input`)
- `FC<PropsType>` type annotation observed in providers
- Local React state with `useState` (no global state library like Zustand/Redux)
- `react-hook-form` + `zodResolver` for form state
- Watch values with `watch()` from react-hook-form
## Database Patterns
- Schema-first: define tables in `lib/db/schema/*.ts`
- Type inference: `export type Token = typeof tokens.$inferSelect`
- Indexes defined inline with table schema
- Foreign keys with `onDelete: 'cascade'`
- Drizzle Kit for migrations (`drizzle.config.ts`)
- CLI scripts: `db:generate`, `db:migrate`, `db:seed`, `db:test`
- Migrations folder: `lib/db/migrations/`
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## System Overview
```text
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
- **API-first server actions:** Database mutations go through Next.js API routes (`app/api/**/route.ts`), not server actions/direct DB calls from pages
- **Client/service split:** `ENV` (public, client-safe) vs `SERVER_ENV` (server-only secrets like Pinata keys)
- **Singleton connections:** SQLite (`lib/db/client.ts`) and Solana RPC (`lib/solana/connection.ts`) use module-level singletons with lazy initialization
- **Service object pattern:** `dbService` is a barrel object exporting all DB functions (`lib/db/service.ts:612`)
- **Class-based service:** `TokenLaunchService` encapsulates the multi-step launch flow with status callbacks
## Layers
- Purpose: React components, pages, forms, wallet integration
- Location: `app/`, `components/`
- Contains: Next.js pages, layout, form components, reusable UI primitives, wallet provider
- Depends on: `lib/services/launchService`, `lib/services/ipfsService`, `@solana/wallet-adapter-react`
- Used by: Browser/client
- Purpose: HTTP endpoints for DB mutations and IPFS uploads (keeps secrets server-side)
- Location: `app/api/**/route.ts`
- Contains: `POST /api/tokens/create`, `GET /api/tokens/list`, `GET /api/tokens/[mintAddress]`, `POST /api/ipfs/upload-file`, `POST /api/ipfs/upload-metadata`, `POST /api/tokens/update-fees`
- Depends on: `lib/db/service`, `lib/meteora/client`, `config/environment` (SERVER_ENV)
- Used by: Client-side fetch calls and cron job
- Purpose: Orchestrate complex operations like token launches, IPFS uploads, price fetching
- Location: `lib/services/`
- Contains: `launchService.ts`, `ipfsService.ts`, `priceService.ts`
- Depends on: `lib/solana/*`, `lib/meteora/*`, `lib/db/service` (launch service calls DB after on-chain success)
- Used by: UI components, API routes
- Purpose: Solana transaction building, Meteora pool creation, token metadata
- Location: `lib/solana/`, `lib/meteora/`
- Contains: `connection.ts`, `tokenUtils.ts`, `metadataUtils.ts`, `poolUtils.ts`, `client.ts`, `polling-strategy.ts`
- Depends on: `@solana/web3.js`, `@solana/spl-token`, `@meteora-ag/cp-amm-sdk`, `@metaplex-foundation/*`
- Used by: `lib/services/launchService.ts`
- Purpose: SQLite database schema, migrations, query layer
- Location: `lib/db/`
- Contains: `client.ts` (connection), `schema/` (Drizzle ORM schema), `service.ts` (query functions), `migrations/`
- Depends on: `better-sqlite3`, `drizzle-orm`
- Used by: API routes, cron job, launch page (after on-chain success)
- Purpose: Environment validation, startup checks
- Location: `config/`, `lib/validation/`, `lib/cron/`
- Contains: `environment.ts`, `startup.ts`, `fee-updater.ts`
- Depends on: `zod` (implied by startup validation)
- Used by: App init, cron job scheduling
## Data Flow
### Primary Request Path: Token Launch
### Token Listing / Detail Flow
### Background Fee Update Flow
## Key Abstractions
- Purpose: Encapsulates the multi-step, stateful token launch process with progress callbacks
- File: `lib/services/launchService.ts`
- Pattern: Class with status callback injection; each step updates progress
- Purpose: Database-agnostic CRUD abstraction (could migrate from SQLite)
- File: `lib/db/service.ts:612`
- Pattern: Barrel object exporting all functions; uses Drizzle ORM query builder
- Purpose: Prevent server secrets leaking to client
- Files: `config/environment.ts`
- Pattern: `ENV` (public, `NEXT_PUBLIC_*` prefixed) vs `SERVER_ENV` (server-only)
- Purpose: Dynamically adjust how frequently each token's pool metrics are refreshed
- File: `lib/meteora/polling-strategy.ts`
- Pattern: Pure function `calculateNextUpdateTime(launchDate)` returns interval + next timestamp
## Entry Points
- Location: `app/layout.tsx`
- Triggers: Next.js renders root layout on every request
- Responsibilities: Mounts `SolanaProvider`, `ThemeProvider`, `Header`, `Footer`; imports `app/init.ts` to trigger cron
- `POST /api/tokens/create` — `app/api/tokens/create/route.ts` — persists successful token launch
- `GET /api/tokens/list` — `app/api/tokens/list/route.ts` — paginated token listing
- `GET /api/tokens/[mintAddress]` — `app/api/tokens/[mintAddress]/route.ts` — token detail + stats
- `POST /api/ipfs/upload-file` — `app/api/ipfs/upload-file/route.ts` — server-side IPFS upload (keeps API keys secret)
- `POST /api/ipfs/upload-metadata` — `app/api/ipfs/upload-metadata/route.ts` — server-side metadata JSON upload
- `POST /api/tokens/update-fees` — `app/api/tokens/update-fees/route.ts` — manual trigger for fee updates
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
### Module-Level Mutable Singletons Without Cleanup
## Error Handling
- API routes catch all errors, log to `console.error`, and return `NextResponse.json({ error, details }, { status: 500 })`
- `TokenLaunchService` catches errors in `launchToken()`, calls `updateStatus({ step: "error", ... })`, then re-throws so the UI can display it
- Background cron records failures per-token in `feeUpdateSchedule.consecutiveFailures` and `lastError`
## Cross-Cutting Concerns
- Form validation: `react-hook-form` + Zod in `TokenLaunchForm.tsx`
- Startup validation: `lib/validation/startup.ts` checks required env vars before app starts
- API route validation: Manual param checks in each route handler
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
