# Architecture Patterns: Configurable Launch Parameters

**Domain:** Solana Token Launchpad (Meteora DAMMv2)
**Researched:** 2026-05-23
**Confidence:** HIGH (verified against Meteora SDK docs and current codebase)

## Executive Summary

Adding user-configurable launch parameters (fee scheduler modes, holdback %, quote token selection, fee token mode) to an existing Next.js + Meteora DAMMv2 launchpad requires extending the existing layered architecture at four integration points: form validation, service orchestration, transaction building, and data persistence. The Meteora SDK natively supports all required parameter variations via `createCustomPool` and `getBaseFeeParams`, so the architectural challenge is **parameter routing** — cleanly propagating user choices from the UI through the service layer to the correct SDK function signatures and database records, while maintaining the existing transaction batching and error recovery flows.

## Current Architecture Recap

The existing system follows a four-layer stack:

```
UI Layer (React + Tailwind + shadcn/ui)
    ↓ fetch()/form submit
API Routes Layer (Next.js App Router routes)
    ↓ imports
Service Layer (TokenLaunchService, IPFS Service, Price Service)
    ↓ calls
Blockchain Layer (tokenUtils, metadataUtils, poolUtils)
    ↓ SDK calls
Meteora DAMMv2 SDK + Solana Web3.js
```

The launch flow is a 3-transaction sequence: (1) create mint, (2) mint tokens + metadata + revoke authorities, (3) create DAMMv2 pool. All three are signed at once via `wallet.signAllTransactions`, then submitted sequentially.

## Target Architecture with Configurable Parameters

### High-Level Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              UI Layer (React)                                │
│  TokenLaunchForm.tsx — Default view + Advanced Options collapsible section   │
│  ├─ Basic: symbol, name, logo, description                                   │
│  ├─ Advanced: feeSchedulerMode, holdbackPercent, quoteToken, feeTokenMode,  │
│  │            totalSupply, initialPrice, priceRangeMin/Max                   │
│  └─ Validation: react-hook-form + Zod (conditional schemas per mode)        │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │ TokenFormData (extended type)
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Service Layer                                      │
│  TokenLaunchService.launchToken()                                            │
│  ├─ Step 1: Mint creation (unchanged)                                        │
│  ├─ Step 2: Mint tokens + metadata + revoke (unchanged)                      │
│  ├─ Step 3: createDAMMv2Pool() — parameter mapping happens here               │
│  │   • Calculates tokenAAmount after holdback deduction                      │
│  │   • Maps feeSchedulerMode → BaseFeeMode + param struct                   │
│  │   • Maps quoteToken → tokenBMint + tokenBDecimals                         │
│  │   • Maps feeTokenMode → CollectFeeMode                                    │
│  │   • Passes totalSupply/initialPrice/priceRange to pool math              │
│  └─ Step 4: DB persistence via POST /api/tokens/create                      │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │ CreatePoolParams (extended interface)
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Blockchain Layer                                    │
│  lib/solana/poolUtils.ts — createDAMMv2Pool()                                │
│  ├─ Fee config builder: getBaseFeeParams()                                   │
│  │   • Time-based → BaseFeeMode.FeeTimeSchedulerLinear/Exponential          │
│  │   • Market-cap → BaseFeeMode.FeeMarketCapSchedulerLinear/Exponential      │
│  │   • Disabled → baseFeeMode: 0 (fixed fee)                                 │
│  ├─ Collect fee mode: CollectFeeMode.OnlyB (default) or BothToken           │
│  ├─ Quote token: tokenBMint + tokenBDecimals (SOL=9, USDC=6)                │
│  └─ Price math: priceToSqrtPrice() adjusted for token B decimals            │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │ PoolFeesParams + transaction
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Meteora SDK + Solana RPC                              │
│  cpAmm.createCustomPool({ poolFees, collectFeeMode, tokenBMint, ... })      │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Data Layer (SQLite + Drizzle)                       │
│  POST /api/tokens/create                                                     │
│  ├─ tokens table: mint, name, symbol, metadata_uri, created_at               │
│  ├─ pool_stats table: pool_address, fee_rate, cumulative_fees, etc.         │
│  └─ NEW: token_launch_params table (or extend tokens table)                  │
│      • holdback_percent, fee_scheduler_mode, fee_token_mode,                 │
│      • quote_token_mint, total_supply, initial_price, price_range          │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Boundaries

| Component | Responsibility | Communicates With | Interface/Type |
|-----------|---------------|-------------------|----------------|
| **TokenLaunchForm** | Render form, collect inputs, client-side validation, red-flag warnings (holdback >10%) | `onSubmit(data: TokenFormData)` → Launch page | `TokenFormData` (extended) |
| **Zod Schema** | Conditional validation rules: e.g., `startingFeeRate` required only when mode != disabled; `priceMultiple` required only for market-cap mode | Used by `TokenLaunchForm` | `tokenFormSchema` with `.superRefine()` |
| **Launch Page** (`app/launch/page.tsx`) | Wallet balance check, instantiate `TokenLaunchService`, handle DB save after on-chain success | `TokenLaunchService.launchToken()`, then `fetch("/api/tokens/create")` | `TokenLaunchConfig` |
| **TokenLaunchService** | Orchestrate 3-transaction flow; map form data to SDK parameters; handle retry logic for timed launches | `createMint()`, `mintTokens()`, `createMetadataAccount()`, `createDAMMv2Pool()`, API routes | `TokenFormData` → `CreatePoolParams` |
| **poolUtils** | Pure transaction building: compute sqrt prices, liquidity delta, encode fee params, create pool transaction | Meteora SDK (`CpAmm`, `getBaseFeeParams`, `CollectFeeMode`) | `CreatePoolParams` → `CreatePoolResult` |
| **Environment Config** | Default values for all new parameters (holdback=0%, feeSchedulerMode=marketCap, feeTokenMode=onlyQuote, quoteToken=SOL, totalSupply=1B, etc.) | Used by form defaults and service fallbacks | `ENV` object |
| **DB Service** | CRUD for tokens, pool stats, and launch parameters | Drizzle ORM, SQLite | `dbService` barrel object |
| **API Routes** | `POST /api/tokens/create` — persist launch config after on-chain success | DB Service | JSON body matching schema |

## Data Flow

### Parameter Routing: Form → Transaction

```
User Input (TokenLaunchForm)
    │
    ├─ feeSchedulerMode: "marketCap" | "time" | "disabled"
    │   → form data field
    │   → TokenLaunchService reads formData.feeSchedulerMode
    │   → poolUtils.createDAMMv2Pool receives in `feeSchedule` or new `feeConfig` field
    │   → getBaseFeeParams({ baseFeeMode: BaseFeeMode.FeeMarketCapSchedulerLinear, ... })
    │   → poolFees.baseFee encoded into transaction
    │
    ├─ holdbackPercent: 0–100
    │   → form data field
    │   → TokenLaunchService: tokenAAmount = totalSupply * (1 - holdbackPercent/100)
    │   → Remaining tokens NOT minted to pool → stay in creator wallet
    │   → createDAMMv2Pool receives reduced tokenAAmount
    │
    ├─ quoteToken: "SOL" | "USDC"
    │   → form data field (or mint address input)
    │   → TokenLaunchService maps to tokenBMint PublicKey
    │   → tokenBDecimals: SOL=9, USDC=6
    │   → priceToSqrtPrice() uses tokenBDecimals for math
    │   → poolUtils receives tokenBMint + tokenBDecimals
    │
    ├─ feeTokenMode: "quoteOnly" | "quotePlusBase"
    │   → form data field
    │   → poolUtils maps to CollectFeeMode.OnlyB (1) or BothToken (0)
    │   → passed to createCustomPool({ collectFeeMode })
    │
    ├─ totalSupply, initialPrice, priceRangeMin, priceRangeMax
    │   → form data fields (defaulted from ENV)
    │   → TokenLaunchService: totalSupply replaces ENV.TOTAL_SUPPLY
    │   → initialPrice replaces ENV.INITIAL_PRICE
    │   → priceRangeMin/Max replace ENV.PRICE_RANGE_MIN/MAX
    │   → poolUtils uses these for sqrt price calculations
```

### Critical Data Flow: Holdback Percentage

Holdback is the most architecturally invasive parameter because it splits the token supply between the pool and the creator wallet.

```
ENV.TOTAL_SUPPLY (or formData.totalSupply)
    │
    ▼
tokenAAmountForPool = totalSupply * (1 - holdbackPercent / 100)
    │
    ├─→ createDAMMv2Pool({ tokenAAmount: tokenAAmountForPool })
    │   Pool receives this amount as initial liquidity
    │
    └─→ Remaining tokens stay in creator's token account after mintTokens()
        (mintTokens mints totalSupply to creator; pool deposit only sends
         tokenAAmountForPool to pool; rest stays in wallet)
```

**Warning:** If holdback is >0%, the creator's wallet must have enough SOL for rent exemption on the token account holding the un-pooled tokens. This is normally automatic (token account created during mint), but worth noting.

### Fee Scheduler Mode Routing

The Meteora SDK uses **mutually exclusive** fee modes. The architecture must enforce this at the form and service layers.

```
formData.feeSchedulerMode
    │
    ├─ "marketCap" (default)
    │   → getBaseFeeParams({
    │       baseFeeMode: BaseFeeMode.FeeMarketCapSchedulerLinear, // or Exponential
    │       feeMarketCapSchedulerParam: {
    │         startingFeeBps: formData.startingFeeRate * 100,
    │         endingFeeBps: formData.endingFeeRate * 100,
    │         numberOfPeriod: formData.numberOfPeriods || ENV.FEE_DECAY_PERIODS,
    │         priceMultiple: formData.priceMultiple || 1000,
    │         schedulerExpirationDuration: formData.schedulerExpirationDuration || 86400,
    │       }
    │     }, tokenBDecimals, ActivationType.Timestamp)
    │
    ├─ "time"
    │   → getBaseFeeParams({
    │       baseFeeMode: BaseFeeMode.FeeTimeSchedulerLinear, // or Exponential
    │       feeTimeSchedulerParam: {
    │         startingFeeBps: formData.startingFeeRate * 100,
    │         endingFeeBps: formData.endingFeeRate * 100,
    │         numberOfPeriod: formData.numberOfPeriods || ENV.FEE_DECAY_PERIODS,
    │         totalDuration: formData.decayDurationMinutes * 60,
    │       }
    │     }, tokenBDecimals, ActivationType.Timestamp)
    │
    └─ "disabled"
        → Fixed base fee mode (baseFeeMode: 0)
        → baseFeeNumerator from ENV or formData.baseFeeBps
```

## Suggested Build Order

The implementation has clear dependency chains. Build in this order to avoid rework:

### Phase 1: Foundation (Types + Schema + Config)
1. **Extend `types/token.ts`** — Add new fields to `TokenFormData` and `TokenLaunchConfig`
2. **Extend `config/environment.ts`** — Add defaults for all new parameters (holdback=0, feeSchedulerMode="marketCap", feeTokenMode="quoteOnly", quoteToken="SOL", etc.)
3. **Design DB schema extension** — Decide: extend `tokens` table or create `token_launch_params` table. Recommendation: extend `tokens` table (1:1 relationship, avoids joins).
4. **Write migration** — Add columns: `holdback_percent`, `fee_scheduler_mode`, `fee_token_mode`, `quote_token_mint`, `total_supply`, `initial_price`, `price_range_min`, `price_range_max`.

### Phase 2: Validation Layer (Independent of Blockchain)
5. **Extend Zod schema in `TokenLaunchForm.tsx`** — Add conditional validation:
   - `holdbackPercent`: number 0–100, warning (not error) if >10
   - `feeSchedulerMode`: enum ["marketCap", "time", "disabled"]
   - Conditional fields: `priceMultiple` required only for marketCap mode; `decayDurationMinutes` required only for time mode
   - `quoteToken`: enum ["SOL", "USDC"] (or mint address with validation)
   - `feeTokenMode`: enum ["quoteOnly", "quotePlusBase"]
6. **Add UI controls** — Advanced Options collapsible section with new inputs.

### Phase 3: Blockchain Layer (Pool Utils)
7. **Extend `CreatePoolParams` interface** — Add: `feeConfig` (union type), `holdbackPercent`, `quoteTokenMint`, `quoteTokenDecimals`, `feeTokenMode`, `totalSupply`, `initialPrice`, `priceRangeMin`, `priceRangeMax`
8. **Refactor `createDAMMv2Pool` in `poolUtils.ts`** — Replace `feeSchedule` flat object with discriminated union:
   ```typescript
   type FeeConfig =
     | { mode: "marketCap"; startingFeeBps: number; endingFeeBps: number; numberOfPeriod: number; priceMultiple: number; schedulerExpirationDuration: number; curve: "linear" | "exponential" }
     | { mode: "time"; startingFeeBps: number; endingFeeBps: number; numberOfPeriod: number; totalDurationSeconds: number; curve: "linear" | "exponential" }
     | { mode: "disabled"; baseFeeBps: number };
   ```
9. **Implement parameter mapping** — Switch on `feeConfig.mode` to call correct `getBaseFeeParams` overload; map `feeTokenMode` to `CollectFeeMode`; adjust price math for token B decimals.

### Phase 4: Service Layer (Orchestration)
10. **Extend `TokenLaunchService.launchToken()`** —
    - Calculate `tokenAAmount` with holdback deduction
    - Map `formData.quoteToken` to mint address and decimals
    - Build `FeeConfig` discriminated union from form data
    - Pass all new parameters to `createDAMMv2Pool`
    - Include new fields in `TokenLaunchConfig` return value
11. **Handle edge cases** —
    - If `holdbackPercent = 100%`, pool gets 0 tokens → invalid, validate before submission
    - If `quoteToken = USDC`, ensure price math uses 6 decimals
    - If `feeTokenMode = BothToken`, pool fees are collected in both tokens (affects UI expectations)

### Phase 5: Persistence Layer
12. **Extend DB service** — Update `createToken` or equivalent to persist new launch parameters.
13. **Extend API route** — `POST /api/tokens/create` accepts and validates new fields.
14. **Extend token detail page** — Display launch parameters (holdback %, fee mode, quote token) in UI.

### Phase 6: Integration & Polish
15. **Wire form → page → service** — Ensure all new form fields reach `TokenLaunchService`
16. **Add red-flag UI for holdback >10%** — Warning banner in form, not blocking
17. **Test all parameter combinations** — Market-cap vs time vs disabled; SOL vs USDC; quoteOnly vs both

## Anti-Patterns to Avoid

### Leaking SDK-Specific Types to the Form Layer
**What:** Using `BaseFeeMode` enum or `CollectFeeMode` directly in `TokenFormData`.
**Why bad:** Tight coupling between UI and Meteora SDK; SDK changes break the form.
**Instead:** Use string enums in form types (`"marketCap" | "time" | "disabled"`), map to SDK enums only in `poolUtils.ts`.

### Flattening Mutually Exclusive Parameters
**What:** Putting `priceMultiple` and `decayDurationMinutes` as optional fields on the same form object without mode gating.
**Why bad:** Validation becomes complex; users can set both and the system silently ignores one.
**Instead:** Use discriminated union types or conditional Zod validation where fields are required/relevant only based on `feeSchedulerMode`.

### Calculating Token Amounts in the UI
**What:** Computing `tokenAAmount` in React components.
**Why bad:** Business logic in presentation layer; inconsistent if changed in multiple places.
**Instead:** UI collects raw parameters (totalSupply, holdbackPercent); `TokenLaunchService` computes the actual pool amount.

### Hardcoding Quote Token Decimals
**What:** Assuming `tokenBDecimals = 9` everywhere.
**Why bad:** USDC has 6 decimals; hardcoding causes incorrect price math.
**Instead:** Pass `tokenBDecimals` as a parameter derived from `quoteToken` selection in `TokenLaunchService`.

## Scalability Considerations

| Concern | Current | With New Parameters | Mitigation |
|---------|---------|---------------------|------------|
| **Transaction size** | ~3 transactions, each under Solana limit | Same; no additional instructions | None needed |
| **Form complexity** | ~10 fields | ~20 fields | Collapsible "Advanced Options" section; progressive disclosure |
| **DB row size** | Small (token metadata + pool address) | Moderate (+8 launch parameter columns) | SQLite handles this fine; no action needed |
| **Validation complexity** | Simple Zod schema | Conditional schema with mode-dependent fields | Use `.superRefine()` or discriminated unions; centralize in one schema file |
| **SDK compatibility** | Single code path for fee scheduler | 3 code paths (marketCap/time/disabled) | Encapsulate in `poolUtils.ts`; keep service layer mode-agnostic |

## Sources

- Meteora DAMMv2 SDK documentation (Context7, `/meteoraag/damm-v2-sdk`): `getBaseFeeParams`, `BaseFeeMode` enum values, `CollectFeeMode`, `createCustomPool` signature — HIGH confidence
- Meteora official docs: Fee Market Cap Scheduler, Fee Time Scheduler — HIGH confidence
- OpenLaunch codebase (`lib/solana/poolUtils.ts`, `lib/services/launchService.ts`, `components/forms/TokenLaunchForm.tsx`, `types/token.ts`, `config/environment.ts`) — HIGH confidence

---

*Research for architecture dimension of configurable launchpad parameters. Informs phase structure in roadmap.*
