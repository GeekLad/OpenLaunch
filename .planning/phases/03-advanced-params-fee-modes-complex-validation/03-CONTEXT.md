# Phase 3: Advanced Parameters, Fee Modes & Complex Validation — Context

**Gathered:** 2026-05-25
**Status:** Ready for planning
**Requirements:** LAUN-06, LAUN-07, LAUN-08, LAUN-09, FEE-01, FEE-02, FEE-03, FEE-04, FEE-05, FORM-05, FORM-06, VALID-02

<domain>
## Phase Boundary

This phase delivers the advanced launch parameters UI and server-side validation layer:

- **Token Holdback** (LAUN-06, LAUN-07, LAUN-08): Slider 0–100%. When >10%, a red-flag warning appears.
- **Quote Token** (LAUN-09): Dropdown selector (SOL default, USDC).
- **Fee Scheduler Mode** (FEE-01–FEE-04): Market-Cap Based (default), Time-Based, or Disabled — each with its own sub-fields.
- **Fee Token Mode** (FEE-05): Quote Token Only (default), or Both Quote + Base Token.
- **Server-side validation** (VALID-02): Rejects parameter combinations that violate SDK constraints before any on-chain work.
- **Launch confirmation modal** (FORM-06): Highlights non-default advanced selections in red for user awareness.

**Out of phase scope:** Phase 4 handles on-chain integration (LAUN-10, FEE-06 transaction wiring), Phase 5 handles persistence to detail pages, Phase 6 handles cron job updates.

</domain>

<decisions>
## Implementation Decisions

### Holdback Slider & Red-Flag Warning

- **D-01:** Holdback percentage is a **slider control** (range 0–100%, step 1%) using `@radix-ui/react-slider` or shadcn/ui Slider component (see `components/ui/slider.tsx`).
- **D-02:** The slider has a **numeric readout** next to it (e.g., "33%") that updates in real time.
- **D-03:** When holdback > 10%, a **red warning banner** (Alert variant="destructive") appears inside the "Advanced Options" section with an icon (AlertTriangle from lucide-react).
- **D-04:** The red-flag warning banner uses text: "Holding back more than 10% may be seen as a red flag by traders" (exact copy from LAUN-07).
- **D-05:** The **red-flag warning is also visible when collapsed** as a red badge on the "Launch Parameters" section header. When expanded → full banner inside section.
- **D-06:** The badge on the section header reads "⚠ High Holdback" (or similar brief text) and must be immediately visible without expanding the section.
- **D-07:** Holdback tokens are **sent to the creator's wallet**; the remainder goes to the liquidity pool. This is a display/promise for now — the actual split logic (LAUN-08) is a Phase 4 concern.

### Fee Scheduler Mode Selection & Dynamic Fields

- **D-08:** Fee scheduler mode is a **radio group or dropdown** with three options: "Market-Cap Based" (default), "Time-Based", "Disabled".
- **D-09:** **Dynamic sub-fields per mode** follow Phase 2's `shouldUnregister: false` + CSS `hidden` pattern (not conditional render). So values persist when switching between modes.
- **D-10:** Market-Cap Based sub-fields: `feeMarketCapStart` (input), `feeMarketCapEnd` (input).
- **D-11:** Time-Based sub-fields: `feeStartRate` (input, basis points), `feeEndRate` (input, basis points), `feeDurationHours` (input).
- **D-12:** Disabled sub-fields: `feeFixedRate` (input, basis points).
- **D-13:** Only one mode's sub-fields are visible at a time; others are present in DOM with `hidden` class to preserve values.
- **D-14:** Switching modes back to a previous selection restores the previously-entered values that were hidden.

### Quote Token Selection & Decimals

- **D-15:** Quote token is a **dropdown** (SOL or USDC) in the "Launch Parameters" section.
- **D-16:** When quote token switches, **price fields do NOT auto-rescale** in the frontend. The user sees raw values.
- **D-17:** A helper text near the quote token selector explains: "USDC has 6 decimals per unit; SOL has 9 decimals per unit. Backend handles decimal scaling."
- **D-18:** Decimal math (price scaling for pool creation) is a **Phase 4 concern** (LAUN-10). Phase 3 only needs the UI dropdown and form field.

### Fee Token Mode Selection

- **D-19:** Fee token mode is a **radio group** with two options: "Quote Token Only" (default), "Both Quote + Base Token".
- **D-20:** This field is shown near fee scheduler controls, in the same logical group.
- **D-21:** The actual `CollectFeeMode` enum mapping (FEE-06) is a Phase 4 concern.

### Server-Side Validation

- **D-22:** A **new API route** `POST /api/tokens/validate` (or extend existing `/api/tokens/create`) performs server-side validation of parameter combinations against SDK constraints.
- **D-23:** Validation runs **before** any on-chain work and returns structured error messages (400 Bad Request with field-level errors).
- **D-24:** Validation errors are returned in the same shape as frontend Zod errors so the UI can display them uniformly.
- **D-25:** Validation checks include: fee rates within SDK bounds, market-cap ranges > 0, holdback within 0–100%, duration > 0, price ranges valid.

### Launch Confirmation Modal

- **D-26:** Modal appears on form submit (before on-chain action) via shadcn/ui Dialog.
- **D-27:** Non-default selections are shown as a **simple key-value list** (bold key, red value if non-default) grouped by section.
- **D-28:** A "Launch Token" button inside the modal is the final trigger. Cancel closes the modal.
- **D-29:** The modal includes a warning: "Launching a token on-chain is irreversible."

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements & Roadmap
- `.planning/PROJECT.md` — Project overview, constraints, key decisions
- `.planning/REQUIREMENTS.md` — Full v1 requirements (LAUN-06 through LAUN-09, FEE-01 through FEE-05, FORM-05, FORM-06, VALID-02)
- `.planning/ROADMAP.md` — Phase 3 goal, success criteria, boundaries

### Phase 2 Context (Design Patterns Locked)
- `.planning/phases/02-core-form-basic-ui/02-CONTEXT.md` — Section naming, collapsible behavior, validation display, badge patterns

### Phase 1 Context (Types & Schema)
- `.planning/phases/01-types-schema-defaults-foundation/01-CONTEXT.md` — Schema, discriminated unions, defaults per phase

### Database Schema (Already Extended in Phase 1)
- `lib/db/schema/tokens.ts` — holdbackPercentage, quoteTokenMint, feeSchedulerMode, feeTokenMode, feeMarketCapStart, feeMarketCapEnd, feeStartRate, feeEndRate, feeDurationHours, feeFixedRate

### Types & Config (Already Created in Phase 1)
- `types/token.ts` — `TokenFormData`, `TokenLaunchConfig`
- `types/fee.ts` — `FeeSchedulerConfig` (discriminated union for 3 modes), `CollectFeeMode`
- `config/defaults.ts` — DEFAULTS object with all fields pre-filled

### Form Component (Target for Changes)
- `components/forms/TokenLaunchForm.tsx` — Primary form file; Phase 2 already added supply/price fields

### Existing UI Primitives
- `components/ui/card.tsx` — Card, CardHeader, CardTitle, CardContent (already used for sections)
- `components/ui/input.tsx` — Input component
- `components/ui/label.tsx` — Label component
- `components/ui/button.tsx` — Button component
- `components/ui/dialog.tsx` — Dialog/modal component (likely already exists for shadcn setup)
- `components/ui/slider.tsx` — Slider component (may need to install/install-shadcn)
- `components/ui/select.tsx` — Select component (already exists for quote token dropdown)

### Existing Service & SDK Integration
- `lib/services/launchService.ts` — Orchestration (already updated for Phase 1 fields)
- `lib/solana/poolUtils.ts` — Meteora pool creation (already updated for Phase 1 fields)
- `app/api/tokens/create/route.ts` — Persist token (already accepts new fields)

### SDK Reference (for validation constraints)
- `@meteora-ag/cp-amm-sdk` — Fee scheduler mode constructors, `CollectFeeMode` enum, parameter bounds

### Validation Schema
- `components/forms/TokenLaunchForm.tsx` — existing Zod schema with `superRefine` pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Slider component**: `components/ui/slider.tsx` (exists or install via shadcn). Radix primitive behind `cn()` style wrapper.
- **Select component**: `components/ui/select.tsx` (exists in shadcn/ui) — used for quote token and fee scheduler mode dropdowns.
- **Dialog component**: `components/ui/dialog.tsx` (exists in shadcn/ui) — for launch confirmation modal.
- **Alert component**: `components/ui/alert.tsx` (exists in shadcn/ui) — for warning banner inside section.
- **Badge component**: `components/ui/badge.tsx` (exists in shadcn/ui) — for "Modified" badge and collapsed red-flag badge.

### Established Patterns (from Phase 2)
- **`shouldUnregister: false` + CSS `hidden`**: Collapsible sections keep fields registered in react-hook-form. This MUST be used for fee scheduler sub-fields too.
- **`useMemo` for cross-field computed state**: e.g., `priceError` was computed outside RHF's `errors` object — a pattern to reuse for holdback badge.
- **`Controller` with `onChange` value sanitization**: Used for `totalSupply` number formatting — similar pattern for slider value.
- **Card-based sections**: Each logical grouping is a `<Card>` with header + content.
- Card header pattern from Phase 2:
  ```tsx
  <CardHeader onClick={toggle} className="cursor-pointer flex justify-between">
    <div className="flex items-center gap-2">
      <CardTitle>...</CardTitle>
      <span className="...badge...">Modified</span>
      <span className="...badge...">⚠ High Holdback</span>
    </div>
  </CardHeader>
  ```

### Integration Points
- Zod schema in `TokenLaunchForm.tsx`: Already contains `holdbackPercentage`, `quoteTokenMint`, `feeSchedulerMode`, `feeTokenMode`, `feeMarketCapStart`, `feeMarketCapEnd`, `feeStartRate`, `feeEndRate`, `feeDurationHours`, `feeFixedRate` from Phase 1. Need to add per-mode sub-field validation.
- `useForm` defaultValues: Already pre-filled with `DEFAULTS.holdbackPercentage`, etc. No change needed.
- API routes: `POST /api/tokens/create` already receives these fields via `TokenFormData`. Need to add server-side validation.
- `handleFormSubmit`: Constructs `TokenFormData` with all fields. No change needed.

### Form Architecture Notes
- Current sections: Token Info → Launch Time → Fee Schedule → Socials → **Advanced Options** (holdback/quote/fee scheduler/fee token mode + red-flag behavior)
- Fee Schedule currently displays read-only `feeSchedulerMode` as a badge → upgrade to interactive in this phase.
- **Server-side validation layer**: Add `POST /api/tokens/validate` or extend existing create route to run pre-flight SDK constraint checks.

</code_context>

<specifics>
## Specific Ideas

- **Slider styling**: Align with shadcn/ui Slider pattern — track fill on the left, thumb with hover/active states, value label to the right.
- **Red-flag badge color**: Use `bg-red-100 text-red-800` (or `variant="destructive"` on Badge) for collapsed header warning. Use `Alert` with `variant="destructive"` for the expanded banner.
- **Fee scheduler mode radio group**: Could use shadcn/ui `RadioGroup` component (or segmented control). Recommended: simple Select dropdown to align with existing patterns.
- **Modal content**: Group non-default fields into "Launch Parameters", "Fee Configuration", "Holdback" sections inside modal.
- **SDK validation constraints**: Researcher/planner should look up `@meteora-ag/cp-amm-sdk` docs for exact fee rate bounds, market-cap ranges, and duration constraints.

</specifics>

<deferred>
## Deferred Ideas

- **Fee-to-token math** (Phase 4): How holdback percentage actually splits supply between wallet and pool — requires on-chain transaction changes.
- **Decimal math for USDC** (Phase 4): Price auto-rescaling in form or transparent backend conversion.
- **CollectFeeMode enum mapping** (Phase 4): Passing fee token mode to Meteora SDK.
- **Transaction simulation** (Phase 4): Pre-flight on-chain simulation before submit.
- **Database persistence of all fields** (Phase 5): Saving to DB after on-chain success.
- **Cron job dual-path fee tracking** (Phase 6): Both-token fee mode cron updates.

</deferred>

---

*Phase: 3 — Advanced Parameters, Fee Modes & Complex Validation*
*Context gathered: 2026-05-25*
