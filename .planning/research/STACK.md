# Technology Stack

**Project:** OpenLaunch
**Researched:** 2026-05-23
**Confidence:** HIGH

## Recommended Stack

### Core Framework (unchanged)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 16.0.1 | Full-stack React framework (App Router) | Already in use; no migration needed |
| React | 19.2.0 | UI library | Locked to Next.js 16 peer dependency |
| Tailwind CSS | 3.4.18 | Utility-first styling | Existing design system |
| TypeScript | 5.9.3 | Type safety | Existing codebase |

### Database & ORM (unchanged)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Drizzle ORM | 0.44.7 | Type-safe SQL ORM | Existing; no schema changes required for this milestone |
| better-sqlite3 | 12.4.1 | SQLite driver | Existing; native module, no changes |

### Blockchain SDK (critical update)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @solana/web3.js | 1.98.4 | Core Solana SDK | Existing; no breaking changes needed |
| @solana/spl-token | 0.4.14 | SPL token interactions | Existing; supports USDC (standard SPL) and Token-2022 |
| @solana/wallet-adapter-react | 0.15.39 | Wallet connection | Existing; no UI changes needed |
| @meteora-ag/cp-amm-sdk | **1.4.3** | DAMMv2 pool creation & fee scheduling | **Upgrade required** — latest version adds `FeeMarketCapSchedulerLinear` and `FeeMarketCapSchedulerExponential` modes, plus `getFeeMarketCapSchedulerParams()` helper |

**Why upgrade to 1.4.3:** The current `^1.2.3` does not expose market-cap-based fee scheduler constructors. SDK 1.4.3 adds:
- `BaseFeeMode.FeeMarketCapSchedulerLinear = 3`
- `BaseFeeMode.FeeMarketCapSchedulerExponential = 4`
- `getFeeMarketCapSchedulerParams(startingBaseFeeBps, endingBaseFeeBps, baseFeeMode, numberOfPeriod, priceMultiple, schedulerExpirationDuration)`
- `validateFeeMarketCapScheduler(...)` for pre-flight checks

### Form & Validation (unchanged)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| react-hook-form | 7.66.0 | Form state management | Existing; sufficient for new advanced fields |
| zod | 3.25.76 | Schema validation | Existing; can validate new numeric ranges and enums |
| @hookform/resolvers | 5.2.2 | Zod ↔ RHF bridge | Existing |

### UI Components (no new packages)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui Collapsible / Accordion | n/a (copy component) | Advanced Options section | Wrap all new optional fields so default form stays simple |
| shadcn/ui Slider | n/a (copy component) | Holdback %, price range inputs | Better UX than raw number inputs for bounded percentages |
| lucide-react | 0.553.0 | Icons | Existing; warning icons for red-flag states |

**No new npm dependencies needed for UI.** The project already uses Tailwind + shadcn/ui primitives. Adding `@radix-ui/react-collapsible`, `@radix-ui/react-slider`, etc., is done via `npx shadcn add collapsible slider`, which copies code into `components/ui/` rather than adding runtime dependencies.

### Background Jobs (unchanged)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| node-cron | 4.2.1 | Cron scheduling | Existing; fee-update cron job continues unchanged |

### Supporting Libraries (unchanged)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| bn.js | 5.2.2 | Big-number math for Solana | Already transitive via `@meteora-ag/cp-amm-sdk`; explicitly imported in `poolUtils.ts` |
| bs58 | 6.0.0 | Base58 encoding | Existing; keypair handling |
| date-fns | 4.1.0 | Date math | Existing; launch-time scheduling |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Fee scheduler SDK | Upgrade to 1.4.3 | Stay on 1.2.3 + hand-roll market-cap math | SDK 1.4.3 provides audited, protocol-native market-cap scheduler with on-chain validation; hand-rolling risks desync with Meteora program logic |
| UI slider | shadcn/ui Slider | `@radix-ui/react-slider` directly | shadcn/ui is already the project's component pattern; direct Radix adds no value |
| USDC mint detection | Hardcode known mints | Fetch from on-chain registry | Solana has no canonical stablecoin registry; hardcoding mainnet (`EPjFW...`) and devnet (`4zMMC...`) USDC mints is standard practice and avoids RPC call |
| Advanced options toggle | shadcn/ui Collapsible | Custom `<details>` element | Collapsible gives better animation control and accessibility hooks (open/close state for RHF conditional fields) |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `CollectFeeMode.Compounding` (mode 2) | Project requirements explicitly scope fee collection to "quote-only" or "quote+base"; compounding auto-reinvests fees into the pool, which changes liquidity dynamics and is not requested | `CollectFeeMode.OnlyB` (default) or `CollectFeeMode.BothToken` (advanced option) |
| Custom price oracle (Pyth, Chainlink) for market cap | Requirement says "rely on Meteora's on-chain fee scheduler behavior" and "real-time market cap calculation inside the launch transaction" is out of scope | Meteora's native `FeeMarketCapScheduler` handles market-cap-derived fee adjustments internally |
| `BaseFeeMode.RateLimiter` (mode 2) | Rate limiter ties fees to trade volume/reference amount, not market cap or time; not aligned with user's request for market-cap scheduler as default | `FeeMarketCapSchedulerExponential` (default) or `FeeTimeSchedulerExponential` (fallback) |
| New form library (e.g., Formik) | react-hook-form + zod already covers all new fields; switching libraries is unnecessary churn | Keep react-hook-form; add conditional field registration with `useWatch` or `watch` |

## Installation

```bash
# 1. Upgrade Meteora SDK (critical)
npm install @meteora-ag/cp-amm-sdk@^1.4.3

# 2. Add shadcn/ui primitives for advanced options UI
npx shadcn add collapsible
npx shadcn add slider

# No other new runtime dependencies required.
```

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| @meteora-ag/cp-amm-sdk@1.4.3 | @solana/web3.js@1.98.4 | SDK 1.4.3 declares peer `^1.95.3`; 1.98.4 is forward-compatible |
| @meteora-ag/cp-amm-sdk@1.4.3 | bn.js@5.2.2 | SDK depends on bn.js@5.2.2 directly; no version conflicts |
| Next.js 16.0.1 | React 19.2.0 | Locked by framework; do not upgrade React independently |

## Feature-to-Stack Mapping

| New Requirement | Stack Change | SDK/API Detail |
|-----------------|--------------|----------------|
| Market-cap-based fee scheduler (default) | Upgrade `@meteora-ag/cp-amm-sdk` to 1.4.3 | Use `getFeeMarketCapSchedulerParams(startingBaseFeeBps, endingBaseFeeBps, BaseFeeMode.FeeMarketCapSchedulerExponential, numberOfPeriod, priceMultiple, schedulerExpirationDuration)` |
| Time-based fee scheduler (fallback option) | Already supported in 1.4.3 | Keep existing `getFeeSchedulerParams(..., BaseFeeMode.FeeTimeSchedulerExponential, ...)` call path |
| Disable fee scheduler | Already supported | Use fixed fee mode (`BaseFeeMode` value `0` — fixed) with `bpsToFeeNumerator(baseFeeBps)` |
| User-configurable fee token mode | Use SDK enum | `CollectFeeMode.OnlyB` (default) vs `CollectFeeMode.BothToken` (advanced). Pass as `collectFeeMode` in `createCustomPool()` |
| User-configurable quote token (SOL/USDC) | No SDK change; pass different `tokenBMint` | USDC mainnet: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`. Devnet: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`. `tokenBProgram` remains `TOKEN_PROGRAM_ID` for USDC |
| Holdback % | Pure UI + token amount math | No new dependency; calculate `tokenAAmount` as `totalSupply * (1 - holdbackPct)` before passing to `createCustomPool()` |
| Advanced Options UI | Add shadcn/ui Collapsible + Slider | No new npm packages; copy components into `components/ui/` |

## Sources

- NPM registry `@meteora-ag/cp-amm-sdk` — latest version 1.4.3 (published ~1 month ago); verified `getFeeMarketCapSchedulerParams`, `BaseFeeMode`, `CollectFeeMode` enums in downloaded tarball type definitions (HIGH confidence)
- Meteora SDK source inspection (`/tmp/meteora-sdk/package/dist/index.d.ts`) — confirmed `FeeMarketCapScheduler` class, validation functions, and `createCustomPool` parameter shapes (HIGH confidence)
- Existing codebase (`lib/solana/poolUtils.ts`, `components/forms/TokenLaunchForm.tsx`) — verified current usage of `getFeeSchedulerParams`, `CollectFeeMode.OnlyB`, and `createCustomPool` (HIGH confidence)
- Solana ecosystem knowledge — USDC mint addresses are public, well-known constants (HIGH confidence)

---

*Stack research for: Solana token launchpad on Meteora DAMMv2 — Configurable launch parameters milestone*
*Researched: 2026-05-23*
