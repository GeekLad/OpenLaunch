import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

const fixture = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "../fixtures/meteora-pool-response.json"),
    "utf-8"
  )
);

// `@/config/public` exposes a `const` SOLANA_NETWORK baked at build time. The
// client uses it for the devnet/mainnet URL switch. We mock it here so we can
// flip the network per test without rebuilding.
vi.mock("@/config/public", () => ({
  SOLANA_NETWORK: "mainnet-beta",
}));

// We import the module dynamically so the config/public mock is registered
// before the client module evaluates its top-level `getMeteoraApiBaseUrl`.
const clientModule = await import("@/lib/meteora/client");
const { getPoolMetrics } = clientModule;

function buildOkResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
  } as Response;
}

function buildNotFoundResponse() {
  return {
    ok: false,
    status: 404,
    statusText: "Not Found",
    json: async () => ({ message: "not found" }),
  } as Response;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MeteoraPoolMetrics parsing (D-10/D-11)", () => {
  it("parses the live pool object directly into MeteoraPoolMetrics (no wrapper)", async () => {
    vi.mocked(fetch).mockResolvedValue(buildOkResponse(fixture) as never);

    const metrics = await getPoolMetrics(fixture.address);

    expect(metrics).not.toBeNull();
    expect(metrics?.cumulative_metrics.fees).toBe(277672.23);
    expect(metrics?.fees["24h"]).toBe(4.424238);
    expect(metrics?.pool_config.collect_fee_mode).toBe(1);
    expect(metrics?.farm_apr).toBe(45.2);
  });

  it("returns null on 404 (pool not found)", async () => {
    vi.mocked(fetch).mockResolvedValue(buildNotFoundResponse() as never);

    const metrics = await getPoolMetrics("SomeMissingPoolAddress");
    expect(metrics).toBeNull();
  });
});

describe("API base URL fix (D-12/D-13)", () => {
  it("returns the new mainnet base URL for mainnet-beta", async () => {
    // getMeteoraApiBaseUrl is module-private; observe its effect through fetch URL.
    vi.mocked(fetch).mockResolvedValue(buildOkResponse(fixture) as never);
    await getPoolMetrics(fixture.address);

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(calledUrl).toContain("damm-v2.datapi.meteora.ag");
  });

  it("returns the new devnet base URL for devnet", async () => {
    // Re-import with a mocked devnet network. We re-mock @/config/public and
    // bust the module cache so the client picks up the new value.
    vi.resetModules();
    vi.doMock("@/config/public", () => ({ SOLANA_NETWORK: "devnet" }));

    const { getPoolMetrics: devnetGetPoolMetrics } = await import(
      "@/lib/meteora/client"
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(buildOkResponse(fixture) as never));

    await devnetGetPoolMetrics(fixture.address);

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(calledUrl).toContain("damm-v2-api.dev.metdev.io");

    vi.doUnmock("@/config/public");
    vi.resetModules();
  });
});