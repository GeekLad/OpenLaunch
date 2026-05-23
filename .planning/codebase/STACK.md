# Technology Stack

**Analysis Date:** 2026-05-23

## Languages

**Primary:**
- TypeScript 5.9.3 — All application code (`lib/`, `app/`, `components/`, `types/`)
- JavaScript/ESM — Configuration files (`eslint.config.mjs`, `postcss.config.mjs`, scripts)
- CSS — Styling (`app/globals.css`)

## Runtime

**Environment:**
- Node.js 24.10.0 (specified in `docker/Dockerfile`)
- Next.js 16.0.1 (React framework, App Router)
- React 19.2.0 + React DOM 19.2.0

**Package Manager:**
- npm (package-lock.json present)
- Lockfile: present

## Frameworks

**Core:**
- Next.js 16.0.1 — Full-stack React framework with App Router (`app/`)
- React 19.2.0 — UI library
- Tailwind CSS 3.4.18 — Utility-first CSS framework (`tailwind.config.ts`)
- Drizzle ORM 0.44.7 — Type-safe SQL-like ORM for SQLite

**Blockchain:**
- @solana/web3.js 1.98.4 — Core Solana blockchain SDK
- @solana/spl-token 0.4.14 — SPL token program interactions
- @solana/wallet-adapter-react 0.15.39 — React wallet connection (`components/providers/SolanaProvider.tsx`)
- @solana/wallet-adapter-wallets 0.19.37 — Wallet adapters (Phantom, Solflare, Ledger, etc.)
- @metaplex-foundation/mpl-token-metadata 3.4.0 — Metaplex token metadata program
- @metaplex-foundation/umi 1.4.1 + umi-bundle-defaults + umi-web3js-adapters — Metaplex UMI framework for metadata operations
- @meteora-ag/cp-amm-sdk — Meteora DAMMv2 concentrated liquidity AMM SDK (`lib/solana/poolUtils.ts`)
- bs58 6.0.0 — Base58 encoding for Solana addresses and keys

**Form & Validation:**
- react-hook-form 7.66.0 — Form state management (`components/forms/TokenLaunchForm.tsx`)
- @hookform/resolvers 5.2.2 — Form validation resolvers
- zod 3.25.76 — Schema validation and TypeScript type inference

**UI Components:**
- lucide-react 0.553.0 — Icon library
- class-variance-authority 0.7.1 — Component variant management
- clsx 2.1.1 + tailwind-merge 3.4.0 — Conditional className utilities
- tailwindcss-animate 1.0.7 — Tailwind animation utilities

**Background Jobs:**
- node-cron 4.2.1 — Cron-based scheduling for fee updates (`lib/cron/fee-updater.ts`)

## Key Dependencies

**Critical:**
- `@solana/web3.js` — All blockchain interactions (mint creation, transactions, pool creation)
- `@meteora-ag/cp-amm-sdk` — DAMMv2 pool creation and management
- `@solana/spl-token` — Token minting, ATA creation, authority revocation
- `better-sqlite3` 12.4.1 — SQLite database driver (`lib/db/client.ts`)
- `drizzle-orm` — Database operations and migrations

**Infrastructure:**
- `date-fns` 4.1.0 — Date manipulation utilities
- `next` — Framework runtime

**Build/Dev:**
- `typescript` 5.9.3 — Type checking
- `tsx` 4.20.6 — TypeScript execution for scripts and migrations
- `drizzle-kit` 0.31.6 — Database migration generation and studio
- `eslint` 9.39.1 + `eslint-config-next` 16.0.3 — Linting
- `autoprefixer` 10.4.21 + `postcss` 8.5.6 — CSS processing

## Configuration

**Environment:**
- `.env.local` (not committed) — Runtime configuration
- `.env.local.example` — Template showing all required variables
- `config/environment.ts` — Centralized env variable parsing with defaults

**Key Configs:**
- `next.config.ts` — Next.js config (standalone output, Turbopack aliases, webpack fallbacks for fs/os/path/crypto, remote image patterns for IPFS)
- `tsconfig.json` — TypeScript strict mode, bundler module resolution, path alias `@/*`
- `tailwind.config.ts` — Dark mode, custom color tokens, chart colors, border radius
- `drizzle.config.ts` — SQLite dialect, schema at `lib/db/schema/index.ts`, migrations at `lib/db/migrations`
- `eslint.config.mjs` — Next.js core-web-vitals + TypeScript rules, no-unused-vars, no-explicit-any, no-unused-expressions
- `postcss.config.mjs` — TailwindCSS + Autoprefixer

**Build:**
- Docker multi-stage build (`docker/Dockerfile`: deps → builder → runner)
- Next.js standalone output for production
- Healthcheck endpoint: `GET /api/init`

## Platform Requirements

**Development:**
- Node.js 24+ (matching Dockerfile)
- npm 10+
- Native build tools (python3, make, g++) for better-sqlite3 compilation

**Production:**
- Docker container (node:24.10.0-slim based)
- Exposes port 3000
- SQLite database persisted to `./data/` (configurable via `DATA_DIR`)
- Cron jobs auto-start in production (`NODE_ENV=production`) or when `ENABLE_CRON=true`

---

*Stack analysis: 2026-05-23*
