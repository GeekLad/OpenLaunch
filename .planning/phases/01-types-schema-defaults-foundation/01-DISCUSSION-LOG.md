# Phase 1: Types, Schema & Defaults Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-23
**Phase:** 1-Types, Schema & Defaults Foundation
**Areas discussed:** Schema migration strategy, Fee scheduler discriminated union design, Defaults object architecture, Backward compatibility for existing tokens, SDK upgrade constraint

---

## Schema Migration Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Single migration for all new columns | One migration that adds all columns at once | |
| Split by feature group (3 migrations) | Three migrations: core params, fee config, pool config | ✓ |
| One migration per column | Maximum granularity, many files | |

**User's choice:** Split by feature group (3 migrations)
**Notes:** User prefers focused, reviewable migrations over a single large one.

| Option | Description | Selected |
|--------|-------------|----------|
| Nullable columns — null means unknown | New columns are nullable; existing tokens have null | |
| Retroactive defaults — fill all existing rows | Apply sensible defaults to all existing tokens | ✓ |
| Hybrid — defaults for core, nullable for new features | Core params get defaults, fee/pool config stays nullable | |

**User's choice:** Retroactive defaults — fill all existing rows
**Notes:** User wants uniform data and no special-case handling for legacy tokens.

| Option | Description | Selected |
|--------|-------------|----------|
| Flat columns — one column per possible param | Mode as text column + nullable param columns | ✓ |
| Single JSON column for fee config | Store entire fee config as JSON string | |
| Separate fee_configs table | Normalized one-to-one relationship with tokens | |

**User's choice:** Flat columns — one column per possible param
**Notes:** Simpler querying, follows existing schema pattern.

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal indexes — only clear query filters | Add indexes on quote_token_mint, fee_scheduler_mode | |
| Index all new columns preemptively | Add indexes on all new columns | |
| No new indexes — add later if needed | Defer all indexing to performance tuning | ✓ |

**User's choice:** No new indexes — add later if needed
**Notes:** User prefers minimal schema changes in Phase 1.

---

## Fee Scheduler Discriminated Union Design

| Option | Description | Selected |
|--------|-------------|----------|
| mode: 'marketCap' \| 'timeBased' \| 'disabled' | Common TS convention | |
| mode: 'market-cap-based' \| 'time-based' \| 'fixed' | Self-documenting, matches UI labels | ✓ |
| mode: 'marketCap' \| 'timeDecay' \| 'fixedFee' | Technical mechanism emphasis | |

**User's choice:** mode: 'market-cap-based' | 'time-based' | 'fixed'
**Notes:** User values readability and alignment with UI labels.

| Option | Description | Selected |
|--------|-------------|----------|
| UI-aligned names (startingMarketCap, startRate, baseFeeBps) | Matches UI labels and Meteora SDK concepts | ✓ |
| Short names (startCap, startRate, feeBps) | Shorter but less self-documenting | |
| Namespaced params (marketCap.start, timeBased.startRate) | Namespaced within the union | |

**User's choice:** UI-aligned names (startingMarketCap, startRate, baseFeeBps)
**Notes:** Consistency with UI and SDK.

| Option | Description | Selected |
|--------|-------------|----------|
| Replace old feeSchedule fields with new union | Clean break, update all call sites at once | ✓ |
| Gradual migration — keep old fields, add new union | Mark old as deprecated, migrate incrementally | |
| Backward-compat wrapper — old fields stay, union is canonical | Old fields as aliases/computed properties | |

**User's choice:** Replace old feeSchedule fields with new union
**Notes:** User prefers a clean break over gradual migration complexity.

| Option | Description | Selected |
|--------|-------------|----------|
| types/token.ts — alongside existing token types | Single import for all token types | |
| types/fee.ts — dedicated fee types file | Keeps token.ts from growing too large | ✓ |
| lib/solana/poolUtils.ts — co-located with SDK usage | Types close to primary consumer | |

**User's choice:** types/fee.ts — dedicated fee types file
**Notes:** User prefers separation of concerns.

---

## Defaults Object Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| New config/defaults.ts file | Dedicated file for business defaults | ✓ |
| Extend config/environment.ts with DEFAULTS | One file for all configuration | |
| lib/constants.ts — treat as constants | Emphasizes hardcoded business rules | |

**User's choice:** New config/defaults.ts file
**Notes:** Clean separation from env-based infrastructure config.

| Option | Description | Selected |
|--------|-------------|----------|
| Only new configurable fields | DEFAULTS covers only newly exposed parameters | |
| All launch-relevant defaults | Includes existing ones like decimals, baseFeeBps | ✓ |
| Nested by category (token, pricing, pool, fees) | Self-documenting grouping | |

**User's choice:** All launch-relevant defaults
**Notes:** Single source of truth for everything a launch needs.

| Option | Description | Selected |
|--------|-------------|----------|
| DEFAULTS reads from ENV (backward compatible) | Import from environment.ts | |
| Hardcode in defaults.ts, remove from env | Clean break from env overrides | ✓ |
| Hardcode with env fallback | Preserve env override capability | |

**User's choice:** Hardcode in defaults.ts, remove from env
**Notes:** User wants a clean break from env-based business defaults.

| Option | Description | Selected |
|--------|-------------|----------|
| Single frozen DEFAULTS object | Everything in one place | |
| Individual named constants | Tree-shaking, selective imports | ✓ |
| Both — object + individual constants | Maximum flexibility | |

**User's choice:** Individual named constants
**Notes:** Flexibility for selective imports and tree-shaking.

---

## Backward Compatibility for Existing Tokens

| Option | Description | Selected |
|--------|-------------|----------|
| Add hasConfigurableParams flag | Boolean column to distinguish legacy vs modern | |
| No legacy tracking — uniform display | All tokens treated the same | ✓ |
| Heuristic based on createdAt timestamp | No schema change, fragile | |

**User's choice:** No legacy tracking — uniform display
**Notes:** Simpler, no special-case UI handling.

| Option | Description | Selected |
|--------|-------------|----------|
| Match new token defaults exactly | Use the same hardcoded defaults for all tokens | |
| Infer from existing data where possible | Use token's own supply/price, defaults only for new fields | ✓ |
| Apply defaults to everything uniformly | Simplest migration, all legacy tokens look identical | |

**User's choice:** Infer from existing data where possible
**Notes:** More accurate historical representation.

---

## SDK Upgrade Constraint

| Option | Description | Selected |
|--------|-------------|----------|
| I know the exact version | User specifies version number | ✓ |
| Use latest npm version | Verify during research/planning | |
| Research which version added it | Find exact version from changelog | |

**User's choice:** I know the exact version
**Notes:** Version 1.4.3 specified as hard requirement. This unblocks the market-cap-based default mode.

---

## the agent's Discretion

None — user made explicit choices for all questions.

## Deferred Ideas

None — discussion stayed within phase scope.
