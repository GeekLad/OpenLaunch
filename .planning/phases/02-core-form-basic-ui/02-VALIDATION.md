# Phase 02: Core Form Parameters & Basic UI — Validation Strategy

**Phase:** 02-core-form-basic-ui
**Date:** 2026-05-24
**Research source:** 02-RESEARCH.md

## Overview

This validation strategy covers the 5 success criteria and 10 requirements for Phase 2. All verification is manual/visual — no automated test framework exists in the project (Wave 0 gap, deferred to Phase 4 per STATE.md).

## Dimensions

### Dimension 1: Form Structure & Visibility
**What to verify:** The "Launch Parameters" section exists, is collapsible, is collapsed by default, and preserves values on toggle.

| Criterion | How to Check | Pass Threshold |
|-----------|------------|--------------|
| Section appears between Socials and Custom CA | Visual inspection of DOM order | Section renders after Socials card, before Custom CA card |
| Section is collapsed by default on page load | Refresh page, check if CardContent is absent | `isLaunchParamsOpen` state is `false` on initial render |
| Expanding/collapsing preserves entered values | Enter non-default values, toggle section twice, verify values unchanged | `getValues()` returns same numbers after two toggles |
| "Modified" badge appears only when values differ from defaults | Set supply to 2B, collapse section, check badge; reset to default, check badge gone | Badge visible for non-defaults, absent for defaults |

### Dimension 2: Field Validation
**What to verify:** Zod schema rejects invalid price orderings with per-field messages.

| Criterion | How to Check | Pass Threshold |
|-----------|------------|--------------|
| `priceRangeMin >= initialPrice` shows error under min field | Set min = initial, blur min field | `errors.priceRangeMin.message` is non-empty, displayed |
| `initialPrice >= priceRangeMax` shows error under max field | Set initial = max, blur max field | `errors.priceRangeMax.message` is non-empty, displayed |
| `priceRangeMin >= priceRangeMax` shows error under min field | Set min = max, blur min field | `errors.priceRangeMin.message` is non-empty, displayed |
| Valid ordering clears all errors | Set min < initial < max, blur each | `formState.isValid === true` |
| Validation triggers on blur, not onChange | Type invalid value, confirm no error until blur | Error appears only after `onBlur` |

### Dimension 3: Number Formatting
**What to verify:** Total supply field formats with locale-aware separators; price fields do not format.

| Criterion | How to Check | Pass Threshold |
|-----------|------------|--------------|
| Total supply displays "1,000,000,000" (or locale equivalent) | Read the input value | `Intl.NumberFormat(navigator.language).format(1000000000)` matches display |
| Typing supply strips non-digits and updates raw value | Type "abc123" → check form state | `getValues("totalSupply") === 123` |
| Price inputs show raw numbers (no separators) | Enter 0.00001 in initial price | Display is exactly "0.00001" |

### Dimension 4: Default Values
**What to verify:** All new fields are pre-filled with `DEFAULT_LAUNCH_PARAMS` values.

| Criterion | How to Check | Pass Threshold |
|-----------|------------|--------------|
| Total supply defaults to 1,000,000,000 | Check input value on fresh load | `getValues("totalSupply") === 1000000000` |
| Initial price defaults to 0.00001 | Check input value | `getValues("initialPrice") === 0.00001` |
| Price range min defaults to 0.000001 | Check input value | `getValues("priceRangeMin") === 0.000001` |
| Price range max defaults to 0.0001 | Check input value | `getValues("priceRangeMax") === 0.0001` |

### Dimension 5: UI Copy & Styling
**What to verify:** Section names, helper text, and badge styling match UI-SPEC.md.

| Criterion | How to Check | Pass Threshold |
|-----------|------------|--------------|
| Section title is "Launch Parameters" | Read `CardTitle` text | Exact match |
| Bottom section renamed to "Custom CA" | Read `CardTitle` text | Exact match |
| Helper text present under each Launch Parameters field | Visual inspection | 4 helper `<p>` elements with `text-muted-foreground` |
| "Modified" badge uses muted slate styling | Inspect element classes | Contains `bg-slate-100` and `text-slate-600` (or dark mode equivalents) |

### Dimension 6: Integration
**What to verify:** Form submission still works with the new fields.

| Criterion | How to Check | Pass Threshold |
|-----------|------------|--------------|
| `handleFormSubmit` includes new fields in `TokenFormData` | Log constructed object | `totalSupply`, `initialPrice`, `priceRangeMin`, `priceRangeMax` present |
| `TokenFormData` type in `types/token.ts` matches schema | TypeScript compilation | `npm run lint` passes (includes `type-check`) |
| Submit button disabled when validation errors exist | Trigger price error, check button `disabled` | `disabled={!isValid || isLoading}` |

## Nyquist Sampling Rate

- **Per commit:** `npm run lint` (type-check + eslint)
- **Per wave merge:** `npm run lint` + manual browser verification of dimensions above
- **Phase gate:** Full manual verification of all 6 dimensions + `npm run lint` green

## Gaps & Risks

| Gap | Impact | Mitigation |
|-----|--------|------------|
| No automated test framework | All verification is manual; regression risk | `npm run lint` catches TypeScript errors; defer unit tests to Phase 4 |
| Cursor jump in formatted supply input | UX degradation | Documented as known React limitation; acceptable for this phase |

## Sign-off

- [ ] Dimension 1 verified
- [ ] Dimension 2 verified
- [ ] Dimension 3 verified
- [ ] Dimension 4 verified
- [ ] Dimension 5 verified
- [ ] Dimension 6 verified
- [ ] `npm run lint` passes

**Status:** Pending execution
