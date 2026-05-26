# Phase 05: Service Orchestration, Persistence & Detail Pages - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 05-service-orchestration-persistence-detail-pages
**Areas discussed:** Launch Flow Wiring & Orphan Prevention, Detail Page Layout & Parameter Display

---

## Area 1: Launch Flow Wiring & Orphan Prevention

| Option | Description | Selected |
|--------|-------------|----------|
| Discard everything | User starts over. No DB record. On-chain mint is orphaned but untracked. | |
| Save a partial record | Mint exists but pool creation failed. Token appears in "Incomplete Launches" list. | |
| Pause and offer retry | Show error + "Retry Pool Creation" button. Reuse existing mint. | ✓ |

**User's choice:** Retry on failure — reuse existing mint, retry same parameters

**Follow-up question:** Same parameters exactly vs allow editing before retry?
- **User's choice:** Same parameters exactly (one-click retry)

**Follow-up question:** Where does the retry button live?
- **User's choice:** Inline on the launch page (preserved in React state)

**Rationale:** Keeps user in control without polluting DB. On-chain mint exists but is invisible to the app until pool creation succeeds. If user abandons, the orphan is untracked (acceptable for v1).

---

## Area 2: Detail Page Layout & Parameter Display

| Option | Description | Selected |
|--------|-------------|----------|
| Full single-page view | All parameters visible at once in a single card, grouped by section headers | |
| Collapsible sections | Each parameter group in its own collapsible Card. Default: Token Info expanded, rest collapsed. | ✓ |
| Tabbed layout | Tabs: Overview, Pool Details, Fee Schedule, Holdback | |

**User's choice:** Collapsible sections grouped by category

**Follow-up question:** Holdback >10% warning display?
- **User's choice:** Red badge on section header: `⚠ High Holdback (25%)`

**Follow-up question:** Fee scheduler display format?
- **User's choice:** Human-readable labels with decay mode: "Market-Cap Based (Linear Decay)", "Time-Based (Exponential)", "Fixed Fee"

---

## Areas 3-4: Technical Decisions (User chose via quick selection)

**Area 3: Form-to-Service Parameter Threading**
- **Chosen:** `launchService.launchToken()` returns `TokenFormData` alongside `TokenLaunchConfig`
- Caller passes this to `POST /api/tokens/create`
- Rationale: Closes the loop from form → service → API → database

**Area 4: API Validation & Error Handling**
- **Chosen:** `/api/tokens/create` re-runs `validateLaunchParams` before DB persistence (belt-and-suspenders)
- Returns `400 Bad Request` with field-level errors if validation fails
- Rationale: API is a separate trust boundary; Phase 4 pre-flight validation runs client-side in the service layer

---

## the agent's Discretion

- No areas deferred to agent discretion in this discussion.

## Deferred Ideas

- Audit log table for launch attempts (including failures) — Phase 6 potential enhancement
- Token detail page edit capability — out of scope; tokens are immutable on-chain
- Comparative analysis (top 10% by fees) — requires Phase 6 cron data
- Social sharing cards — future marketing phase
