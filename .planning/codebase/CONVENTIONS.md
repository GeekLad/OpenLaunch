# Coding Conventions

**Analysis Date:** 2026-05-23

## Naming Patterns

**Files:**
- Utility/service files: `camelCase.ts` — `tokenUtils.ts`, `poolUtils.ts`, `launchService.ts`, `keypairUtils.ts`
- Component files: `PascalCase.tsx` — `TokenLaunchForm.tsx`, `SolanaProvider.tsx`, `WalletButton.tsx`
- Schema/model files: `kebab-case.ts` — `pool-stats-history.ts`, `fee-update-schedule.ts`
- Barrel indexes: `index.ts` — `lib/db/schema/index.ts`, `lib/cron/index.ts`

**Functions:**
- Exported utilities: `camelCase` — `createMint()`, `getPoolMetrics()`, `validateAndParsePrivateKey()`
- React components: `PascalCase` — `TokenLaunchForm`, `SolanaProvider`
- Private methods: `camelCase` prefixed — `updateStatus()` in `TokenLaunchService`

**Variables:**
- Constants: `UPPER_SNAKE_CASE` for true constants — `DEFAULT_COMMITMENT`, `DAMM_V2_PROGRAM_ID`
- Configuration: `ENV` and `SERVER_ENV` objects in `config/environment.ts`
- React state: `camelCase` with `useState` — `enableFeeScheduler`, `logoPreview`

**Types:**
- Interfaces: `PascalCase` — `TokenCreateInput`, `PoolStatsInput`, `LaunchStatus`
- Drizzle-inferred types: `Token`, `NewToken` from `typeof tokens.$inferSelect`
- Function result types: `PascalCase` with suffix — `CreateMintResult`, `MintTokensResult`

## Code Style

**Formatting:**
- No Prettier configuration file detected
- Indentation: 2 spaces (observed in all files)
- Semicolons: Required (enforced by TypeScript strict mode)
- Quotes: Double quotes for strings in source files

**Linting:**
- ESLint config: `eslint.config.mjs`
- Base: `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`
- Custom rules:
  - `@typescript-eslint/no-unused-vars`: `error`
  - `@typescript-eslint/no-explicit-any`: `error`
  - `@typescript-eslint/no-unused-expressions`: `error`
- Run: `npm run lint` (runs `type-check && eslint .`)
- Fix: `npm run lint:fix` (runs `eslint . --fix`)

**TypeScript:**
- `strict: true` in `tsconfig.json`
- Target: `ES2017`
- Module resolution: `bundler`
- Path alias: `@/*` maps to `./*`
- JSX: `react-jsx`

## Import Organization

**Order:**
1. External packages (React, Next.js, Solana SDKs)
2. Internal utilities via `@/` alias
3. Relative imports (within same module)

**Example from `lib/services/launchService.ts`:**
```typescript
import { Connection, PublicKey, Transaction, Keypair } from "@solana/web3.js"; // External
import { TokenFormData, LaunchStatus, TokenLaunchConfig } from "@/types/token"; // Types
import { ENV } from "@/config/environment"; // Config
import { getConnection, getRecentBlockhash, confirmTransaction } from "@/lib/solana/connection"; // Internal utils
```

**Path Aliases:**
- `@/config/environment` — environment variables
- `@/lib/*` — all library code
- `@/components/*` — React components
- `@/types/*` — shared TypeScript types

## Error Handling

**Patterns:**
- Standard try-catch with typed error extraction:
  ```typescript
  try {
    // operation
  } catch (error) {
    console.error("[Tag] Error description:", error);
    return NextResponse.json(
      { error: "Failed to ...", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
  ```
- Error prefixing with component/service tag in brackets: `[Database]`, `[API]`, `[Cron]`, `[Meteora API]`
- `instanceof Error` check before accessing `.message`
- API routes return structured error responses with both `error` (user-friendly) and `details` (technical)

**Validation:**
- Zod schemas for form validation — `tokenFormSchema` in `components/forms/TokenLaunchForm.tsx`
- `superRefine` for cross-field validation (custom private key when enabled)
- Custom validation functions — `validateImageFile()`, `validateMetadata()`

## Logging

**Framework:** Console only (no structured logging library)

**Patterns:**
- Prefixed tags: `[Database]`, `[API]`, `[Cron]`, `[Meteora API]`, `[Migrations]`, `[App Init]`, `[Price Service]`
- Success markers: `✓` (checkmark) for success logs
- Error markers: `✗` or `❌` for errors
- Warning markers: `⚠️` for warnings
- Structured startup output with emoji bullets in `lib/validation/startup.ts`

## Comments

**When to Comment:**
- Every exported function has JSDoc with `@param` and `@returns`
- Complex logic sections have inline explanations
- Section dividers in large files: `// ============================================================================`
- Schema columns have inline comments explaining purpose

**JSDoc/TSDoc:**
- Full JSDoc on public API functions
- Example: `lib/db/service.ts`, `lib/solana/tokenUtils.ts`, `lib/utils.ts`
- Type descriptions in interface fields

## Function Design

**Size:**
- Large service methods exist (e.g., `TokenLaunchService.launchToken()` is ~500 lines)
- Utility functions are small and focused (10-30 lines typical)

**Parameters:**
- Prefer object parameters for complex functions — `CreatePoolParams`, `CreateMetadataParams`
- Default values for optional params: `decimals: number = ENV.TOKEN_DECIMALS`

**Return Values:**
- Always return typed objects, never implicit returns for public APIs
- Null returns for "not found" cases: `Promise<Token | null>`

## Module Design

**Exports:**
- Named exports exclusively (no default exports observed in library code)
- Service object pattern: `export const dbService = { createToken, getToken, ... }` in `lib/db/service.ts`
- Barrel files re-export from submodules: `lib/db/schema/index.ts`

**Barrel Files:**
- `lib/db/schema/index.ts` — exports all schema modules
- Used for clean imports: `import * as schema from './schema'`

## React Patterns

**Components:**
- "use client" directive for client-side components
- Functional components with typed props interface
- `React.forwardRef` for UI primitives (`Button`, `Input`)
- `FC<PropsType>` type annotation observed in providers

**State Management:**
- Local React state with `useState` (no global state library like Zustand/Redux)
- `react-hook-form` + `zodResolver` for form state
- Watch values with `watch()` from react-hook-form

## Database Patterns

**ORM:** Drizzle ORM with `better-sqlite3`
- Schema-first: define tables in `lib/db/schema/*.ts`
- Type inference: `export type Token = typeof tokens.$inferSelect`
- Indexes defined inline with table schema
- Foreign keys with `onDelete: 'cascade'`

**Migration:**
- Drizzle Kit for migrations (`drizzle.config.ts`)
- CLI scripts: `db:generate`, `db:migrate`, `db:seed`, `db:test`
- Migrations folder: `lib/db/migrations/`

---

*Convention analysis: 2026-05-23*
