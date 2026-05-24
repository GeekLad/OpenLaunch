# Phase 2: Core Form Parameters & Basic UI - Context

**Gathered:** 2026-05-24
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the essential form expansion: a new **"Launch Parameters"** collapsible section containing supply, initial price, and price range (min/max) fields. The default form stays simple (name, symbol, logo, description). All configurable parameters live in the new section, pre-filled with current defaults.

Specifically (per ROADMAP.md):
- User sees an "Launch Parameters" collapsible section on the launch form below the essential fields
- User can set total token supply, initial price, and price range (min/max) inside the section
- Form shows clear validation errors when min price is not less than initial price or initial price is not less than max price
- All new fields are pre-filled with current environment defaults (1B supply, 0.00001 initial, 0.000001–0.0001 range)
- Expanding or collapsing "Launch Parameters" preserves all entered values without resetting the form

**Out of phase scope:** Fee scheduler mode selection, fee token mode, quote token dropdown, holdback slider, red-flag warnings, server-side SDK validation, launch confirmation modal. Those belong in Phases 3–6.

</domain>

<decisions>
## Implementation Decisions

### Section Naming & Ordering
- **D-01:** The new collapsible section for supply/price/range is named **"Launch Parameters"** (not "Advanced Options" / "Advanced Settings").
- **D-02:** "Launch Parameters" appears **after Socials** and **before "Custom CA"** in the form order.
- **D-03:** The existing bottom section (custom private key) is renamed to **"Custom CA"**. It retains its current red warning border (`border-red-500`) and security warning text.
- **D-04:** The "Custom CA" rename is UI-only — no code changes to field names or data model.

### Number Input UX & Formatting
- **D-05:** **Total supply** input uses locale-aware formatting (thousands separators via `Intl.NumberFormat` or `toLocaleString()`). Formatting must respect browser locale settings — **do not hardcode commas/periods**.
- **D-06:** **Price inputs** (initial, min, max) remain plain numbers — no inline formatting, no trailing zeros.
- **D-07:** Each Launch Parameters field has **inline helper text** beneath the input explaining its purpose (e.g., "Total tokens that will be created", "The starting price of the liquidity pool").

### Price Range Validation Display
- **D-08:** Validation uses **per-field error messages** (e.g., "Price range maximum must be greater than initial price" under the max field).
- **D-09:** Validation triggers **on blur** (when user leaves a field), not real-time onChange or only on submit.
- **D-10:** Error display is **standard red text** consistent with other form errors (`text-destructive` class). No special border highlights or auto-correction.
- **D-11:** Validation uses the existing `superRefine` pattern in the Zod schema (same approach as custom private key validation).

### Collapsed State Indicators
- **D-12:** When "Launch Parameters" is collapsed and values differ from defaults, the section header shows a **"Modified" badge** (small chip/tag beside the title).
- **D-13:** The badge is only visible when at least one field differs from `DEFAULT_LAUNCH_PARAMS`. Default values = no badge.
- **D-14:** The badge uses muted styling (gray/slate) to avoid competing with the "Custom CA" red warning.

### Collapsible Section Behavior
- **D-15:** The collapsible section uses a **chevron/arrow toggle** in the card header (consistent with standard shadcn/ui disclosure pattern).
- **D-16:** Expanding/collapsing **preserves all entered values** via `react-hook-form` state — no form reset, no data loss.
- **D-17:** The section is **collapsed by default** on initial load so the default form stays simple.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements & Roadmap
- `.planning/PROJECT.md` — Project overview, key decisions, constraints
- `.planning/REQUIREMENTS.md` — Full v1 requirements mapped to phases (LAUN-01 through LAUN-05, FORM-01 through FORM-04, VALID-01 for this phase)
- `.planning/ROADMAP.md` — Phase 2 goal, success criteria, boundaries

### Phase 1 Context (Foundation Decisions)
- `.planning/phases/01-types-schema-defaults-foundation/01-CONTEXT.md` — Schema, types, and defaults decisions that constrain this phase

### Existing Database Schema
- `lib/db/schema/tokens.ts` — Tokens table with new Phase 1 columns (totalSupply, initialPrice, priceRangeMin, priceRangeMax, holdbackPercentage, quoteTokenMint, feeSchedulerMode, feeTokenMode)
- `lib/db/schema/index.ts` — Schema barrel exports

### Existing Types & Config
- `types/token.ts` — `TokenFormData`, `TokenLaunchConfig` (already updated with new fields in Phase 1)
- `types/fee.ts` — `FeeSchedulerConfig`, `FeeTokenMode` (already created in Phase 1)
- `config/defaults.ts` — Default values for all launch parameters (already created in Phase 1)

### Existing Form Component (Primary Target for Changes)
- `components/forms/TokenLaunchForm.tsx` — Current form with Zod schema, `useForm` defaults, and existing sections. This is the primary file to modify for Phase 2.

### Existing UI Primitives
- `components/ui/card.tsx` — Card, CardHeader, CardTitle, CardContent (used for form sections)
- `components/ui/input.tsx` — Input component (used for form fields)
- `components/ui/label.tsx` — Label component
- `components/ui/button.tsx` — Button component

### Existing Service & SDK Integration
- `lib/services/launchService.ts` — Token launch orchestration (uses `TokenFormData`, already updated for new fields in Phase 1)
- `lib/solana/poolUtils.ts` — Meteora pool creation (uses `TokenLaunchConfig`, already updated in Phase 1)

### API Routes
- `app/api/tokens/create/route.ts` — Persist token after launch (already accepts new fields from Phase 1)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Card component** (`components/ui/card.tsx`): Card, CardHeader, CardTitle, CardContent — used for section grouping. Follow this pattern for the new "Launch Parameters" section.
- **Input + Label components** (`components/ui/input.tsx`, `components/ui/label.tsx`): Already used throughout the form. No new primitives needed.
- **Button component** (`components/ui/button.tsx`): Already at the bottom for form submission.
- **Image component** (`next/image`): Used for logo preview.

### Established Patterns
- **"use client" directive**: TokenLaunchForm.tsx is a client component (already set).
- **react-hook-form + zodResolver**: Form state managed via `useForm` with Zod validation. Default values come from `DEFAULT_LAUNCH_PARAMS` in `config/defaults.ts`.
- **Zod `superRefine`**: Cross-field validation used for custom private key. Extend this pattern for price range validation (min < initial < max).
- **useState for local UI state**: Checkbox toggles (enableTimedLaunch, enableCustomPrivateKey) use local state + `register`. The "Launch Parameters" collapsible toggle should follow this pattern.
- **Card-based sections**: Each logical grouping is wrapped in a `<Card>` — Token Info, Launch Time, Fee Schedule, Socials, Advanced Settings (Custom CA).

### Integration Points
- **Zod schema** in `TokenLaunchForm.tsx`: Already contains `totalSupply`, `initialPrice`, `priceRangeMin`, `priceRangeMax` fields. Need to add cross-field validation via `superRefine`.
- **`useForm` defaultValues**: Already pre-filled with `DEFAULT_LAUNCH_PARAMS.totalSupply`, `.initialPrice`, etc. No change needed.
- **`handleFormSubmit`**: Already constructs `TokenFormData` with these fields. No change needed.
- **Props interface**: `TokenLaunchFormProps` passes `TokenFormData` to parent — already compatible.

### Form Architecture Notes
- The form currently has sections: Token Info → Launch Time → Fee Schedule → Socials → Advanced Settings (Custom CA)
- The new "Launch Parameters" section goes **after Socials** and **before Custom CA**
- Fee Schedule section currently displays `feeSchedulerMode` as a read-only badge (will become editable in Phase 3)
- Launch Time section has its own collapsible toggle pattern (enableTimedLaunch checkbox) — the new section should use a similar toggle mechanism but with a chevron in the card header

</code_context>

<specifics>
## Specific Ideas

- **Locale-aware formatting requirement**: The user explicitly requested that number formatting use browser locale settings for the thousands separator, not hardcoded commas.
- **Default values**: All Launch Parameters fields are pre-filled with `DEFAULT_LAUNCH_PARAMS` from `config/defaults.ts` — this is already wired in the form's `defaultValues`.
- **Helper text style**: Add a `<p className="text-sm text-muted-foreground">` beneath each field in the Launch Parameters section.
- **"Modified" badge**: Can be implemented as a small `<span>` with muted background color (e.g., `bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs`) next to the CardTitle — check against `DEFAULT_LAUNCH_PARAMS` to determine visibility.
- **Custom CA rename**: Change `<CardTitle>Advanced Settings</CardTitle>` to `<CardTitle>Custom CA</CardTitle>` and update the CardDescription text. Keep the `border-red-500` conditional class.

</specifics>

<deferred>
## Deferred Ideas

- **Holdback slider** (Phase 3): Holdback percentage input will be a slider with red-flag warning at >10%
- **Fee scheduler mode selector** (Phase 3): Will upgrade the current read-only `feeSchedulerMode` badge to a functional dropdown
- **Quote token dropdown** (Phase 3): Will replace the current hardcoded quote token
- **Fee token mode selector** (Phase 3): Will upgrade the current read-only `feeTokenMode` state to a functional control
- **Launch confirmation modal** (Phase 3): Will highlight non-default advanced selections

</deferred>

---

*Phase: 2-Core Form Parameters & Basic UI*
*Context gathered: 2026-05-24*
