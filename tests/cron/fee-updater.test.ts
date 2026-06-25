import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

// Capture the source text once for the `* 1e9` regression guard (PASSES only
// after Wave 2 removes the literal; RED now because it is still present).
const CRON_SOURCE_PATH = path.resolve(__dirname, "../../lib/cron/fee-updater.ts");
const cronSource = fs.readFileSync(CRON_SOURCE_PATH, "utf-8");

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Fixture matching the verified live Meteora API response shape.
const quoteOnlyFixture = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "../fixtures/meteora-pool-response.json"),
    "utf-8"
  )
);

const bothModeFixture = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "../fixtures/meteora-pool-response-both-mode.json"),
    "utf-8"
  )
);

// Mock the meteora client so no network calls occur.
vi.mock("@/lib/meteora/client", () => ({
  getPoolMetrics: vi.fn(),
}));

// Mock db service as a namespace so `dbService.updateCumulativeFeesSnapshot` etc.
// are spies. `markPoolStale` does not exist yet in production (Wave 1 adds it),
// but we register the spy now so the circuit-breaker test can assert it is NOT
// called when below threshold and IS called at/above threshold.
vi.mock("@/lib/db/service", () => ({
  getPoolsDueForUpdate: vi.fn(),
  getTokenById: vi.fn(),
  updateCumulativeFeesSnapshot: vi.fn(),
  createPoolStatsSnapshot: vi.fn(),
  upsertFeeUpdateSchedule: vi.fn(),
  recordUpdateFailure: vi.fn(),
  getFeeUpdateSchedule: vi.fn(),
  markPoolStale: vi.fn(),
}));

// Mock polling strategy so the cron's `calculateNextUpdateTime` is a no-op.
vi.mock("@/lib/meteora/polling-strategy", () => ({
  calculateNextUpdateTime: vi.fn(() => ({
    nextUpdate: new Date(Date.now() + 60_000),
    intervalMinutes: 5,
  })),
}));

// Late imports (after mocks are registered).
const { updateTokenFees } = await import("@/lib/cron/fee-updater");
const { getPoolMetrics } = await import("@/lib/meteora/client");
import * as dbService from "@/lib/db/service";
import type { Token } from "@/lib/db/schema/tokens";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeToken(overrides: Partial<Token> = {}): Token {
  return {
    id: 1,
    mintAddress: "MintAddress11111111111111111111111111111111111",
    poolAddress: quoteOnlyFixture.address,
    featured: false,
    name: "Test Token",
    symbol: "TEST",
    description: "test",
    logoUrl: "/logo.png",
    metadataUri: null,
    decimals: 9,
    totalSupply: "1000000000",
    initialMarketCap: 1000,
    quoteTokenMint: "So11111111111111111111111111111111111111112",
    poolLiquidityPercentage: 1.0,
    marketCapRangeMax: 100000,
    feeDecayDurationMinutes: 0,
    feeDecayPeriods: 0,
    feeSchedulerMode: "market-cap-based",
    feeTokenMode: "quoteOnly",
    startingMarketCap: "1000",
    endingMarketCap: "10000",
    startRatePercent: 50,
    endRatePercent: 2,
    durationMinutes: 0,
    fixedBaseFeePercent: 2,
    lockedLiquidityPercentage: 100,
    launchDate: new Date(Date.now() - 3600_000),
    launchSlot: 123,
    createdAt: new Date(),
    updatedAt: new Date(),
    mintTxSignature: "sig",
    metadataTxSignature: "sig",
    poolTxSignature: "sig",
    creatorWallet: "Creator1111111111111111111111111111111111111",
    cumulativeFeesSnapshot: "0",
    cumulativeFeesUpdatedAt: null,
    searchText: "test",
    ...overrides,
  } as Token;
}

function makeSchedule(tokenId = 1, id = 1) {
  return {
    id,
    tokenId,
    poolAddress: quoteOnlyFixture.address,
    lastUpdated: new Date(),
    nextUpdate: new Date(Date.now() - 60_000),
    updateIntervalMinutes: 5,
    consecutiveFailures: 0,
    lastError: null,
    lastErrorAt: null,
    // stale column does not exist on the production type yet (Wave 0 schema
    // adds it); we include it here for test compatibility.
    stale: false,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(dbService.getPoolsDueForUpdate).mockResolvedValue([makeSchedule()]);
  vi.mocked(dbService.getTokenById).mockResolvedValue(makeToken());
  vi.mocked(dbService.updateCumulativeFeesSnapshot).mockResolvedValue(undefined);
  vi.mocked(dbService.createPoolStatsSnapshot).mockResolvedValue({} as never);
  vi.mocked(dbService.upsertFeeUpdateSchedule).mockResolvedValue({} as never);
  vi.mocked(dbService.recordUpdateFailure).mockResolvedValue(undefined);
  vi.mocked(dbService.getFeeUpdateSchedule).mockResolvedValue(null);
  vi.mocked(dbService.markPoolStale).mockResolvedValue(undefined);
  vi.mocked(getPoolMetrics).mockResolvedValue(quoteOnlyFixture as never);
});

// ---------------------------------------------------------------------------
// Tests — these are intentionally RED until Waves 1-2 fix the cron logic.
// ---------------------------------------------------------------------------

describe("CRON-02: USD microunits conversion", () => {
  it("converts cumulative_metrics.fees to USD microunits (277672.23 -> 277672230000)", async () => {
    await updateTokenFees();

    expect(dbService.updateCumulativeFeesSnapshot).toHaveBeenCalledWith(
      expect.any(String),
      "277672230000"
    );
  });

  it("converts fees.24h to USD microunits (4.424238 -> 4424238)", async () => {
    await updateTokenFees();

    expect(dbService.createPoolStatsSnapshot).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(String),
      expect.objectContaining({
        fees24h: "4424238",
      })
    );
  });

  it("does not multiply by 1e9 anywhere in the cron source (regression guard)", () => {
    // This is RED now because the current buggy cron contains `* 1e9` literals.
    // Wave 2 removes them, at which point this assertion PASSES.
    expect(cronSource).not.toContain("* 1e9");
  });
});

describe("CRON-01: reads fee token mode from DB", () => {
  it("logs a deferred-per-side warning for bothTokens mode", async () => {
    vi.mocked(dbService.getTokenById).mockResolvedValue(
      makeToken({ feeTokenMode: "bothTokens" })
    );
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await updateTokenFees();

    const bothWarning = logSpy.mock.calls.some((call) =>
      String(call[0]).includes("both-token") ||
      (typeof call[0] === "string" && call[0].includes("deferred"))
    );
    expect(bothWarning).toBe(true);
    logSpy.mockRestore();
  });

  it("does not emit a both-token warning for quoteOnly mode", async () => {
    vi.mocked(dbService.getTokenById).mockResolvedValue(
      makeToken({ feeTokenMode: "quoteOnly" })
    );
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await updateTokenFees();

    const bothWarning = logSpy.mock.calls.some((call) =>
      String(call[0]).includes("both-token")
    );
    expect(bothWarning).toBe(false);
    logSpy.mockRestore();
  });
});

describe("CRON-03: both-token mode tracked identically to quote-only", () => {
  it("stores identical USD microunits for both-token and quote-only fixtures", async () => {
    // Quote-only fixture (collect_fee_mode = 1)
    vi.mocked(getPoolMetrics).mockResolvedValue(quoteOnlyFixture as never);
    await updateTokenFees();
    const quoteCall = vi.mocked(dbService.updateCumulativeFeesSnapshot).mock
      .calls[0];

    vi.clearAllMocks();
    vi.mocked(dbService.getPoolsDueForUpdate).mockResolvedValue([makeSchedule()]);
    vi.mocked(dbService.getTokenById).mockResolvedValue(
      makeToken({ feeTokenMode: "bothTokens" })
    );
    vi.mocked(dbService.updateCumulativeFeesSnapshot).mockResolvedValue(undefined);
    vi.mocked(dbService.createPoolStatsSnapshot).mockResolvedValue({} as never);
    vi.mocked(dbService.upsertFeeUpdateSchedule).mockResolvedValue({} as never);

    // Both-token fixture (collect_fee_mode = 0) — same cumulative fees value
    vi.mocked(getPoolMetrics).mockResolvedValue(bothModeFixture as never);
    await updateTokenFees();
    const bothCall = vi.mocked(dbService.updateCumulativeFeesSnapshot).mock
      .calls[0];

    expect(bothCall).toEqual(quoteCall);
  });
});

describe("Circuit breaker (D-14/D-17)", () => {
  it("marks the pool stale when consecutiveFailures reaches 10", async () => {
    vi.mocked(getPoolMetrics).mockResolvedValue(null as never);
    vi.mocked(dbService.getFeeUpdateSchedule).mockResolvedValue({
      ...makeSchedule(),
      consecutiveFailures: 10,
      stale: false,
    } as never);

    await updateTokenFees();

    expect(dbService.markPoolStale).toHaveBeenCalledWith(1);
  });

  it("does not mark the pool stale when consecutiveFailures is 9", async () => {
    vi.mocked(getPoolMetrics).mockResolvedValue(null as never);
    vi.mocked(dbService.getFeeUpdateSchedule).mockResolvedValue({
      ...makeSchedule(),
      consecutiveFailures: 9,
      stale: false,
    } as never);

    await updateTokenFees();

    expect(dbService.markPoolStale).not.toHaveBeenCalled();
  });
});