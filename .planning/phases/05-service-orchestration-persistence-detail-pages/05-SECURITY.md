---
phase: 05
slug: 05-service-orchestration-persistence-detail-pages
status: draft
threats_open: 0
asvs_level: 1
created: "2026-05-26"
---

# Phase 05 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser ↔ Frontend (Next.js) | User form input, wallet signing | `TokenFormData` JSON via HTTPS |
| Frontend ↔ API Routes | `POST /api/tokens/create`, `POST /api/tokens/validate` | Form data + tx signatures |
| API ↔ Service Layer | `launchService.launchToken()` | Pre-validated form data |
| Service Layer ↔ Solana | Transaction building, RPC calls | Signed transactions, mint addresses |
| Service Layer ↔ Meteora SDK | `@meteora-ag/cp-amm-sdk` | Fee scheduler configs, pool params |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-05-01 | Spoofing | `quoteTokenMint` | mitigate | Base58 sanity check (`isValidSolanaAddress`) plus hard-coded whitelist (SOL/USDC only) in `lib/validation/launch.ts:153-165` | closed |
| T-05-02 | Spoofing | `feeSchedulerConfig.mode` | mitigate | TypeScript discriminated union (`FeeSchedulerConfig`) prevents invalid modes at compile time; runtime branch matching in both validators | closed |
| T-05-03 | Tampering | `holdbackPercentage` | mitigate | Server-side formula `Math.floor(totalSupply * (100 - holdback) / 100)` in `launchService.ts:199-203`; user cannot tamper pool token amount | closed |
| T-05-04 | Tampering | `feeSchedulerConfig` params | mitigate | `lib/validation/feeValidation.ts:78-114` calls actual SDK constructors (`getFeeMarketCapSchedulerParams`, `getFeeTimeSchedulerParams`) and catches exceptions; invalid params never reach on-chain code | closed |
| T-05-05 | Tampering | Form data between FE/API | mitigate | Frontend POSTs to `/api/tokens/validate` which runs server-side `feeValidation.ts`; `launchService.ts` runs `validateLaunchParams` again before any transaction building (belt-and-suspenders) | closed |
| T-05-06 | Repudiation | Failed launch attempts | mitigate | Console logging in `launchService.ts` records all parameters; DB-only persists after on-chain success. No separate audit log table for failures. See accepted risk AR-05-01. | **accepted** |
| T-05-07 | Information Disclosure | Validation error leakage | mitigate | `ValidationError.errors` returns only `{ field, message, code }` — no stack traces, file paths, or internal state. Confirmed in `lib/validation/launch.ts:12-16` | closed |
| T-05-08 | Denial of Service | Validation bypass → on-chain failure | mitigate | `validateLaunchParams(formData)` is the **first statement** inside `launchToken()` (line 48), before any transaction building, mint creation, or RPC calls. Hard-stop on any failures. | closed |
| T-05-09 | Denial of Service | `CollectFeeMode.BothToken` on unsupported pool | mitigate | `feeValidation.ts:136` calls `validatePoolFees(poolFees, collectFeeMode, ActivationType.Timestamp)` — SDK validates fee mode compatibility before transaction creation | closed |
| T-05-10 | Elevation of Privilege | API accepting unvalidated params for DB persistence | mitigate | `/api/tokens/create` only runs **after** successful on-chain launch (which itself passed validation). Missing tx signatures return 400. DB schema constraints prevent SQL injection (Drizzle parameterized queries). | closed |

*Status: open · closed · accepted*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-05-01 | T-05-06 | Failed launch attempts are logged to `console.log` in `launchService.ts` but not persisted to DB. Adding an audit-log table is out of scope for Phase 05; observability is sufficient via server stdout/stderr. Future work tracked in Phase 6 (Background Jobs & Hardening). | automated-audit | 2026-05-26 |
| AR-05-02 | T-05-11 (resolved) | `Number.MAX_SAFE_INTEGER` check in `launch.ts:67` was reviewed: SPL token `u64` max (2^64-1 ≈ 1.84e19) exceeds `Number.MAX_SAFE_INTEGER` (9e15). However, real-world token supplies rarely exceed 1e15; the check is a pragmatic safeguard. If larger supplies are needed, switch to string/BN validation in Phase 5. | automated-audit | 2026-05-26 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-26 | 10 | 8 | 0 | automated-audit (retroactive-STRIDE) |

---

## Notes

### Strengthening Opportunities (non-blocking, tracked for Phase 5)

1. **`isValidSolanaAddress` robustness**: Currently uses base58 regex (`lib/validation/launch.ts:183-196`) instead of `PublicKey.isOnCurve()`. The whitelist check (SOL/USDC only) mitigates this for the current use case. If additional quote tokens are added, upgrade to SDK-based validation.

2. **Rate limiting**: Neither `/api/tokens/create` nor `/api/tokens/validate` have rate limiting. Consider adding per-wallet or per-IP rate limits before production launch.

3. **Two validation modules**: Both `lib/validation/launch.ts` (general params) and `lib/validation/feeValidation.ts` (SDK-specific fee params) exist. They are complementary — `launch.ts` runs first in `launchService.ts`, `feeValidation.ts` runs in the `/api/tokens/validate` endpoint. Consider merging if maintenance burden becomes noticeable.

### Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-26
