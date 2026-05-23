# Feature Landscape: Configurable Token Launchpad Parameters

**Domain:** Solana token launchpad (Meteora DAMMv2-based)
**Researched:** 2026-05-23
**Overall confidence:** HIGH (authoritative SDK docs + official Meteora documentation)

## Table Stakes

Features users expect from any configurable token launchpad. Missing = product feels broken or users leave.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Total Supply Configuration** | Creators always want control over token supply | Low | Default 1B is common but arbitrary. Exposing this is trivial — it’s a mint parameter. |
| **Initial Price Setting** | Defines launch valuation; users expect to set this | Medium | Maps to `initSqrtPrice` via `getSqrtPriceFromPrice()`. Requires validation against price range. |
| **Price Range Min/Max** | Concentrated liquidity requires bounds | Medium | Maps to `sqrtMinPrice`/`sqrtMaxPrice`. Must be validated: min < initial < max. |
| **Quote Token Selection** | SOL vs USDC is a fundamental choice | Low | `tokenBMint` parameter. SOL = wSOL mint, USDC = EPjFW... Requires pre-defined mint constants only. |
| **Fee Token Mode (Collect Fee Mode)** | Determines what LPs earn fees in | Low | `collectFeeMode`: 0=BothToken, 1=OnlyB(quote-only), 2=Compounding. BothToken and OnlyB are table stakes; Compounding is more niche. |
| **Fee Scheduler Enable/Disable** | Users expect to opt out of anti-sniper if desired | Low | `baseFeeMode` can be set to a fixed fee with no scheduler (`numberOfPeriod: 0`). SDK supports this. |

## Differentiators

Features that set the launchpad apart. Not universally expected, but valued when present.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Fee Scheduler Mode Selection** | Market-cap-based is novel vs standard time-based | Medium | Meteora supports 5 modes (0=Time Linear, 1=Time Exponential, 2=Rate Limiter, 3=MarketCap Linear, 4=MarketCap Exponential). Offering choice beyond time-based is a differentiator. |
| **Market-Cap-Based Scheduler as Default** | Aligns fees with price action, not arbitrary time | Medium | Meteora docs recommend this for graduated pools. Fee only drops when price increases. Requires `sqrtPriceStepBps` + `schedulerExpirationDuration` params. |
| **Token Holdback Percentage** | Creator can retain tokens outside the pool | Low | Simple percentage of total supply not minted-to pool. Holdback >10% is a rug-pull signal; red-flag warning adds trust. |
| **Holdback Red-Flag Warning (>10%)** | Transparency / anti-rug signal | Low | UI pattern: warning banner when holdback >10% but allow proceed. Builds trader trust. |
| **Advanced Options Collapsible Section** | Keeps default flow simple, power users get control | Low | UI/UX pattern. Default form shows minimal; advanced expands to full configurability. |
| **Dynamic Fee Toggle** | Volatility-adjusted fees bolster anti-sniper defense | Low | `dynamicFee` boolean + optional `dynamicFeeConfig`. Default config available (`getDynamicFeeParams`). |
| **Custom Mint Keypair** | Creators can pre-generate a vanity address | Low | Already exists in codebase; worth noting as a differentiator vs simpler launchpads. |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Custom Fee Scheduler Curves** | Meteora SDK only supports Linear/Exponential for time and market-cap. Custom curves would require on-chain program changes. | Stay within SDK-supported modes (0-4). |
| **Real-Time Market Cap Calculation in Launch TX** | Would require price oracle in the launch transaction, adding complexity and failure points. | Rely on Meteora’s on-chain fee scheduler behavior. Market cap is derived from sqrt price movement on-chain. |
| **Quote Tokens Beyond SOL/USDC** | Requires broader price oracle integration, more mint constants, and UI complexity not justified for v1. | Limit to SOL and USDC. Document as future scope. |
| **Compounding Fee Mode as Default** | Compounding mode requires full-range pools and balanced liquidity (both token amounts > 0). It prevents one-sided launches and concentrated price ranges. | Default to OnlyB (quote-only). Offer Compounding as an advanced option only if the user explicitly wants it and understands constraints. |
| **Rate Limiter as Default** | Rate limiter fees increase with trade size, which is confusing for standard token launches. Better suited for mature pools with large traders. | Offer as advanced option, not default. |
| **Vesting / Locking in Launch Flow** | DAMMv2 supports liquidity vesting (`lockPosition`, `permanentLockPosition`), but this adds significant UI and conceptual complexity. | Defer to post-launch position management. Launch flow should create unlocked liquidity. |
| **Alpha Vault Integration** | Anti-sniper presale vault requires whitelist management, merkle proofs, and significant config. | Out of scope for v1. Document as future enhancement. |
| **Token 2022 Support** | Adds transfer fee calculations and extension handling complexity. | Stick to standard SPL tokens for v1. |

## Feature Dependencies

```
Total Supply
  → Initial Price (price is per-token, so supply + price determine pool valuation)
  → Holdback % (holdback is a percentage of total supply)

Quote Token Selection (SOL vs USDC)
  → Initial Price (price is denominated in quote token)
  → Price Range Min/Max (bounds are in quote-token terms)
  → Creator’s Required SOL/USDC Balance (varies by quote token)

Fee Scheduler Mode Selection
  → Fee Scheduler Parameters (time-based needs duration; market-cap needs sqrtPriceStep + expiration)
  → Dynamic Fee Toggle (can pair with any scheduler)

Collect Fee Mode
  → Compounding Fee Bps (only relevant if mode = Compounding)
  → One-sided vs Balanced Pool (Compounding requires both token amounts > 0)

Advanced Options Section
  → All configurable parameters except core (name, symbol, logo, quote token)
```

## SDK Parameter Mapping

How each user-facing feature maps to `@meteora-ag/cp-amm-sdk` parameters:

| User Feature | SDK Parameter | Type | Constraints |
|--------------|---------------|------|-------------|
| Total Supply | `tokenAAmount` (minted) + holdback calc | BN | Must account for decimals |
| Initial Price | `initSqrtPrice` via `getSqrtPriceFromPrice()` | BN | Must be between min and max sqrt price |
| Price Range Min | `sqrtMinPrice` via `getSqrtPriceFromPrice(minPrice)` | BN | Must be < initSqrtPrice |
| Price Range Max | `sqrtMaxPrice` via `getSqrtPriceFromPrice(maxPrice)` | BN | Must be > initSqrtPrice |
| Quote Token | `tokenBMint` | PublicKey | SOL = wSOL, USDC = EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v |
| Fee Scheduler Mode | `baseFeeMode` | number | 0=TimeLinear, 1=TimeExp, 2=RateLimiter, 3=MarketCapLinear, 4=MarketCapExp |
| Fee Scheduler Params | `feeTimeSchedulerParam` or `feeMarketCapSchedulerParam` | object | Depends on mode |
| Collect Fee Mode | `collectFeeMode` | number | 0=BothToken, 1=OnlyB, 2=Compounding |
| Dynamic Fee | `dynamicFee` in `poolFees` | DynamicFee \| null | `getDynamicFeeParams()` for default |
| Holdback % | Not a direct SDK param — affects `tokenAAmount` sent to pool vs creator wallet | percentage | 0-100% (UI warns >10%) |

## Fee Scheduler Mode Details

### Time-Based (Modes 0 & 1)
- **When to use:** Standard anti-sniper. Fee drops predictably over time regardless of price.
- **Parameters:** `startingFeeBps`, `endingFeeBps`, `numberOfPeriod`, `totalDuration` (seconds)
- **Complexity:** LOW — all params are intuitive time-based values.

### Market-Cap-Based (Modes 3 & 4)
- **When to use:** Fee should only drop when token proves demand (price rises).
- **Parameters:** `startingFeeBps`, `endingFeeBps`, `numberOfPeriod`, `sqrtPriceStepBps` (price increase per period), `schedulerExpirationDuration` (max time before defaulting to min fee)
- **Complexity:** MEDIUM — `sqrtPriceStepBps` is less intuitive than time. Needs explanation in UI.
- **Key behavior:** After expiration duration, fee permanently defaults to minimum regardless of price. This is irreversible.

### Rate Limiter (Mode 2)
- **When to use:** Discourage large trades (whales) at launch.
- **Parameters:** `cliffFeeNumerator`, `feeIncrementBps`, `maxFeeBps`, `referenceAmount`, `maxLimiterDuration`
- **Complexity:** MEDIUM — trade-size-based fees are harder to reason about for creators.

## MVP Recommendation

**Prioritize for launch form v2:**
1. **Total Supply** (table stakes) — simple numeric input with default 1B
2. **Initial Price + Price Range** (table stakes) — expose as numeric inputs with validation
3. **Quote Token Selection** (table stakes) — SOL/USDC toggle, default SOL
4. **Fee Scheduler Mode with Market-Cap Default** (differentiator) — dropdown: MarketCap Exponential (default), Time Exponential, Fixed (no scheduler)
5. **Collect Fee Mode** (table stakes) — Quote-only (default), Both Tokens option
6. **Holdback % with Warning** (differentiator) — slider 0-50%, red flag at >10%

**Defer:**
- **Rate Limiter mode**: Too complex for average creator; add in v3 if requested.
- **Compounding fee mode**: Requires full-range pools and balanced deposits; conflicts with one-sided launch pattern. Document but don’t expose in default advanced section.
- **Custom dynamic fee config**: Use SDK default (`getDynamicFeeParams`). Expose toggle (on/off) only.

## Sources

- Meteora DAMMv2 SDK docs (Context7): `/meteoraag/damm-v2-sdk`
- Meteora official documentation: `https://docs.meteora.ag/`
  - Fee Time Scheduler: https://docs.meteora.ag/anti-sniper-suite/fee-time-scheduler/what-is-fee-time-scheduler
  - Fee Market Cap Scheduler: https://docs.meteora.ag/anti-sniper-suite/fee-market-cap-scheduler/what-is-fee-market-cap-scheduler
  - Collect Fee Modes: https://docs.meteora.ag/overview/products/damm-v2/collect-fee-modes
  - What is DAMM v2: https://docs.meteora.ag/overview/products/damm-v2/what-is-damm-v2
  - DAMM v2 Launch Pool Guide: https://docs.meteora.ag/developer-guide/quick-launch/damm-v2-launch-pool
