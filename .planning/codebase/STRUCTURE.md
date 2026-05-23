# Codebase Structure

**Analysis Date:** 2026-05-23

## Directory Layout

```
/home/geeklad/OpenLaunch/
├── app/                     # Next.js App Router (pages, layouts, API routes)
│   ├── api/                 # Server-side API endpoints
│   │   ├── init/            # App initialization trigger endpoint
│   │   ├── ipfs/            # IPFS upload proxy (keeps API keys secret)
│   │   └── tokens/          # Token CRUD and fee update endpoints
│   ├── launch/              # Token launch form page
│   ├── tokens/              # Token listing and detail pages
│   ├── globals.css          # Global Tailwind styles
│   ├── init.ts              # Side-effect import to trigger lib/init.ts
│   ├── layout.tsx           # Root layout (providers, header, footer)
│   └── page.tsx             # Landing / marketing page
├── components/              # React components organized by domain
│   ├── forms/               # Form components (TokenLaunchForm)
│   ├── layout/              # Header, Footer
│   ├── providers/           # SolanaProvider, ThemeProvider
│   ├── token-detail/        # ExternalLinks component
│   ├── tokens/              # TokenCard component
│   ├── ui/                  # Reusable UI primitives (Button, Card, Input, etc.)
│   └── wallet/              # WalletButton component
├── config/                  # Environment configuration
│   └── environment.ts       # ENV (public) and SERVER_ENV (server-only)
├── lib/                     # Core application logic
│   ├── cron/                # Background cron jobs
│   ├── db/                  # Database layer
│   │   ├── migrations/        # Drizzle migration SQL files + meta
│   │   ├── schema/            # Drizzle ORM table schemas
│   │   ├── client.ts          # SQLite connection (singleton)
│   │   ├── migrate.ts         # Migration runner
│   │   ├── seed.ts            # Database seed script
│   │   ├── service.ts         # DB query abstraction layer
│   │   └── test.ts            # DB health check script
│   ├── meteora/             # Meteora DAMMv2 integration
│   ├── services/            # Business logic services
│   ├── solana/              # Solana blockchain utilities
│   ├── utils/               # General utilities (keypair parsing)
│   ├── validation/          # Startup config validation
│   ├── init.ts              # Application init (cron, validation)
│   └── utils.ts             # Shared utility functions
├── public/                  # Static assets (logo.svg, favicon)
├── scripts/                 # Utility scripts (empty as of audit)
├── types/                   # Shared TypeScript types
│   └── token.ts             # Token domain types (TokenFormData, TokenMetadata, etc.)
├── docker/                  # Docker configuration
├── .planning/codebase/      # GSD codebase maps (this directory)
├── drizzle.config.ts        # Drizzle ORM configuration
├── next.config.ts           # Next.js configuration (standalone output, webpack overrides)
├── package.json             # Dependencies (Solana, Meteora, Drizzle, Next.js 16)
├── tailwind.config.ts       # Tailwind CSS theme configuration
└── tsconfig.json            # TypeScript configuration (path alias `@/*`)
```

## Directory Purposes

**`app/`: Next.js App Router**
- Purpose: All routable pages, layouts, and API routes
- Contains: `layout.tsx`, `page.tsx`, `[dynamic]/page.tsx`, `api/**/route.ts`
- Key files: `app/layout.tsx`, `app/launch/page.tsx`, `app/api/tokens/create/route.ts`
- Convention: API routes use `export async function POST/GET(request)`; pages use `"use client"` for wallet-interactive flows

**`components/`: React Components**
- Purpose: Reusable and page-specific React components
- Contains: UI primitives, forms, layout, wallet integration
- Key files: `components/forms/TokenLaunchForm.tsx`, `components/providers/SolanaProvider.tsx`, `components/tokens/TokenCard.tsx`
- Convention: Domain subdirectories (`forms/`, `tokens/`, `ui/`) organize components by use case

**`lib/`: Application Logic**
- Purpose: Core business logic, blockchain integration, database, cron
- Contains: `services/`, `solana/`, `meteora/`, `db/`, `cron/`, `validation/`, `utils/`
- Key files: `lib/services/launchService.ts`, `lib/db/service.ts`, `lib/solana/poolUtils.ts`
- Convention: Feature-based subdirectories; `lib/init.ts` is the application bootstrap

**`config/`: Environment Configuration**
- Purpose: Centralized env var access with client/server split
- Key files: `config/environment.ts`
- Convention: `ENV` for public vars (prefixed `NEXT_PUBLIC_`), `SERVER_ENV` for secrets

**`types/`: Shared TypeScript Types**
- Purpose: Domain-level type definitions used across layers
- Key files: `types/token.ts`
- Convention: Co-located with the domain; no barrel file (import from specific files)

**`public/`: Static Assets**
- Purpose: Images, logos, favicons served directly
- Contains: `logo.svg`, `favicon.ico`, `logo.png`
- Convention: Files referenced by path string in Image components

## Key File Locations

**Entry Points:**
- `app/layout.tsx`: Root layout, triggers `app/init.ts` import, mounts providers
- `app/init.ts`: Side-effect module that imports `lib/init.ts`
- `lib/init.ts`: Application bootstrap — validates config, starts cron job

**Configuration:**
- `config/environment.ts`: All environment variables accessed here
- `next.config.ts`: Next.js runtime config, webpack overrides, standalone output
- `drizzle.config.ts`: Drizzle ORM migration configuration
- `tailwind.config.ts`: Tailwind CSS theme tokens

**Core Logic:**
- `lib/services/launchService.ts`: Token launch orchestration (533 lines)
- `lib/db/service.ts`: Database query abstraction (641 lines)
- `lib/solana/poolUtils.ts`: Meteora DAMMv2 pool creation (383 lines)
- `lib/solana/metadataUtils.ts`: Metaplex metadata account creation (306 lines)
- `lib/solana/tokenUtils.ts`: SPL token mint/mint-to/revoke (271 lines)

**Testing / Dev Scripts:**
- `lib/db/migrate.ts`: Run database migrations
- `lib/db/seed.ts`: Seed database with test data
- `lib/db/test.ts`: Database health check
- `check-fees.mjs`: Standalone script for checking pool fees

**API Routes:**
- `app/api/tokens/create/route.ts`: Persist token after launch
- `app/api/tokens/list/route.ts`: Paginated token listing
- `app/api/tokens/[mintAddress]/route.ts`: Token detail + pool stats
- `app/api/tokens/update-fees/route.ts`: Manual fee update trigger
- `app/api/ipfs/upload-file/route.ts`: Server-side file upload to Pinata/Filebase
- `app/api/ipfs/upload-metadata/route.ts`: Server-side metadata JSON upload

## Naming Conventions

**Files:**
- Components: PascalCase matching exported component name — `TokenLaunchForm.tsx`, `TokenCard.tsx`
- Utilities/Services: camelCase — `launchService.ts`, `poolUtils.ts`, `fee-updater.ts`
- API routes: `route.ts` inside descriptive directory — `app/api/tokens/create/route.ts`
- Pages: `page.tsx` inside route directory — `app/tokens/page.tsx`
- Schema files: plural kebab-case — `pool-stats-history.ts`, `fee-update-schedule.ts`

**Directories:**
- Feature-based kebab-case — `token-detail/`, `pool-stats-history/`
- General categories lowercase — `lib/`, `app/`, `config/`, `types/`

**Functions:**
- Exported utilities: camelCase verb-noun — `getPoolMetrics()`, `createMint()`, `updateTokenFees()`
- Classes: PascalCase noun — `TokenLaunchService`, `CpAmm`
- React components: PascalCase — `TokenLaunchForm`, `SolanaProvider`

**Database:**
- Table names: snake_case — `pool_stats_history`, `fee_update_schedule`
- Column names: snake_case — `mint_address`, `cumulative_fees_snapshot`
- Drizzle tables: camelCase exported const — `poolStatsHistory`, `feeUpdateSchedule`

## Where to Add New Code

**New Page:**
- Page component: `app/[route-name]/page.tsx`
- If it needs API data: add corresponding `app/api/[route-name]/route.ts`

**New API Route:**
- Handler: `app/api/[resource]/[action]/route.ts`
- Business logic: delegate to `lib/services/` or `lib/db/service.ts`

**New Database Table:**
- Schema: `lib/db/schema/[table-name].ts`
- Export from: `lib/db/schema/index.ts`
- Add query functions to: `lib/db/service.ts`
- Generate migration: `npm run db:generate`

**New Solana Utility:**
- File: `lib/solana/[utility-name].ts`
- Export from: no barrel file, import directly
- Used by: `lib/services/launchService.ts` or new service

**New Component:**
- Domain component: `components/[domain]/[ComponentName].tsx` (e.g., `components/forms/`, `components/tokens/`)
- Reusable UI primitive: `components/ui/[ComponentName].tsx`

**New Type:**
- Domain type: `types/[domain].ts` (e.g., `types/token.ts`)
- Import from: `import { TypeName } from "@/types/[domain]"`

**New External Service Integration:**
- Client/service: `lib/[service-name]/client.ts`
- Polling/strategy (if applicable): `lib/[service-name]/polling-strategy.ts`
- Used by: `lib/services/` or `lib/cron/`

## Special Directories

**`app/api/`: Server-Only Code**
- Purpose: API routes that must not import browser-only modules
- Constraint: `runtime = "nodejs"` and `dynamic = "force-dynamic"` on IPFS routes to ensure server execution
- Never import `@solana/wallet-adapter-react` here

**`lib/db/migrations/`: Generated Migrations**
- Purpose: Auto-generated by `drizzle-kit generate`
- Generated: Yes
- Committed: Yes (required for `db:migrate` to work in production)
- Do not edit `.sql` files manually after generation

**`components/ui/`: UI Primitive Components**
- Purpose: Low-level reusable components (Button, Card, Input, Countdown)
- Pattern: Built with Tailwind + `class-variance-authority` for variants
- Used by: Higher-level domain components throughout `components/`

---

*Structure analysis: 2026-05-23*
