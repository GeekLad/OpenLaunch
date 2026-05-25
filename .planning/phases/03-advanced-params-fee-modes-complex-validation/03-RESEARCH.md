# Phase 3: Advanced Parameters, Fee Modes & Complex Validation - Research

**Researched:** 2026-05-25
**Domain:** Next.js/React Frontend UI + Meteora DAMMv2 SDK Integration + Server-Side Validation
**Confidence:** HIGH

## Summary

This phase extends the TokenLaunchForm with advanced parameters (holdback, quote token, fee scheduler modes, fee token mode) and introduces server-side validation against `@meteora-ag/cp-amm-sdk ` constraints. The SDK (v1.4.3) natively supports three fee schedulers (Time, Market-Cap, Rate Limiter) and three `CollectFeeMode` values (`BothToken`, `OnlyB`, `Compounding`. The `BothToken` mode corresponds to collecting fees in both Tokens A and B. UI components for the form (slider, select, dialog, alert, badge) are required; the current project uses custom-built `cn()` wrappers over Radix primitives, but Slider, Select, Dialog, and Alert components must be added. A `POST /api/tokens/validate` API route will run `validatePoolFees` and scheduler-specific validators before any transaction construction.

**Primary recommendation:** Use SDK `getFeeTimeSchedulerParams` and `getFeeMarketCapSchedulerParams` constructors server-side. Use a discriminated union client-side matching `FeeSchedulerConfig`. Implement all UI sections with shadcn primitives (or custom Radix wrappers conforming to existing patterns). Ensure holdback >10% uses a Badge on the Card header and an Alert inside the expanded content.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 to D-04:** Holdback slider (0-100%) with numeric readout; red-flag warning at >10%.
- **D-05 to D-07:** Warning visible when collapsed via Badge; holdback tokens sent to creator's wallet (display/promise).
- **D-08 to D-14:** Fee scheduler mode selection with three options (Market-Cap, Time, Fixed). Dynamic sub-fields use `shouldUnregister: false` + CSS `hidden`.
- **D-15 to D-18:** Quote token dropdown (SOL/USDC) with raw display; decimal scaling deferred.
- **D-19 to D-21:** Fee token mode radio group with quote-only vs both-tokens.
- **D-22 to D-25:** POST `/api/tokens/validate` runs before on-chain work; returns structured errors.
- **D-26 to D-29:** Launch confirmation modal via Dialog with non-default highlights.

### the agent's Discretion
- How to integrate shadcn components (install vs manual creation).
- Specific server-side validation pipeline implementation.

### Deferred Ideas (OUT OF SCOPE)
- Fee-to-token math (Phase 4)
- Decimal math for USDC (Phase 4)
- CollectFeeMode enum mapping (Phase 4)
- Transaction simulation (Phase 4)
- Database persistence (Phase 5)
- Cron job dual-path fee tracking (Phase 6)

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 19.2.0 | UI Framework | Project Standard |
| @radix-ui/react-slider | ^1.2.0 | Slider primitive | Shadcn dependency for range inputs |
| @radix-ui/react-select | ^2.1.0 | Select primitive | Shadcn dependency for dropdowns |
| @radix-ui/react-dialog | ^1.1.0 | Dialog primitive | Shadcn dependency for modals |
| @radix-ui/react-alert-dialog | ^1.1.0 | Alert primitive | Shadcn dependency for banners |
| @radix-ui/react-radio-group | ^1.2.0 | Radio primitive | Shadcn dependency for selection groups |
| zod | 3.25.76 | Schema validation | Project Standard |
| react-hook-form | 7.66.0 | Form management | Project Standard |
| @meteora-ag/cp-amm-sdk | 1.4.3 | Fee scheduler API | Project Standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @meteora-ag/cp-amm-sdk | 1.4.3 | Fee Constants | MIN_FEE_BPS, MAX_FEE_BPS_V1 |
| lucide-react | 0.553.0 | Icons | AlertTriangle, ChevronDown |

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User (Browser)                           │
└───────┬─────────────────────────────────────────────────────┘
        │
        │ Interacts with: TokenLaunchForm.tsx
        │
┌───────▼─────────────────────────────────────────────────────┐
│                 TokenLaunchForm.tsx                           │
│          (react-hook-form + zodResolver)                      │
│                                                               │
│  ┌─────────┐  ┌─────────┐  ┌──────────────────┐               │
│  │ Slider  │  │ Select  │  │ Dynamic Sections │               │
│  │ (Range) │  │ (Enum)  │  │ (CSS Hidden)     │               │
│  └────┬────┘  └────┬────┘  └──────────┬───────┘               │
│       │            │                   │                       │
│       └────────────┴───────────────────┘                       │
│                     │                                          │
│                     ▼                                          │
│              Zod Schema Validation                             │
│              (Frontend)                                        │
└───────┬──────────────────────────────────────────────────────┘
        │ Submit Button
        │
┌───────▼──────────────────────────────────────────────────────┐
│              POST /api/tokens/validate                       │
│         (Server-Side SDK Constraint Validation)              │
│                                                              │
│  ┌──────────────────┐   ┌──────────────────────────────┐    │
│  │ Fee Scheduler    │   │ Pool Fees Validation         │    │
│  │ Validators       │──▶│ (validatePoolFees)           │    │
│  │ (SDK Functions)  │   │                              │    │
│  └──────────────────┘   └──────────────────────────────┘    │
│                           │                                  │
│                           ▼                                  │
│                   200 OK or 400 Bad Request                  │
│                   (Structured Errors)                        │
└────────────────────┬─────────────────────────────────────────┘
                     │
        ┌────────────▼────────────┐
        │   Dialog Confirmation   │
        │   (If Validation Passes)  │
        └─────────────────────────┘
```

### Recommended Project Structure
```
components/
├── forms/
│   └── TokenLaunchForm.tsx         # Main form with new UI sections
│   └── sections/                   # (Optional) Sub-components for each section
│       └── FeeSchedulerSection.tsx
│       └── AdvancedOptionsSection.tsx
│   └── LaunchConfirmationModal.tsx # Dialog content for confirmation
├── ui/
│   ├── slider.tsx                  # Add: Radix Slider + cn wrapper
│   ├── select.tsx                  # Add: Radix Select + cn wrapper
│   ├── dialog.tsx                  # Add: Radix Dialog + cn wrapper
│   ├── alert.tsx                   # Add: Radix Alert + cn wrapper
│   └── badge.tsx                   # Add: Radix/Plain Badge + cn wrapper
│   └── radio-group.tsx             # Add: Radix Radio Group + cn wrapper
├── api/
│   └── tokens/
│       └── validate/
│           └── route.ts            # POST route for server-side validation
lib/
├── validation/
│   └── feeValidation.ts            # Server-side fee scheduler validation logic
```

### Pattern 1: SDK Fee Scheduler Constructors
**What:** Use `getFeeTimeSchedulerParams` and `getFeeMarketCapSchedulerParams` to encode fee scheduler parameters into `BaseFee` objects.
**When to use:** Server-side validation (`/api/tokens/validate`) and on-chain transaction building (`poolUtils.ts`).
**Example:**
```typescript
// Time-Based Fee Scheduler
import { getFeeTimeSchedulerParams, BaseFeeMode } from "@meteora-ag/cp-amm-sdk";

const baseFeeTime = getFeeTimeSchedulerParams(
  50, // startingBaseFeeBps (e.g., 50%)
  25, // endingBaseFeeBps (e.g., 25%)
  BaseFeeMode.FeeTimeSchedulerExponential,
  60, // numberOfPeriod
  3600 // totalDuration (seconds)
);

// Market-Cap Fee Scheduler
import { getFeeMarketCapSchedulerParams } from "@meteora-ag/cp-amm-sdk";

const baseFeeMarket = getFeeMarketCapSchedulerParams(
  50, // startingBaseFeeBps
  25, // endingBaseFeeBps
  BaseFeeMode.FeeMarketCapSchedulerLinear,
  60, // numberOfPeriod
  1000, // priceMultiple (e.g., 1000x initial price to reach end)
  86400 // schedulerExpirationDuration (seconds)
);
```

### Pattern 2: Server-Side Validation Pipeline
**What:** A dedicated API route or service function that receives form data, reconstructs `PoolFeesParams`, and runs `validatePoolFees`.
**When to use:** Before allowing frontend to trigger transaction modal or before signing.
**Example:**
```typescript
import { validatePoolFees, CollectFeeMode, ActivationType } from "@meteora-ag/cp-amm-sdk";

try {
  validatePoolFees(poolFees, CollectFeeMode.OnlyB, ActivationType.Timestamp);
  return NextResponse.json({ valid: true });
} catch (error) {
  // SDK throws Error with descriptive messages
  return NextResponse.json({ error: error.message }, { status: 400 });
}
```

### Pattern 3: Discriminated Union Form Fields
**What:** Use the existing `FeeSchedulerConfig` type shape in `types/fee.ts` to manage dynamic sub-field data.
**When to use:** Client-side state management for the fee scheduler section.
**Example:**
```typescript
// types/fee.ts (Already exists)
type FeeSchedulerConfig =
  | { mode: 'market-cap-based'; startingMarketCap: number; endingMarketCap: number }
  | { mode: 'time-based'; startRate: number; endRate: number; durationMinutes: number }
  | { mode: 'fixed'; baseFeeBps: number };

// In form: watch the 'mode' field to conditionally show/hide sub-fields
const feeMode = watch('feeSchedulerMode');
// Render inputs: feeMarketCapStart, feeMarketCapEnd, etc.
// Use CSS 'hidden' class based on feeMode, NOT conditional rendering (as per D-09).
```

## Meteora SDK Fee Scheduler APIs

### Core Functions

#### 1. Time-Based Scheduler: `getFeeTimeSchedulerParams`
**Signature:** [VERIFIED: SDK Source]
```typescript
declare function getFeeTimeSchedulerParams(
  startingBaseFeeBps: number,  // Starting (max) fee in basis points
  endingBaseFeeBps: number,    // Ending (min) fee in basis points
  baseFeeMode: BaseFeeMode,    // e.g., BaseFeeMode.FeeTimeSchedulerExponential
  numberOfPeriod: number,      // Number of fee reduction periods
  totalDuration: number        // Total duration in seconds
): BaseFee;
```
**Behavior:** Computes `cliffFeeNumerator`, `periodFrequency`, and `reductionFactor` internally. Returns a `BaseFee` object suitable for `PoolFeesParams.baseFee`.

#### 2. Market-Cap Based Scheduler: `getFeeMarketCapSchedulerParams`
**Signature:** [VERIFIED: SDK Source]
```typescript
declare function getFeeMarketCapSchedulerParams(
  startingBaseFeeBps: number,     // Starting (max) fee in bps
  endingBaseFeeBps: number,       // Ending (min) fee in bps
  baseFeeMode: BaseFeeMode,       // Linear or Exponential
  numberOfPeriod: number,         // Number of fee reduction periods
  priceMultiple: number,          // Target spot-price multiple (e.g., 1000x)
  schedulerExpirationDuration: number // Seconds until schedule expires to ending fee
): BaseFee;
```
**Behavior:** Derives `sqrtPriceStepBps` automatically from `priceMultiple`.

## CollectFeeMode Enum

**Values and mapping:** [VERIFIED: SDK Source]
| Enum Value | Numeric | Description | Maps to `FeeTokenMode` |
|---|---|---|---|
| `CollectFeeMode.BothToken` | `0` | Collect fees in both tokens | `both` |
| `CollectFeeMode.OnlyB` | `1` | Collect fees only in token B (quote) | `quoteOnly` |
| `CollectFeeMode.Compounding` | `2` | Fees compounded back into liquidity | *(Not offered in UI)* |

**Key Insight:** The user's "Quote Token Only" maps to `OnlyB`. "Both Quote + Base Token" maps to `BothToken`.

## Parameter Bounds & Constraints

### Fee Rate Constraints (Basis Points)
| Constraint | Value | Source |
|---|---|---|
| `MIN_FEE_BPS` | `1` [VERIFIED: SDK Source] | Minimum fee basis points |
| `MAX_FEE_BPS_V0` | `5000` [VERIFIED: SDK Source] | Max fee for V0 pools (50%) |
| `MAX_FEE_BPS_V1` | `9900` [VERIFIED: SDK Source] | Max fee for V1 pools (99%) |

**Recommendation:** For user-facing inputs, consider clamping to a maximum of `10000` (100%) for safety.

### Validation Functions
The `@meteora-ag/cp-amm-sdk` provides the following server-side validation helpers: [VERIFIED: SDK Source]
- `validateFeeTimeScheduler`: Checks numberOfPeriod, periodFrequency, reductionFactor, and cliffFeeNumerator.
- `validateFeeMarketCapScheduler`: Checks numberOfPeriod, sqrtPriceStepBps, reductionFactor, schedulerExpirationDuration.
- `validatePoolFees(poolFees, collectFeeMode, activationType, feeVersion?)`: Top-level validator that runs all sub-validators.
- `validateCollectFeeMode`: Checks if the enum value is valid.

### Recommended Validation Logic (Server-Side)
1. **Clamping:** Before passing to SDK constructors, clamp `startingBaseFeeBps` and `endingBaseFeeBps` between `MIN_FEE_BPS` and `MAX_FEE_BPS_V1`.
2. **Duration:** Ensure `totalDuration` (or `schedulerExpirationDuration`) is > 0 for Time and Market-Cap modes.
3. **Price Multiple:** Ensure `priceMultiple` is > 1 for Market-Cap mode.
4. **Number of Periods:** Ensure `numberOfPeriod` >= 1.
5. **Holdback:** Ensure `holdbackPercentage` is between 0 and 100.

## Quote Token Considerations (SOL vs USDC)

### Standard Mint Addresses
[ASSUMED: Solana Ecosystem Standard]
| Token | Mainnet Mint Address | Decimals |
|---|---|---|
| SOL (Wrapped) | `So11111111111111111111111111111111111111112` | 9 |
| USDC | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | 6 |

**Impact:** The `tokenBDecimals` (quote token decimals) passed to `priceToSqrtPrice` and `createDAMMv2Pool` must change based on the selected quote token. [CITED: AGENTS.md Tech Stack Rules]

### UI Requirements
[D-16, D-17]: The frontend must display raw values without auto-rescaling but include helper text explaining the decimal difference. The backend handles scaling during transaction construction (Phase 4).

## shadcn/ui Component Inventory

### Existing Primitives
| Component | File | Status | Used For |
|---|---|---|---|
| Button | `components/ui/button.tsx` | ✅ Exists | Submit, Modal actions |
| Card | `components/ui/card.tsx` | ✅ Exists | Section containers |
| Input | `components/ui/input.tsx` | ✅ Exists | Numeric/text inputs |
| Label | `components/ui/label.tsx` | ✅ Exists | Field labels |
| Countdown | `components/ui/countdown.tsx` | ✅ Exists | Timer display |
| Theme Toggle | `components/ui/theme-toggle.tsx` | ✅ Exists | Theme switching |

### Missing Primitives (Must Add)
| Component | Needed For | Installation Command |
|---|---|---|
| Slider | Holdback Percentage | `npm install @radix-ui/react-slider` + Custom wrapper `components/ui/slider.tsx` |
| Select | Quote Token, Fee Modes | `npm install @radix-ui/react-select` + Custom wrapper `components/ui/select.tsx` |
| Dialog | Launch Confirmation Modal | `npm install @radix-ui/react-dialog` + Custom wrapper `components/ui/dialog.tsx` |
| Alert | Red-Flag Warnings | `npm install @radix-ui/react-alert-dialog` + Custom wrapper `components/ui/alert.tsx` |
| Radio Group | Fee Token Mode | `npm install @radix-ui/react-radio-group` + Custom wrapper `components/ui/radio-group.tsx` |

## Package Legitimacy Audit

> **Required** whenever this phase installs external packages. Run the Package Legitimacy Gate protocol before completing this section.

Step 1-4: The project is already using `@radix-ui/react-*` dependencies under the hood (observed in `package-lock.json`). The above packages are official Radix UI primitives.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---|---|---|---|---|---|---|
| `@radix-ui/react-slider` | npm | 3+ yrs | Millions/wk | github.com/radix-ui | [OK] | Approved |
| `@radix-ui/react-select` | npm | 3+ yrs | Millions/wk | github.com/radix-ui | [OK] | Approved |
| `@radix-ui/react-dialog` | npm | 3+ yrs | Millions/wk | github.com/radix-ui | [OK] | Approved |
| `@radix-ui/react-alert-dialog` | npm | 3+ yrs | Millions/wk | github.com/radix-ui | [OK] | Approved |
| `@radix-ui/react-radio-group` | npm | 3+ yrs | Millions/wk | github.com/radix-ui | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Implementation Recommendations

### 1. Form Section Updates
- **Fee Schedule Section (Current):** Remove the read-only badge. Add a `Select` for `feeSchedulerMode` and a `RadioGroup` for `feeTokenMode`.
- **Advanced Options / Launch Parameters:** Add Slider for `holdbackPercentage`. Add Select for `quoteTokenMint`.
- **Dynamic Sub-fields:** For each fee mode, render a container `<div className={cn(feeMode !== 'market-cap-based' && 'hidden')}>` containing the relevant inputs. Ensure `shouldUnregister: false` is maintained.

### 2. Holdback Warning
- **Collapsed State:** Calculate `isHighHoldback = watch('holdbackPercentage') > 10`. Render a red `<Badge variant="destructive">` (or custom `bg-red-100`) next to the CardTitle in the header.
- **Expanded State:** Inside the `CardContent`, if `isHighHoldback`, render an `<Alert variant="destructive">` with the text: "Holding back more than 10% may be seen as a red flag by traders".

### 3. Launch Confirmation Modal
- Use `Dialog` from `components/ui/dialog.tsx`.
- Iterate over form fields, comparing current values to `DEFAULT_LAUNCH_PARAMS`.
- Group non-defaults into "Token Info", "Launch Parameters", "Fee Configuration".
- Apply `text-red-600` or `text-destructive` to the value text if it differs from the default.

### 4. Server-Side Validation (
- **Path:** `POST /api/tokens/validate`.
- **SDK Usage:**
  ```typescript
  import {
    getFeeTimeSchedulerParams,
    getFeeMarketCapSchedulerParams,
    validatePoolFees,
    CollectFeeMode,
    BaseFeeMode,
    ActivationType,
    MIN_FEE_BPS,
    MAX_FEE_BPS_V1
  } from "@meteora-ag/cp-amm-sdk";

  // 1. Map client fields to SDK params
  // 2. Call appropriate getFee...Params constructor
  // 3. Build poolFees object
  // 4. Run validatePoolFees(poolFees, CollectFeeMode.OnlyB, ActivationType.Timestamp);
  ```
- **Error Formatting:** Catch SDK errors and return a JSON object where keys match `zod` error paths (e.g., `{ "feeSchedulerConfig": "Starting fee must be less than ending fee" }`).

## Common Pitfalls

### Pitfall 1: SDK Constructor Input Mismatch
**What goes wrong:** Passing strings or percentages instead of numeric basis points to `getFeeTimeSchedulerParams`.
**Why it happens:** UI might display percentages (e.g., "5%") but SDK expects `500` bps.
**How to avoid:** Always convert UI percentages to basis points before calling SDK functions. Use `Math.round(value * 100)`.

### Pitfall 2: State Synchronization with CSS `hidden`
**What goes wrong:** When switching fee modes, the hidden inputs retain their RHF registration but may have stale `defaultValues`. `trigger()` might not re-run unless the field is watched.
**Why it happens:** `shouldUnregister: false` keeps values in `formState.values`, but Zod `superRefine` only validates visible fields if not careful.
**How to avoid:** Ensure `superRefine` checks ALL fields regardless of mode, or switch to a client-side validation function that checks based on the active `feeSchedulerMode`. (Context D-09 suggests keeping fields in DOM to preserve values).

### Pitfall 3: USDC Decimal Precision
**What goes wrong:** Calculating `sqrtPrice` with SOL decimals (9) for a USDC pool (6), leading to incorrect pool initialization prices.
**Why it happens:** `priceToSqrtPrice(price, tokenADecimals, tokenBDecimals)` is sensitive to the second parameter.
**How to avoid:** Ensure `tokenBDecimals` is passed dynamically based on `quoteTokenMint`. This is a Phase 4 concern but must be planned for now (LAUN-10).

### Pitfall 4: Fee Rate Bounds
**What goes wrong:** Users entering 100% fee (10000 bps) exceeding `MAX_FEE_BPS_V1` (9900).
**Why it happens:** UI allows 0-100% slider/input.
**How to avoid:** Front-end validator (`zod`) should cap at `MAX_FEE_BPS_V1`. Server-side validation must also enforce this cap.

### Pitfall 5: Missing shadcn Primitives
**What goes wrong:** Attempting to use `<Slider />` or `<Dialog />` in the form without installing Radix dependencies first.
**Why it happens:** The current UI directory is sparse.
**How to avoid:** Install all dependencies (`@radix-ui/react-*`) before writing component code.

## Code Examples

### Zod Schema Extension for Fee Scheduler
```typescript
const tokenFormSchema = z.object({
  // ...existing fields
  feeSchedulerMode: z.enum(['market-cap-based', 'time-based', 'fixed']).default('market-cap-based'),
  feeTokenMode: z.enum(['quoteOnly', 'both']).default('quoteOnly'),
  holdbackPercentage: z.number().min(0).max(100).default(0),
  quoteTokenMint: z.string().optional(),

  // Time-based fields
  feeStartRate: z.number().min(0).max(10000).optional(), // bps
  feeEndRate: z.number().min(0).max(10000).optional(), // bps
  feeDurationHours: z.number().min(1).optional(),

  // Market-cap fields
  feeMarketCapStart: z.number().min(0).optional(),
  feeMarketCapEnd: z.number().min(0).optional(),

  // Fixed fields
  feeFixedRate: z.number().min(0).max(10000).optional(), // bps
}).superRefine((data, ctx) => {
  // Cross-field validation based on active mode
  if (data.feeSchedulerMode === 'time-based') {
    if (!data.feeStartRate || !data.feeEndRate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Start and end rates required", path: ["feeStartRate"] });
    }
  }
  // ...more validation
});
```

### Server-Side Validation Route Skeleton
```typescript
// app/api/tokens/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
    getFeeTimeSchedulerParams, getFeeMarketCapSchedulerParams,
    validatePoolFees, CollectFeeMode, ActivationType, BaseFeeMode, MAX_FEE_BPS_V1
} from "@meteora-ag/cp-amm-sdk";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { feeSchedulerMode, feeTokenMode, holdbackPercentage, ...params } = body;

    // 1. Basic type/bounds checks
    if (holdbackPercentage < 0 || holdbackPercentage > 100) {
        return NextResponse.json({ error: "Holdback percentage out of range" }, { status: 400 });
    }

    // 2. Construct SDK BaseFee
    let baseFee;
    if (feeSchedulerMode === 'time-based') {
        baseFee = getFeeTimeSchedulerParams(params.feeStartRate, params.feeEndRate, BaseFeeMode.FeeTimeSchedulerExponential, 60, params.feeDurationHours * 3600);
    } else if (feeSchedulerMode === 'market-cap-based') {
        // Need to derive starting/ending fee bps from market caps or have dedicated fields
        // Assuming hypothetical mapping or dedicated fields for now
        // baseFee = getFeeMarketCapSchedulerParams(...);
    }

    // 3. Validate against SDK
    const poolFees = { baseFee, compoundingFeeBps: 0, padding: 0, dynamicFee: null };
    validatePoolFees(poolFees, CollectFeeMode[feeTokenMode === 'both' ? 'BothToken' : 'OnlyB'], ActivationType.Timestamp);

    return NextResponse.json({ valid: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
```

## State of the Art

**Deprecated/outdated:**
- **Old Context (Phase 1):** Market-cap-based fee scheduler is the *new* default for Meteora v1.4.3. Ensure `BaseFeeMode.FeeMarketCapSchedulerExponential` (or Linear) is used, not v0 constants.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | USDC Mainnet Mint: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | Quote Token | Incorrect pool creation for USDC tokens if wrong. |
| A2 | Project uses `cn()` utility and custom wrappers, not `npx shadcn add` CLI | shadcn Inventory | Component patterns may differ if CLI is used. |
| A3 | `shouldUnregister: false` + CSS hidden is strictly preferred over conditional rendering | Architecture | Violating this may cause form state loss. |
| A4 | Phase 4 will handle Transaction Wiring and Decimal Math | Summary | If Phase 3 accidentally changes transaction logic, it introduces scope creep. |

## Validation Architecture

### Phase Requirements → Research Map
| Req ID | Behavior | Test Type | Research Finding |
|--------|----------|-----------|------------------|
| LAUN-06 | Holdback Slider 0-100% | UI/UX | Use Radix Slider primitive. |
| LAUN-07 | Red-flag warning >10% | UI/UX | Use Badge + Alert components. |
| LAUN-08 | Holdback tokens logic | Logic | UI display/promise only (Phase 4). |
| LAUN-09 | Quote token selection | UI/UX | Use Radix Select primitive. |
| FEE-01 | Fee scheduler mode | UI/Logic | Match `FeeSchedulerConfig` discriminated union. |
| FEE-02 | Market-cap sub-fields | Logic | Map to `getFeeMarketCapSchedulerParams`. |
| FEE-03 | Time-based sub-fields | Logic | Map to `getFeeTimeSchedulerParams`. |
| FEE-04 | Fixed fee sub-fields | Logic | Map to simple `BaseFee` with static values. |
| FEE-05 | Fee token mode | UI/Logic | Map to `CollectFeeMode.BothToken` or `OnlyB`. |
| FORM-05 | Collapsed visibility | UI/UX | Use `useMemo` for Badge state. |
| FORM-06 | Confirmation modal | UI/UX | Use Radix Dialog primitive. |
| VALID-02 | Server-side validation | Backend | Use SDK `validatePoolFees` and sub-validators. |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---|---|---|
| `@radix-ui/react-slider` | Slider component | ✗ | — | MUST install |
| `@radix-ui/react-select` | Select component | ✗ | — | MUST install |
| `@radix-ui/react-dialog` | Dialog component | ✗ | — | MUST install |
| `@radix-ui/react-alert-dialog` | Alert component | ✗ | — | MUST install |
| `@radix-ui/react-radio-group` | Radio component | ✗ | — | MUST install |
| `@meteora-ag/cp-amm-sdk` | Pool/Validation | ✓ | 1.4.3 | — |

## Security Domain

> Required when `security_enforcement` is enabled.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---|---|---|
| V5 Input Validation | yes | Zod schemas (frontend + backend). |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---|---|---|
| Fee Rate Manipulation | Tampering | Server-side enforcement via SDK validators; clamp values to `MAX_FEE_BPS_V1`. |
| Fee Scheduler DoS | Availability | Ensure duration/periods are within non-zero bounds to prevent on-chain errors. |

## Sources

### Primary (HIGH confidence)
- `@meteora-ag/cp-amm-sdk/dist/index.d.ts` — Fee scheduler signatures, `CollectFeeMode` enum, `BaseFeeMode` enum, validation functions.
- `@meteora-ag/cp-amm-sdk` module exports — Verified `MIN_FEE_BPS`, `MAX_FEE_BPS_V0`, `MAX_FEE_BPS_V1` via Node REPL.

### Secondary (MEDIUM confidence)
- Solana Ecosystem Reference — USDC mainnet mint address (`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`).
- Project codebase (`components/ui/`, `package.json`) — Confirmed missing UI primitives.

### Tertiary (LOW confidence)
- GSD Context (`03-CONTEXT.md`) — Specific copy text for warnings (e.g., "Holding back more than 10%..."). [CITED: CONTEXT.md]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Verified against SDK source and codebase.
- Architecture: HIGH — Patterns derived from existing `TokenLaunchForm.tsx` and SDK requirements.
- Pitfalls: HIGH — Based on direct SDK logic analysis.

**Research date:** 2026-05-25
**Valid until:** 2026-06-25 (Stable SDK / Stack)

---

*RESEARCH.md complete for Phase 3 — Ready for Planner consumption.*
