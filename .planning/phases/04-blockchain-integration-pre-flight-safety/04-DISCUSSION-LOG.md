# Phase 4: Blockchain Integration & Pre-flight Safety - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 4-Blockchain Integration & Pre-flight Safety
**Areas discussed:** Holdback supply split, Quote token decimal math, Fee scheduler SDK mapping, Pre-flight simulation strategy

---

## Holdback Supply Split

| Option | Description | Selected |
|--------|-------------|----------|
| Creator keeps holdback % | The 10% stays in the creator's wallet, 90% goes to the pool. Intuitive meaning of 'holdback'. | ✓ |
| Pool gets holdback % | The 10% goes to the pool, 90% stays in the creator's wallet. Matches current (buggy) code. | |

**User's choice:** Creator keeps holdback %
**Notes:** The current code computes `poolTokenAmount = totalSupply * holdback / 100`, which is backwards. The correct math is `poolTokenAmount = totalSupply * (100 - holdback) / 100`.

---

### Holdback Distribution Method

| Option | Description | Selected |
|--------|-------------|----------|
| Mint all, pool takes its share | Total supply minted to creator. Pool creation tx transfers pool portion from creator to pool vault. | ✓ |
| Split mint between wallet and pool | Two mint-to instructions: one to creator wallet (holdback amount), one to pool vault (pool amount). | |

**User's choice:** Mint all, pool takes its share
**Notes:** Simpler implementation. One mint, one pool tx. The pool creation transaction deposits the pool's share from the creator's wallet.

---

### Holdback Destination Wallet

| Option | Description | Selected |
|--------|-------------|----------|
| Connected wallet only | Holdback tokens always go to the creator's connected wallet. Simple and predictable. | ✓ |
| Custom holdback wallet | Allow specifying a separate wallet address for holdback tokens (e.g., treasury wallet). | |

**User's choice:** Connected wallet only
**Notes:** No custom wallet address field. Holdback always goes to the connected wallet.

---

## Quote Token Decimal Math

| Option | Description | Selected |
|--------|-------------|----------|
| Keep displayed price unchanged | Displayed price stays the same (e.g., 0.00001). Backend scales decimals. | |
| Auto-rescale price on switch | Price inputs auto-rescale to equivalent value in new token terms. | ✓ |

**User's choice:** Auto-rescale price on switch
**Notes:** When user switches from SOL to USDC, the displayed price values rescale automatically.

---

### Exchange Rate Source

| Option | Description | Selected |
|--------|-------------|----------|
| Real-time SOL/USDC rate | Fetched at form load. Accurate but may drift. | |
| Hardcoded approximate rate | Config constant (e.g., 1 SOL = $140 USDC). Simpler, no fetch. | ✓ |
| No auto-rescale, show in token terms | Show raw value unchanged with helper text. | |

**User's choice:** Hardcoded approximate rate
**Notes:** A config constant `SOL_USDC_RATE` in `config/defaults.ts` (default: ~140). Updated by redeploying.

---

### Rate Update Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Config constant (redeploy to update) | Static constant in `config/defaults.ts`. | ✓ |
| Fetch first, fallback to hardcoded | Use existing `priceService` SOL/USD fetcher, fallback to hardcoded. | |
| Manual conversion only | User inputs prices in new token's terms. Only convert if explicitly requested. | |

**User's choice:** Config constant (redeploy to update)
**Notes:** Simplest approach for v1. No network dependency.

---

### Decimal Scaling Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Backend auto-scales decimals | Price math auto-scales by decimal difference (9 vs 6). Pool creation passes scaled value. | ✓ |
| User inputs smallest units | User inputs prices in lamports/micro-USDC. Confusing for users. | |

**User's choice:** Backend auto-scales decimals
**Notes:** `priceToSqrtPrice` and `sqrtPriceToPrice` already handle arbitrary decimals. The fix is to pass the correct `tokenBDecimals` instead of hardcoding 9.

---

## Fee Scheduler SDK Mapping

| Option | Description | Selected |
|--------|-------------|----------|
| Fee rates directly, market cap display-only | Start/end fee rates control fee scaling. Market cap inputs are display-only. | |
| Market cap drives fee boundaries | Market cap values determine fee schedule boundaries. SDK interpolates. | ✓ |

**User's choice:** Market cap drives fee boundaries
**Notes:** When market cap reaches `startingMarketCap`, fees are at `startRate`. When it reaches `endingMarketCap`, fees are at `endRate`.

---

### priceMultiple Derivation

| Option | Description | Selected |
|--------|-------------|----------|
| Derive priceMultiple from market cap ratio | `(endingMarketCap / startingMarketCap)^(1/numberOfPeriod)`. User's market cap values directly determine step size. | ✓ |
| Use fixed priceMultiple default | Ignore market cap ratio, use fixed default (e.g., 2.0 per step). Market cap values become display-only. | |

**User's choice:** Derive priceMultiple from market cap ratio
**Notes:** Connects user's market cap inputs directly to SDK behavior.

---

### Market-Cap Decay Modes

| Option | Description | Selected |
|--------|-------------|----------|
| Exponential only | Only Exponential decay supported. Simpler UI. | |
| Linear + Exponential | Allow user to choose between Linear and Exponential decay within Market-Cap mode. | ✓ |

**User's choice:** Linear + Exponential
**Notes:** Matches SDK capability. UI adds a sub-selector for decay mode within market-cap mode (default: Exponential).

---

## Pre-flight Simulation Strategy

### Simulation Timing

| Option | Description | Selected |
|--------|-------------|----------|
| Simulate before signing prompt | Build pool tx and call `connection.simulateTransaction()` before asking user to sign. Strongest safety. | |
| Use Solana preflight only | Rely on RPC's built-in preflight after user signs. Simpler but weaker. | |

**User's choice:** Simulate before signing prompt (initially)
**Notes:** User initially wanted pre-flight simulation. After technical discussion, this was revised because the pool tx references a not-yet-created mint account.

---

### Simulation Failure Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Hard stop, return to form | Simulation failure is a hard stop. Show error, return to form. | ✓ |
| Skip pool, create token only | Skip pool creation but still create mint and metadata. Token exists but no pool. | |

**User's choice:** Hard stop, return to form
**Notes:** No partial transactions. If anything fails, nothing is submitted.

---

### Transactions to Simulate

| Option | Description | Selected |
|--------|-------------|----------|
| Pool tx only | Only simulate pool tx (most complex). | |
| All 3 transactions | Simulate all 3 sequentially before signing. Maximum safety. | ✓ |

**User's choice:** All 3 transactions (initially)
**Notes:** User initially wanted all 3. After technical discussion, this was revised to skip simulation entirely for the pool tx.

---

### Revised Approach (Technical Constraint)

| Option | Description | Selected |
|--------|-------------|----------|
| Simulate first 2 txs only | Tx 1 (mint) and Tx 2 (metadata) can be simulated. Tx 3 (pool) cannot due to missing mint account. | |
| Skip simulation, strengthen validation | Do not simulate. Strengthen server-side parameter validation to catch errors before tx building. | ✓ |
| Simulate after signing | Simulate signed transactions together. Still won't find not-yet-created mint account. | |

**User's choice:** Skip simulation, strengthen validation
**Notes:** The pool tx references the mint account created in Tx 1, which does not exist on-chain yet. Solana simulation requires accounts to exist. Therefore, pre-flight simulation is skipped for the pool tx. Server-side validation (VALID-02) is strengthened instead.

---

## the agent's Discretion

- No areas deferred to agent discretion in this discussion.

## Deferred Ideas

- **Dynamic SOL/USDC rate fetching**: User chose hardcoded config constant for v1. Dynamic fetching from CoinGecko could be a future phase.
- **Custom holdback wallet**: Support for a separate treasury/team wallet could be a future phase feature.
- **Pre-flight simulation with account creation stubs**: Advanced technique where simulation creates stub accounts first. Too complex for v1.
- **Vesting/locking for holdback tokens**: v2 requirement (LAUN-11).
