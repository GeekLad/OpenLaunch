# Phase 02: Core Form Parameters & Basic UI - Research

**Researched:** 2026-05-24
**Domain:** React 19 + Next.js 16 + react-hook-form 7.76 + Zod 3.25 + shadcn/ui + Tailwind CSS
**Confidence:** HIGH

## Summary

This phase expands the token launch form with a new **"Launch Parameters"** collapsible section containing supply, initial price, and price range (min/max) fields. The implementation requires locale-aware number formatting for the total supply input, a chevron-toggle collapsible card section that preserves `react-hook-form` state, cross-field Zod validation for price ordering (min < initial < max), per-field error display on blur, and a "Modified" badge indicator when values differ from defaults.

All technical requirements are well-understood. The project already uses `react-hook-form` + `zodResolver` with an established `superRefine` pattern for cross-field validation (currently used for custom private key validation). The shadcn/ui primitives (Card, Input, Label, Button) support the needed composition patterns. No new external dependencies are required — all functionality is achievable with the existing stack.

**Primary recommendation:** Implement the Launch Parameters section as a `<Card>` with a clickable `<CardHeader>` containing a chevron toggle, use `Controller` for the locale-aware formatted supply input, extend the existing `superRefine` block for price range validation with per-field `ctx.addIssue()` calls, and compute the "Modified" badge by comparing `watch()` values against `DEFAULT_LAUNCH_PARAMS`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Locale-aware number formatting | Browser / Client | — | Input formatting and locale detection are pure client-side concerns. Server has no access to `navigator.language`. |
| Collapsible section toggle | Browser / Client | — | Section visibility is local UI state (`useState`). No server interaction. |
| Form state preservation | Browser / Client | — | `react-hook-form` stores state in the client-side form controller, not in DOM. Collapsing/unmounting inputs does not affect form values if `shouldUnregister: false` (the default). |
| Cross-field price validation | Browser / Client | API / Backend | Zod `superRefine` runs client-side for UX. Server-side validation is a future concern (VALID-02 in Phase 3). |
| "Modified" badge detection | Browser / Client | — | Pure client-side computation comparing `watch()` values against `DEFAULT_LAUNCH_PARAMS`. |

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** The new collapsible section is named **"Launch Parameters"** (not "Advanced Options" / "Advanced Settings").
- **D-02:** "Launch Parameters" appears **after Socials** and **before "Custom CA"** in the form order.
- **D-03:** The existing bottom section is renamed to **"Custom CA"**. It retains its current red warning border (`border-red-500`) and security warning text.
- **D-04:** The "Custom CA" rename is UI-only — no code changes to field names or data model.
- **D-05:** **Total supply** input uses locale-aware formatting (thousands separators via `Intl.NumberFormat` or `toLocaleString()`). Formatting must respect browser locale settings — **do not hardcode commas/periods**.
- **D-06:** **Price inputs** (initial, min, max) remain plain numbers — no inline formatting, no trailing zeros.
- **D-07:** Each Launch Parameters field has **inline helper text** beneath the input explaining its purpose.
- **D-08:** Validation uses **per-field error messages** (e.g., "Price range maximum must be greater than initial price" under the max field).
- **D-09:** Validation triggers **on blur** (when user leaves a field), not real-time onChange or only on submit.
- **D-10:** Error display is **standard red text** consistent with other form errors (`text-destructive` class). No special border highlights or auto-correction.
- **D-11:** Validation uses the existing `superRefine` pattern in the Zod schema (same approach as custom private key validation).
- **D-12:** When "Launch Parameters" is collapsed and values differ from defaults, the section header shows a **"Modified" badge**.
- **D-13:** The badge is only visible when at least one field differs from `DEFAULT_LAUNCH_PARAMS`.
- **D-14:** The badge uses muted styling (gray/slate) to avoid competing with the "Custom CA" red warning.
- **D-15:** The collapsible section uses a **chevron/arrow toggle** in the card header (consistent with standard shadcn/ui disclosure pattern).
- **D-16:** Expanding/collapsing **preserves all entered values** via `react-hook-form` state — no form reset, no data loss.
- **D-17:** The section is **collapsed by default** on initial load so the default form stays simple.

### the agent's Discretion

None — all decisions are locked.

### Deferred Ideas (OUT OF SCOPE)

- Holdback slider (Phase 3)
- Fee scheduler mode selector (Phase 3)
- Quote token dropdown (Phase 3)
- Fee token mode selector (Phase 3)
- Launch confirmation modal (Phase 3)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LAUN-01 | User can set total token supply (default: 1,000,000,000) | Use `Controller` with `Intl.NumberFormat` for locale-aware display. Store raw number in form state. |
| LAUN-02 | User can set initial price (default: 0.00001) | Plain `number` input with `register("initialPrice", { valueAsNumber: true })`. |
| LAUN-03 | User can set price range minimum (default: 0.000001) | Plain `number` input with `register("priceRangeMin", { valueAsNumber: true })`. |
| LAUN-04 | User can set price range maximum (default: 0.0001) | Plain `number` input with `register("priceRangeMax", { valueAsNumber: true })`. |
| LAUN-05 | Validation ensures min price < initial price < max price | Zod `superRefine` with `ctx.addIssue({ path: ["priceRangeMin"] })` etc. for per-field errors. |
| FORM-01 | Default form shows only essential fields (name, symbol, logo, description) | Already implemented — "Launch Parameters" is collapsed by default (D-17). |
| FORM-02 | All configurable parameters grouped in collapsible section | New `<Card>` section placed between Socials and Custom CA per D-02. |
| FORM-03 | Section can be expanded/collapsed without losing form state | `react-hook-form` default `shouldUnregister: false` preserves values when inputs are unmounted. |
| FORM-04 | Form pre-fills all advanced fields with environment defaults | Already implemented — `useForm` `defaultValues` set from `DEFAULT_LAUNCH_PARAMS`. |
| VALID-01 | Frontend Zod schema validates all inputs with human-friendly messages | Extend existing schema with `superRefine` price range validation and per-field errors. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-hook-form | 7.66.0 (installed) / 7.76.1 (latest) | Form state management, controlled inputs, validation orchestration | Already in use project-wide. `Controller` component needed for locale-aware supply input. |
| zod | 3.25.76 (installed) / 4.4.3 (latest) | Schema validation, cross-field refinement | Already in use with `zodResolver`. `superRefine` is the established pattern for cross-field validation. |
| @hookform/resolvers | 5.2.2 | Bridges `react-hook-form` and Zod | Already in use. |
| lucide-react | 0.553.0 | Icons (ChevronDown, ChevronUp for toggle) | Already in use. `lucide-react` provides `ChevronDown` and `ChevronUp` icons. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Intl.NumberFormat | Native API | Locale-aware number formatting for supply input | Use for display formatting on total supply. No package needed — built into modern browsers. |
| `toLocaleString()` | Native API | Fallback/convenience for number formatting | Alternative to `Intl.NumberFormat` for one-off formatting. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `Controller` + manual formatting | `react-number-format` library | Adds dependency. Manual approach with `Controller` is sufficient for one field and avoids learning curve. |
| `superRefine` | `.refine()` with `path` | `superRefine` is already used in this codebase and gives more control over multiple issues and error paths. |
| Chevron in header | Separate toggle button outside card | Putting toggle in `CardHeader` is cleaner UI and follows shadcn disclosure pattern. |

**Installation:** No new packages required — all dependencies are already installed.

## Package Legitimacy Audit

> No external packages are being installed in this phase. All required functionality uses existing dependencies or native browser APIs.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| *(none)* | — | — | — | — | — | — |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
User Interaction Flow:

[Browser] → [TokenLaunchForm.tsx]
              │
              ├── "use client" directive (already present)
              │
              ├── useForm({ resolver: zodResolver(tokenFormSchema), defaultValues })
              │   └── Form state managed by react-hook-form
              │
              ├── Local useState:
              │   ├── isLaunchParamsOpen (boolean, default false)
              │   └── isLaunchParamsModified (computed from watch() vs defaults)
              │
              ├── Card: "Token Information" (always visible)
              ├── Card: "Launch Time" (always visible)
              ├── Card: "Fee Schedule" (always visible)
              ├── Card: "Social Links" (always visible)
              ├── Card: "Launch Parameters" (collapsible)
              │   ├── CardHeader (clickable, toggles isLaunchParamsOpen)
              │   │   ├── CardTitle + "Modified" badge (conditional)
              │   │   └── ChevronDown/ChevronUp icon
              │   └── CardContent (conditional render)
              │       ├── Total Supply (Controller + Intl.NumberFormat)
              │       ├── Initial Price (plain Input, register)
              │       ├── Price Range Min (plain Input, register)
              │       └── Price Range Max (plain Input, register)
              ├── Card: "Custom CA" (renamed from "Advanced Settings")
              │
              └── Button: "Launch Token"

Validation Flow:

User leaves field (onBlur)
  → react-hook-form validation triggered (mode: "onBlur")
  → zodResolver runs tokenFormSchema
  → superRefine checks: min < initial < max
  → ctx.addIssue({ path: ["priceRangeMin"], message: "..." })
  → errors object updated
  → per-field error text rendered below input
```

### Recommended Project Structure

No new files needed — all changes are within the existing form component.

```
components/forms/
├── TokenLaunchForm.tsx          # MODIFY: Add Launch Parameters section, validation, badge
components/ui/
├── card.tsx                     # EXISTING: Card, CardHeader, CardTitle, CardContent
├── input.tsx                    # EXISTING: Input component
├── label.tsx                    # EXISTING: Label component
config/
├── defaults.ts                  # EXISTING: DEFAULT_LAUNCH_PARAMS reference for badge
```

### Pattern 1: Locale-Aware Number Input with Controller
**What:** A controlled input that displays locale-formatted numbers (e.g., "1,000,000,000") while storing the raw numeric value in form state.
**When to use:** Total supply input (LAUN-01) where large numbers benefit from thousands separators.
**Example:**
```tsx
// Source: react-hook-form Controller docs + Intl.NumberFormat MDN
import { Controller } from "react-hook-form";

<Controller
  name="totalSupply"
  control={control}
  render={({ field: { onChange, value, onBlur } }) => (
    <Input
      type="text"
      inputMode="numeric"
      value={value ? new Intl.NumberFormat(navigator.language).format(value) : ""}
      onChange={(e) => {
        // Strip non-numeric chars and parse
        const raw = e.target.value.replace(/[^\d]/g, "");
        const num = raw ? parseInt(raw, 10) : 0;
        onChange(num);
      }}
      onBlur={onBlur}
    />
  )}
/>
```
**Key considerations:**
- `inputMode="numeric"` shows numeric keyboard on mobile.
- Stripping non-digit chars on change ensures only numbers are stored.
- `Intl.NumberFormat(navigator.language)` respects browser locale for separators.
- The raw number is stored in form state; formatted string is display-only.

### Pattern 2: Chevvron-Toggle Collapsible Card Section
**What:** A shadcn/ui Card with a clickable header that toggles content visibility using local React state.
**When to use:** Launch Parameters section (FORM-02, FORM-03).
**Example:**
```tsx
// Source: shadcn/ui Card component API + react useState pattern
const [isOpen, setIsOpen] = useState(false);

<Card>
  <CardHeader
    className="cursor-pointer flex flex-row items-center justify-between"
    onClick={() => setIsOpen(!isOpen)}
  >
    <div className="flex items-center gap-2">
      <CardTitle>Launch Parameters</CardTitle>
      {isModified && (
        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">
          Modified
        </span>
      )}
    </div>
    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
  </CardHeader>
  {isOpen && (
    <CardContent className="space-y-4">
      {/* Fields */}
    </CardContent>
  )}
</Card>
```
**Key considerations:**
- `react-hook-form` default `shouldUnregister: false` means values persist when inputs are unmounted on collapse.
- The chevron icon provides clear affordance.
- CardTitle can accept inline children (badge span) because it renders as `<h3>` with `...props` spread.

### Pattern 3: Zod superRefine for Cross-Field Price Validation
**What:** Adding per-field validation errors within `superRefine` to enforce ordering constraints (min < initial < max).
**When to use:** LAUN-05 price range validation.
**Example:**
```tsx
// Source: zod.dev superRefine docs + existing project pattern
const tokenFormSchema = z.object({
  // ... other fields ...
  totalSupply: z.number().min(1, "Total supply must be at least 1"),
  initialPrice: z.number().positive("Initial price must be greater than 0"),
  priceRangeMin: z.number().positive("Minimum price must be greater than 0"),
  priceRangeMax: z.number().positive("Maximum price must be greater than 0"),
}).superRefine((data, ctx) => {
  // Existing custom private key validation ...

  // Price range validation
  if (data.priceRangeMin >= data.initialPrice) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Minimum price must be less than initial price",
      path: ["priceRangeMin"],
    });
  }

  if (data.initialPrice >= data.priceRangeMax) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Initial price must be less than maximum price",
      path: ["priceRangeMax"],
    });
  }

  if (data.priceRangeMin >= data.priceRangeMax) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Minimum price must be less than maximum price",
      path: ["priceRangeMin"],
    });
  }
});
```
**Key considerations:**
- Each `ctx.addIssue` targets a specific field via `path` for per-field error display (D-08).
- Multiple issues can be added — all will be reported.
- Validation runs on blur when `mode: "onBlur"` is set on the form (or field-level).

### Pattern 4: "Modified" Badge Detection
**What:** Compute whether any Launch Parameters field differs from its default value.
**When to use:** D-12, D-13, D-14 — show badge in collapsed header.
**Example:**
```tsx
// Source: react-hook-form watch() API + project defaults.ts
const watchedValues = watch(["totalSupply", "initialPrice", "priceRangeMin", "priceRangeMax"]);

const isModified = useMemo(() => {
  return watchedValues[0] !== DEFAULT_LAUNCH_PARAMS.totalSupply ||
    watchedValues[1] !== DEFAULT_LAUNCH_PARAMS.initialPrice ||
    watchedValues[2] !== DEFAULT_LAUNCH_PARAMS.priceRangeMin ||
    watchedValues[3] !== DEFAULT_LAUNCH_PARAMS.priceRangeMax;
}, [watchedValues]);
```
**Key considerations:**
- `watch()` with array of field names returns values in corresponding order.
- Use `useMemo` to avoid recomputing on every render.
- Badge styling: `bg-slate-100 text-slate-600` (muted, per D-14) to avoid competing with Custom CA's red warning.

### Anti-Patterns to Avoid
- **Uncontrolled formatted input:** Do NOT use `register()` with `type="number"` and try to inject formatting — this causes cursor jump issues and inconsistent state. Use `Controller` for the formatted supply field.
- **Manual form reset on toggle:** Do NOT call `reset()` or `setValue()` when toggling the section — this would wipe user input. The default `shouldUnregister: false` handles persistence automatically.
- **Real-time price validation on every keystroke:** Do NOT use `mode: "onChange"` for price fields (per D-09). Set `mode: "onBlur"` on `useForm` or validate on blur only for these fields.
- **Hardcoded locale separators:** Do NOT hardcode `","` or `"."` for thousands separators (per D-05). Always use `Intl.NumberFormat` with `navigator.language`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form state management | Custom useState + useEffect | `react-hook-form` (already in use) | Validation orchestration, error handling, dirty tracking, and focus management are complex and already solved. |
| Number formatting with locale | Manual string manipulation with hardcoded separators | `Intl.NumberFormat` or `Number.prototype.toLocaleString()` | Properly handles different locales (e.g., `de-DE` uses periods as thousands separators, commas for decimals). |
| Collapsible section animation | Custom CSS transitions with height calculations | Simple conditional render (`{isOpen && <CardContent>}`) | The requirement (D-16) is about state preservation, not animation. Conditional rendering is sufficient and avoids layout thrashing. |
| Custom validation library | Writing custom validation functions | Zod + `superRefine` (already in use) | Type safety, error path control, and integration with react-hook-form are already solved. |

## Common Pitfalls

### Pitfall 1: Cursor Jump in Formatted Number Input
**What goes wrong:** When the user types in a formatted number input (e.g., "1,000,000"), the cursor jumps to the end of the input after every keystroke because React re-renders the controlled input with the formatted value.
**Why it happens:** The input value string length changes when formatting characters are added/removed (e.g., typing "1000" becomes "1,000"), and React resets the cursor position.
**How to avoid:** Use `inputMode="numeric"` and strip non-digits on change so the stored value is always a clean number. Accept that formatting is display-only. Alternatively, format only on blur (show raw number while typing, format on blur), but this is a poorer UX. The recommended approach: accept raw input, format via `Controller` — cursor jumping is a known React behavior with formatted inputs; test thoroughly.
**Warning signs:** Cursor jumps to end on every keystroke; backspace removes entire groups of digits.

### Pitfall 2: Form Values Resetting on Section Collapse
**What goes wrong:** When the user collapses the "Launch Parameters" section, the input fields unmount from the DOM, and their values disappear from the form state.
**Why it happens:** If `shouldUnregister: true` is set on `useForm` (or the default behavior changes in a future version), unmounting inputs removes their values.
**How to avoid:** Ensure `shouldUnregister` is not set to `true` on `useForm` (default is `false`). Verify by checking `const values = getValues()` after toggling — values should persist.
**Warning signs:** After collapsing and re-expanding, fields show defaults instead of user-entered values.

### Pitfall 3: Zod superRefine Not Running on Blur
**What goes wrong:** Cross-field validation errors don't appear when leaving a price field — only on submit.
**Why it happens:** `react-hook-form`'s default validation mode is `onSubmit`. Cross-field refinements only run when the entire schema is validated.
**How to avoid:** Set `mode: "onBlur"` on the `useForm` config to trigger validation on blur. Or, for more granular control, call `trigger()` manually in the input's `onBlur` handler.
**Warning signs:** Price validation errors only appear after clicking "Launch Token", not when tabbing between fields.

### Pitfall 4: Price Comparison with Floating-Point Precision
**What goes wrong:** Price comparisons like `0.00001 < 0.000001` or equality checks with defaults fail unexpectedly due to floating-point representation.
**Why it happens:** JavaScript uses IEEE 754 floating-point arithmetic. Small decimal numbers like 0.000001 are not represented exactly.
**How to avoid:** Use `<=` / `>=` for comparisons rather than exact equality. For default comparisons in the "Modified" badge, use `!==` which works correctly since defaults are literal values defined in source code. For user-facing comparisons, the magnitude differences in this domain (min 0.000001 vs max 0.0001) are large enough that floating-point epsilon is not a concern.
**Warning signs:** Edge case where prices are extremely close together and comparisons behave inconsistently.

### Pitfall 5: Locale Formatting Producing Non-Numeric Characters in Form State
**What goes wrong:** If the formatted string (e.g., "1.000.000,00" in German locale) is accidentally stored as the form value, downstream code that expects a number breaks.
**Why it happens:** The `onChange` handler for the `Controller` might pass the formatted string to `field.onChange()` instead of the parsed number.
**How to avoid:** Always parse the raw input to a number before calling `field.onChange()`. The display value should be derived from the numeric form state, not the other way around.
**Warning signs:** Form submission fails with "expected number, received string" or similar type errors.

## Code Examples

### Locale-Aware Total Supply Input (Complete Pattern)
```tsx
// Source: react-hook-form Controller docs + MDN Intl.NumberFormat
import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Inside the form component:
<Controller
  name="totalSupply"
  control={control}
  render={({ field: { onChange, value, onBlur } }) => (
    <div className="space-y-2">
      <Label htmlFor="totalSupply">Total Supply</Label>
      <Input
        id="totalSupply"
        type="text"
        inputMode="numeric"
        value={value ? new Intl.NumberFormat(navigator.language).format(value) : ""}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d]/g, "");
          const num = raw ? parseInt(raw, 10) : 0;
          onChange(num);
        }}
        onBlur={onBlur}
        disabled={isLoading}
      />
      <p className="text-sm text-muted-foreground">
        Total tokens that will be created
      </p>
      {errors.totalSupply && (
        <p className="text-sm text-destructive">{errors.totalSupply.message}</p>
      )}
    </div>
  )}
/>
```

### Collapsible Launch Parameters Section (Complete Pattern)
```tsx
// Source: shadcn/ui Card + existing form patterns
import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const [isLaunchParamsOpen, setIsLaunchParamsOpen] = useState(false);

// Compute modified state
const [supply, initial, min, max] = watch([
  "totalSupply", "initialPrice", "priceRangeMin", "priceRangeMax"
]);
const isModified = useMemo(() =>
  supply !== DEFAULT_LAUNCH_PARAMS.totalSupply ||
  initial !== DEFAULT_LAUNCH_PARAMS.initialPrice ||
  min !== DEFAULT_LAUNCH_PARAMS.priceRangeMin ||
  max !== DEFAULT_LAUNCH_PARAMS.priceRangeMax,
  [supply, initial, min, max]
);

<Card>
  <CardHeader
    className="cursor-pointer flex flex-row items-center justify-between"
    onClick={() => setIsLaunchParamsOpen(!isLaunchParamsOpen)}
  >
    <div className="flex items-center gap-2">
      <CardTitle>Launch Parameters</CardTitle>
      {!isLaunchParamsOpen && isModified && (
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
          Modified
        </span>
      )}
    </div>
    {isLaunchParamsOpen
      ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
      : <ChevronDown className="h-4 w-4 text-muted-foreground" />
    }
  </CardHeader>
  {isLaunchParamsOpen && (
    <CardContent className="space-y-4">
      {/* Total Supply Controller input */}
      {/* Initial Price input */}
      {/* Price Range Min input */}
      {/* Price Range Max input */}
    </CardContent>
  )}
</Card>
```

### Price Range Validation (superRefine Extension)
```tsx
// Source: zod.dev superRefine docs + existing project pattern
const tokenFormSchema = z.object({
  // ... existing fields ...
  totalSupply: z.number().min(1, "Total supply must be at least 1"),
  initialPrice: z.number().positive("Initial price must be greater than 0"),
  priceRangeMin: z.number().positive("Minimum price must be greater than 0"),
  priceRangeMax: z.number().positive("Maximum price must be greater than 0"),
}).superRefine((data, ctx) => {
  // ... existing custom private key validation ...

  // Price range validation (min < initial < max)
  if (data.priceRangeMin >= data.initialPrice) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Minimum price must be less than initial price",
      path: ["priceRangeMin"],
    });
  }

  if (data.initialPrice >= data.priceRangeMax) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Initial price must be less than maximum price",
      path: ["priceRangeMax"],
    });
  }

  if (data.priceRangeMin >= data.priceRangeMax) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Minimum price must be less than maximum price",
      path: ["priceRangeMin"],
    });
  }
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `react-hook-form` v6 `Controller` render prop | v7 `Controller` with simpler API | 2021 | v7 is already in use (7.66.0). No migration needed. |
| Zod `.refine()` with single error | Zod `.superRefine()` with multiple `ctx.addIssue()` | Zod v3.22+ | `superRefine` is already used in this codebase for private key validation. |
| Manual number formatting with regex | `Intl.NumberFormat` with locale | Native API (ES2020) | Modern, locale-aware, no dependencies. |
| "Advanced Settings" section name | "Launch Parameters" (D-01) + "Custom CA" rename (D-03) | Phase 2 | UI-only rename per D-04. No data model changes. |

**Deprecated/outdated:**
- None applicable for this phase.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `react-hook-form` default `shouldUnregister: false` preserves values when inputs unmount on section collapse. | Collapsible Section Behavior | If wrong, form values would be lost on collapse. Mitigation: explicitly verify in implementation and add `shouldUnregister: false` to `useForm` config if needed. |
| A2 | `navigator.language` reliably provides the user's preferred locale for number formatting. | Locale-aware formatting | If wrong (e.g., in non-browser environments or if user hasn't set locale), formatting falls back to system default. Mitigation: `Intl.NumberFormat` accepts undefined locale which uses system default. |
| A3 | `CardTitle` accepts children/inline elements because it spreads `...props` onto an `<h3>`. | "Modified" badge indicator | If wrong, badge cannot be placed inline with title. Mitigation: Verified by reading `components/ui/card.tsx` source — it does spread props. |

## Open Questions

1. **Should total supply have a maximum value?**
   - What we know: Current schema has `z.number().min(1)` but no upper bound.
   - What's unclear: Is there a practical upper limit for total supply in the Meteora SDK or Solana SPL Token program?
   - Recommendation: Add a sensible upper bound (e.g., `z.number().min(1).max(1_000_000_000_000)`) to prevent accidental extreme values. Research Solana SPL Token max supply if needed during implementation.

2. **Should price inputs use `step` attributes?**
   - What we know: Current project uses `type="number"` inputs without step attributes.
   - What's unclear: Do price inputs benefit from step increments (e.g., 0.000001 step)?
   - Recommendation: No step attribute for price inputs per D-06 (plain numbers, no trailing zeros). Users should be able to enter any valid decimal.

3. **Is there a need to disable the "Launch Token" button when Launch Parameters has validation errors?**
   - What we know: Current form disables button only when required fields are empty or file size warning exists.
   - What's unclear: Should price range validation errors also block submission?
   - Recommendation: Yes — the existing `isFormValid` check should incorporate `formState.isValid` from react-hook-form so that Zod validation errors (including price range) prevent submission. This is standard behavior for react-hook-form + zodResolver.

## Environment Availability

> Phase 2 is purely frontend/code changes with no new external dependencies. No external tools, services, or CLI utilities are required beyond the existing development environment.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js runtime | ✓ | 24.16.0 | — |
| npm | Package management | ✓ | 11.13.0 | — |
| React 19 | UI framework | ✓ | 19.2.0 | — |
| Next.js 16 | Framework | ✓ | 16.0.1 | — |
| react-hook-form | Form state | ✓ | 7.66.0 | — |
| zod | Validation | ✓ | 3.25.76 | — |
| shadcn/ui primitives | UI components | ✓ | (project-local) | — |

**Missing dependencies with no fallback:** none
**Missing dependencies with fallback:** none

## Validation Architecture

> `workflow.nyquist_validation` is enabled (true) per `.planning/config.json`.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None installed (no jest, vitest, or playwright detected) |
| Config file | none |
| Quick run command | `npm run lint` (type-check + eslint) |
| Full suite command | `npm run lint` + `npm run db:test` (smoke test) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LAUN-01 | Total supply field accepts and formats large numbers | manual / visual | N/A | ❌ |
| LAUN-02 | Initial price field accepts decimal values | manual / visual | N/A | ❌ |
| LAUN-03 | Price range min field accepts decimal values | manual / visual | N/A | ❌ |
| LAUN-04 | Price range max field accepts decimal values | manual / visual | N/A | ❌ |
| LAUN-05 | Validation prevents min >= initial >= max | manual / visual | N/A | ❌ |
| FORM-01 | Default form shows only essential fields | visual inspection | N/A | ❌ |
| FORM-02 | Launch Parameters section exists between Socials and Custom CA | visual inspection | N/A | ❌ |
| FORM-03 | Expanding/collapsing preserves values | manual test | N/A | ❌ |
| FORM-04 | Fields pre-filled with defaults | visual inspection | N/A | ❌ |
| VALID-01 | Zod errors display with human-friendly messages | manual test | N/A | ❌ |

### Sampling Rate
- **Per task commit:** `npm run lint` (type-check + eslint)
- **Per wave merge:** `npm run lint`
- **Phase gate:** Manual verification of all requirements in browser + `npm run lint` green

### Wave 0 Gaps
- [ ] No automated test framework is installed. This is acceptable for Phase 2 (UI-only changes) but should be addressed in Phase 4 as noted in STATE.md blockers.
- [ ] All requirement verification for this phase is manual/visual. Consider adding a simple form validation unit test with a lightweight runner (e.g., `vitest`) if time permits, but this is not blocking.

*(If no gaps: "None — existing test infrastructure covers all phase requirements")*

## Security Domain

> Required when `security_enforcement` is enabled. This phase involves frontend form validation only — no new authentication, session management, cryptography, or access control. However, input validation is a security-relevant concern.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | Zod schema with `z.number().positive()`, `z.number().min()`, per-field validation via `superRefine` |
| V6 Cryptography | no | — |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Client-side validation bypass | Tampering | Server-side validation will be added in Phase 3 (VALID-02). Frontend validation is UX, not security. |
| Numeric overflow/underflow | Tampering | Zod `z.number()` rejects `NaN`, `Infinity`. Add `.max()` bounds for supply to prevent extreme values. |
| Form state manipulation | Tampering | `react-hook-form` + Zod ensures submitted data matches schema. Server-side validation in Phase 3 will enforce final checks. |

## Sources

### Primary (HIGH confidence)
- `react-hook-form` Controller docs — https://react-hook-form.com/docs/usecontroller/controller — API for controlled inputs (verified, used for supply formatting pattern)
- `react-hook-form` useForm docs — https://react-hook-form.com/docs/useform — `mode`, `shouldUnregister`, `watch`, `getValues` behavior (verified)
- Zod `superRefine` docs — https://zod.dev/?id=superrefine — Multiple issue creation with custom paths (verified)
- Project source: `components/forms/TokenLaunchForm.tsx` — Existing `superRefine` pattern for private key validation (verified from codebase)
- Project source: `components/ui/card.tsx` — Card component API and prop spreading (verified from codebase)
- MDN: `Intl.NumberFormat` — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat — Locale-aware formatting API (verified)

### Secondary (MEDIUM confidence)
- shadcn/ui Card component pattern — https://ui.shadcn.com/docs/components/card — Standard usage for section grouping (referenced from official docs)
- lucide-react icons — https://lucide.dev/icons/chevron-down — Chevron icons for toggle (verified via package.json)

### Tertiary (LOW confidence)
- None — all claims are verified from primary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All libraries are already installed and in active use in the project. No version conflicts or API uncertainties.
- Architecture: HIGH — The patterns (Controller, superRefine, conditional rendering) are standard React/react-hook-form patterns. The existing codebase already demonstrates superRefine usage.
- Pitfalls: HIGH — The identified pitfalls (cursor jump, form reset, validation timing) are well-documented in the React ecosystem and the mitigations are concrete.

**Research date:** 2026-05-24
**Valid until:** 2026-06-24 (30 days — React Hook Form and Zod are stable; APIs change slowly)
