# Phase 3: Advanced Parameters, Fee Modes & Complex Validation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 3-advanced-params-fee-modes-complex-validation
**Areas discussed:** Holdback Slider & Red-Flag Warning

---

## Holdback Slider & Red-Flag Warning

| Option | Description | Selected |
|--------|-------------|----------|
| Red text inline below slider | Similar to existing validation errors | |
| Red badge in card header | Badge on section header, visible when collapsed | |
| Warning banner inside section | Persistent callout/banner with icon when expanded | | ✓ |
| Tooltip only | Less intrusive hover tooltip | |

Since FORM-05 requires the warning to be visible even when collapsed, a follow-up question was asked:

**Collapsed visibility follow-up:**

| Option | Description | Selected |
|--------|-------------|----------|
| Red badge on section header | Badge stays on "Advanced Options" header even when collapsed | | ✓ |
| Only visible when expanded | Banner is only visible inside the expanded section | |
| Badge + full banner (both states) | Badge when collapsed, full banner when expanded | |
| Describe it differently | User's custom approach | |

**User's choice:** Warning banner inside section (when expanded) + red badge on section header (when collapsed)
**Notes:** User confirmed both the expanded banner and the collapsed badge are needed to satisfy FORM-05. Badge text should be brief (e.g., "⚠ High Holdback") and always visible without expanding.

---

## the agent's Discretion

- Fee scheduler dynamic fields: User deferred to Phase 2 pattern (always rendered + CSS hidden) — no discussion needed.
- Quote token decimals: User deferred to Phase 4 (on-chain integration) — frontend shows raw values.
- Launch confirmation modal: User deferred to simple key-value list grouped by section.

## Deferred Ideas

None from this session — all scope items are within Phase 3 per ROADMAP.md.
