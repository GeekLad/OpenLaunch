# Phase 2: Core Form Parameters & Basic UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-24
**Phase:** 2-Core Form Parameters & Basic UI
**Areas discussed:** Section naming & ordering, Number input UX, Price range validation display, Collapsed state indicators

---

## Section Naming & Ordering

| Option | Description | Selected |
|--------|-------------|----------|
| Keep "Advanced Options" | Matches the requirements doc (FORM-02) | |
| Rename to "Launch Parameters" | More specific — describes what's inside | ✓ |
| Rename to "Pool Settings" | Emphasizes that these affect the liquidity pool | |
| You decide | Let the agent choose | |

**User's choice:** Rename to "Launch Parameters"
**Notes:** User wanted a clearer, more descriptive name rather than the generic "Advanced Options" from requirements.

---

## Section Ordering

| Option | Description | Selected |
|--------|-------------|----------|
| Place Launch Parameters after Fee Schedule | Token info → Fee Schedule → Launch Parameters | |
| Place Launch Parameters after Socials | Token info → Fee Schedule → Socials → Launch Parameters | ✓ |
| Place Launch Parameters before Fee Schedule | Token info → Launch Parameters → Fee Schedule → Socials | |
| You decide | Let the agent choose | |

**User's choice:** Place Launch Parameters after Socials
**Notes:** User preferred Launch Parameters closer to the bottom, just before the "Custom CA" section.

---

## Existing Section Rename (Custom Private Key)

| Option | Description | Selected |
|--------|-------------|----------|
| Keep "Advanced Settings" as-is | Keeps current name but adds descriptive subtitle | |
| Rename to "Custom Key" or "Mint Key" | More specific — about key management | |
| Group both under one "Advanced" collapsible | Two sub-cards under a single umbrella | |
| You decide | Let the agent choose | |

**User's choice:** Rename to "Custom CA" — keep the same red warning styling.
**Notes:** User specified "Custom CA" and emphasized keeping the red warning border/highlighting.

---

## Number Input UX — Formatting

| Option | Description | Selected |
|--------|-------------|----------|
| Plain inputs — no special formatting | Raw number in input (1000000000, 0.00001) | |
| Show helper text with formatted default | Formatted text below field, input stays plain | |
| Format with commas/separators inline | Input shows commas while typing | ✓ |

**User's choice:** Format with commas/separators inline
**Notes:** User followed up with an important constraint: **use browser locale settings for formatting, do not hardcode commas**.

---

## Number Input UX — Supply vs Prices

| Option | Description | Selected |
|--------|-------------|----------|
| Only format supply with commas; keep prices plain | Supply gets formatting, prices don't | ✓ |
| Format both — prices show trailing zeros | Both get formatting | |
| You decide | Let the agent choose | |

**User's choice:** Only format supply with commas; keep prices plain
**Notes:** Prices are small decimals where commas don't help.

---

## Number Input UX — Helper Text

| Option | Description | Selected |
|--------|-------------|----------|
| Labels only, no helper text | Minimal — no extra text per field | |
| Add inline helper text under each input | Short sentence explaining each field | ✓ |
| One summary line at the top of the section | Brief labels with a section-level summary | |

**User's choice:** Add inline helper text under each input
**Notes:** User wants explanatory text for each Launch Parameters field.

---

## Price Range Validation Display — Error Style

| Option | Description | Selected |
|--------|-------------|----------|
| Per-field errors (e.g., Price range max) | Message under the specific field that violates the constraint | ✓ |
| Unified section-wide error banner | Single error at top of section | |
| Both per-field + section summary | Show both per-field and section-level | |

**User's choice:** Per-field errors
**Notes:** User preferred targeted feedback under each specific field.

---

## Price Range Validation Display — Trigger Timing

| Option | Description | Selected |
|--------|-------------|----------|
| Real-time (onChange) | Validate as user types | |
| On blur | When user leaves a field | ✓ |
| On submit only | Only validate on form submission | |

**User's choice:** On blur
**Notes:** User preferred balanced approach — not too noisy, catches mistakes quickly.

---

## Price Range Validation Display — Error Visual Style

| Option | Description | Selected |
|--------|-------------|----------|
| Standard red text error (same as other form errors) | Consistent with existing form error styling | ✓ |
| Auto-correct on blur | Swap values if reversed automatically | |
| Border highlight + error text | Visual border in addition to text | |

**User's choice:** Standard red text error (same as other form errors)
**Notes:** No special treatment — consistent with existing validation style.

---

## Collapsed State Indicators

| Option | Description | Selected |
|--------|-------------|----------|
| No indicators — keep header plain | Clean and minimal | |
| Show a "Modified" badge when values differ from defaults | Small chip when non-default values entered | ✓ |
| Show a compact summary of key values in the header | Inline summary of modified values | |

**User's choice:** Show a "Modified" badge when values differ from defaults
**Notes:** User wanted visual cue that Launch Parameters has been customized from defaults.

---

## the agent's Discretion

None — user made explicit choices for every question.

## Deferred Ideas

- **Fee scheduler mode selector** — belongs in Phase 3 (upgrading read-only badge to functional control)
- **Holdback slider** — belongs in Phase 3 (with red-flag warning at >10%)
- **Quote token dropdown** — belongs in Phase 3 (replacing hardcoded value)
- **Fee token mode selector** — belongs in Phase 3 (upgrading read-only state)
- **Launch confirmation modal** — belongs in Phase 3 (highlighting non-default selections)
