# Phase 5: Service Orchestration, Persistence & Detail Pages

**Gathered:** 2026-05-26
**Status:** Ready for planning
**Requirements:** PERS-02, VALID-04

<domain>
## Phase Boundary

This phase connects the full launch flow end-to-end: when a token is successfully launched on-chain (all 3 transactions: mint, metadata+minting, pool creation), every user-configured parameter is persisted to the database and displayed on the token detail page.

Specifically:
1. **Service wiring** — `TokenLaunchService.launchToken()` returns form data alongside blockchain addresses, so the caller can POST to the API
2. **API belt-and-suspenders** — `/api/tokens/create` re-runs validation before DB persistence (supplements Phase 4 pre-flight validation)
3. **Detail page enhancement** — Existing `app/tokens/[mintAddress]/page.tsx` gains collapsible sections for all stored launch parameters

**Out of phase scope:** On-chain transaction building (Phase 4), form UI design (Phases 2–3), fee scheduler mapping (Phase 4), cron job updates (Phase 6), Solana wallet handling (existing).

</domain>

<decisions>
## Implementation Decisions

### D-05-01 — Retry on Failure (No Orphaned DB Records)
When pool creation fails after mint/metadata succeed:
- **No DB save until all 3 transactions succeed.** On-chain mint may exist, but the app does not track it.
- Show error + "Retry Pool Creation" button inline on the launch page
- Retry uses **exact same parameters** as original submission — one-click, no editing
- Original `TokenFormData` preserved in React component state between attempts
- The existing mint address (already on-chain) is reused; only pool creation is re-executed
- If user abandons, the on-chain mint is orphaned but untracked (acceptable for v1)

### D-05-02 — Detail Page Layout: Collapsible Sections by Category
Stored launch parameters displayed in grouped, collapsible Card sections:

| Section | Contents | Default State |
|---------|----------|---------------|
| **Token Info** | Name, symbol, logo, description, mint address, decimals, total supply, creator wallet | **Expanded** |
| **Pool Configuration** | Quote token (SOL/USDC), initial price, price range (min/max), pool liquidity % | Collapsed |
| **Fee Schedule** | Fee scheduler mode, mode-specific sub-fields, fee token mode | Collapsed |
| **Holdback** | Holdback percentage, warning badge if >10% | Collapsed |
| **Transaction History** | Mint tx, metadata tx, pool tx (already exists) | Expanded |

Uses shadcn/ui `Card`, `Collapsible` (or CSS `hidden` pattern) with arrow indicators.

### D-05-03 — Holdback Warning on Detail Page
- When `holdbackPercentage > 10%`: Red badge on section header: `⚠ High Holdback (25%)`
- When `holdbackPercentage ≤ 10%`: No warning badge, just the percentage

### D-05-04 — Fee Scheduler Display
- Human-readable labels: "Market-Cap Based (Linear Decay)", "Time-Based (Exponential)", "Fixed Fee"
- Raw mode value shown in smaller/muted text for transparency (e.g., `mode: market-cap-based`)

### D-05-05 — Service Returns Form Data
- `TokenLaunchService.launchToken()` **returns `TokenFormData`** alongside `TokenLaunchConfig`
- Caller (`app/launch/page.tsx`) passes this to `POST /api/tokens/create`
- This closes the loop: user-entered params flow from form → service → API → database

### D-05-06 — API Independent Validation (Belt-and-Suspenders)
- `/api/tokens/create` re-runs `validateLaunchParams` before creating the DB record
- If validation fails, return `400 Bad Request` with field-level errors
- **Why:** Phase 4's pre-flight validation runs client-side in the service layer; the API is a separate trust boundary and should validate independently
- API also validates: presence of `mintAddress`, `poolAddress`, all 3 tx signatures (already implemented)

### the agent's Discretion
- No areas deferred to agent discretion in this discussion.

### Folded Todos
- None

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements & Roadmap
- `.planning/PROJECT.md` — Project overview, key decisions, constraints
- `.planning/REQUIREMENTS.md` — Full v1 requirements mapped to phases (PERS-02, VALID-04 for this phase)
- `.planning/ROADMAP.md` — Phase 5 goal, success criteria, boundaries

### Phase 4 Context (On-chain Integration)
- `.planning/phases/04-blockchain-integration-pre-flight-safety/04-CONTEXT.md` — Holdback math, quote token decimals, fee scheduler SDK mapping, `ValidationError` structure

### Phase 3 Context (Advanced UI)
- `.planning/phases/03-advanced-params-fee-modes-complex-validation/03-CONTEXT.md` — Form architecture, collapsible patterns, `shouldUnregister: false`

### Phase 1 Context (Types & Schema)
- `.planning/phases/01-types-schema-defaults-foundation/01-CONTEXT.md` — Schema, discriminated unions, defaults per phase

### Database Schema
- `lib/db/schema/tokens.ts` — All columns already present (holdbackPercentage, quoteTokenMint, feeSchedulerMode, feeTokenMode, etc.)

### Types & Config
- `types/token.ts` — `TokenFormData`, `TokenLaunchConfig`
- `config/defaults.ts` — DEFAULTS object with all fields pre-filled

### Primary Target Files for Changes
1. `lib/services/launchService.ts` — Modify return type to include `TokenFormData`
2. `app/tokens/[mintAddress]/page.tsx` — Add collapsible parameter sections
3. `app/launch/page.tsx` — Pass `formData` alongside `TokenLaunchConfig` to API
4. `app/api/tokens/create/route.ts` — Add `validateLaunchParams` call before DB create

### Validation Module
- `lib/validation/launch.ts` — `validateLaunchParams()`, `ValidationError`, `LaunchValidationError`

### Existing Token Detail Page
- `app/tokens/[mintAddress]/page.tsx` — Currently shows: launch status card, token header with logo+name, external links, transaction history

### Existing DB Service
- `lib/db/service.ts` — `dbService.createToken()` accepts `TokenCreateInput` with all configurable fields

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`TokenCard` component** (`components/tokens/TokenCard.tsx`): Used in token listing page; may be reused or referenced for detail page card styling
- **`Card`, `CardHeader`, `CardTitle`, `CardContent`** from shadcn/ui — already imported and used in detail page
- **`ExternalLinks` component** (`components/token-detail/ExternalLinks.tsx`): Already used in detail page; may expand to include Meteora pool link
- **Collapsible pattern** from Phase 2: `shouldUnregister: false` + CSS hidden class
- **`Countdown`** component — already used for upcoming launches

### Established Patterns
- **Detail page uses `"use client"`** with `fetch()` to `/api/tokens/[mintAddress]` — continuation of this pattern
- **Token detail data shape** returned by API: `{ token: Token }` where `Token` is Drizzle-inferred type
- **Error states**: Red card with `text-red-600` for errors, pulse skeleton for loading
- **API routes return structured JSON**: `{ token, created: boolean }` or `{ error, details }`
- **`getSolscanTxUrl` utility** — used for tx signature links

### Integration Points (to modify)
1. **`launchService.ts`** line ~46: `launchToken()` returns `Promise<TokenLaunchConfig>` → needs to also return `TokenFormData`
2. **`app/launch/page.tsx`** line ~98: POST to `/api/tokens/create` — needs to include form data in the payload
3. **`app/api/tokens/create/route.ts`** line ~44: Constructs `TokenCreateInput` — already has all fields mapped, just needs validation step
4. **`app/tokens/[mintAddress]/page.tsx`** lines ~144-218: Token header card — add new parameter sections below this

### Known Landmines
- **`totalSupply` in DB is `text` (not integer)** — schema stores as string for arbitrary precision. Detail page must not assume it's a number.
- **`startingMarketCap` / `endingMarketCap` in DB are `text`** — same string-precision issue.
- **`TokenFormData` vs `TokenCreateInput` field names differ** — e.g., `formData.feeMarketCapStart` vs `tokenData.startingMarketCap`. The API route already maps these correctly.
- **Fee scheduler mode values in DB** are raw strings (`'market-cap-based'`, `'time-based'`, `'fixed'`) — detail page must map these to human-readable labels.

</code_context>

<specifics>
## Specific Ideas

### Detail Page Sections (below existing content)
Add these section cards below the existing "Transaction History" card:

1. **Pool Configuration Card**
   - Quote Token: SOL / USDC (display mint address in small text)
   - Initial Price: `token.initialPrice` + "token per quote" label
   - Price Range: `token.priceRangeMin` — `token.priceRangeMax`
   - Pool Liquidity: `token.poolLiquidityPercentage * 100%`

2. **Fee Schedule Card**
   - Mode label (human-readable) in bold
   - Fee Token Mode: "Quote Token Only" / "Both Quote + Base Token"
   - Market-Cap Based sub-fields: starting/ending market cap, decay mode
   - Time-Based sub-fields: start rate (BPS), end rate (BPS), duration (minutes → hours conversion)
   - Fixed: base fee (BPS)

3. **Holdback Card**
   - Percentage: `token.holdbackPercentage`%
   - If `> 10%`: red badge `⚠ High Holdback` + explanatory text
   - If `≤ 10%`: green/gray badge (or no badge)

### Service Return Type Change
```typescript
// In launchService.ts
export interface LaunchResult {
  config: TokenLaunchConfig;       // mint, pool, position addresses
  formData: TokenFormData;         // user-entered parameters for DB persistence
}
```

### API Validation Hook
```typescript
// In app/api/tokens/create/route.ts
import { validateLaunchParams, ValidationError } from '@/lib/validation/launch';

const validationErrors = validateLaunchParams(data);
if (validationErrors.length > 0) {
  return NextResponse.json({ error: 'Validation failed', details: validationErrors }, { status: 400 });
}
```

</specifics>

<deferred>
## Deferred Ideas

- **Audit log table for launch attempts** (including failures) — Phase 6 potential enhancement
- **Token detail page edit capability** (e.g., updating metadata URI) — out of scope; tokens are immutable on-chain
- **Comparative analysis** ("This token is in the top 10% by fees") — requires Phase 6 cron data
- **Social sharing cards** (Twitter/OpenGraph with token data) — future marketing phase

### Reviewed Todos (not folded)
- None

</deferred>

---

*Phase: 5 — Service Orchestration, Persistence & Detail Pages*
*Context gathered: 2026-05-26*
