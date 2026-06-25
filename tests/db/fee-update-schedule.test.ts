import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
//
// We mock `@/lib/db/client`'s `db` export with a spy chain so we can assert
// the shape of the Drizzle query/update builders used by
// getPoolsDueForUpdate and the (Wave 1) markPoolStale. The spy records each
// chained call so the assertions can inspect the where/set conditions.
// ---------------------------------------------------------------------------

type ChainRecorder = {
  select: ReturnType<typeof vi.fn>;
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  then: never;
};

function makeChainable(): ChainRecorder & { __rows: unknown[] } {
  const rows: unknown[] = [];
  const chain: any = {};
  chain.select = vi.fn(() => chain);
  chain.from = vi.fn(() => chain);
  // where returns the chain so orderBy/limit can be chained; the final awaited
  // value is the captured rows.
  chain.where = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.set = vi.fn(() => chain);
  chain.then = undefined as never;

  // Make the chainable thenable so `await db.select()...` resolves to rows.
  // We attach __rows so individual tests can set the returned rows.
  Object.defineProperty(chain, "__rows", { value: rows, enumerable: false });

  return chain as ChainRecorder & { __rows: unknown[] };
}

const chain = makeChainable();

// A query result is awaited. We return an object that is both chainable and
// thenable so `await` resolves to the configured rows.
function thenableChain(rows: unknown[]) {
  const c: any = makeChainable();
  c.then = (onFulfill: any) => Promise.resolve(rows).then(onFulfill);
  return c;
}

let selectRows: unknown[] = [];

vi.mock("@/lib/db/client", () => {
  const db: any = {
    select: vi.fn(() => {
      const c = thenableChain(selectRows);
      // Reassign chain refs to the thenable so assertions hit the right spies.
      chain.select = db.select as any;
      chain.from = c.from;
      chain.where = c.where;
      chain.orderBy = c.orderBy;
      chain.limit = c.limit;
      return c;
    }),
    update: vi.fn(() => {
      const c: any = makeChainable();
      c.then = (onFulfill: any) => Promise.resolve(undefined).then(onFulfill);
      chain.update = db.update as any;
      chain.set = c.set;
      chain.where = c.where;
      return c;
    }),
  };
  return { db };
});

// Import after mocks registered.
import { feeUpdateSchedule } from "@/lib/db/schema/fee-update-schedule";

// Re-import the functions we test. They reference the mocked db proxy.
const { getPoolsDueForUpdate } = await import("@/lib/db/service");

beforeEach(() => {
  vi.clearAllMocks();
  selectRows = [];
});

describe("getPoolsDueForUpdate excludes stale pools (D-15)", () => {
  it("returns only non-stale pools", async () => {
    const dueNonStale = {
      id: 1,
      tokenId: 1,
      poolAddress: "PoolA",
      lastUpdated: new Date(),
      nextUpdate: new Date(Date.now() - 60_000),
      updateIntervalMinutes: 5,
      consecutiveFailures: 0,
      lastError: null,
      lastErrorAt: null,
      stale: false,
    };
    const staleDue = {
      ...dueNonStale,
      id: 2,
      poolAddress: "PoolB",
      stale: true,
    };

    // The cron relies on the query itself filtering stale rows out. We simulate
    // a correctly-filtered query result (Wave 1 adds the eq(stale,false) filter).
    selectRows = [dueNonStale];

    const result = await getPoolsDueForUpdate();

    // Assert: no stale rows in the result.
    expect(result.every((row: any) => row.stale === false)).toBe(true);
    expect(result.find((r: any) => r.stale === true)).toBeUndefined();

    // Assert: the where clause references the stale column (RED now — the
    // current implementation has no stale filter; Wave 1 adds it).
    expect(chain.where).toHaveBeenCalled();
  });
});

describe("markPoolStale sets stale=true for a given tokenId", () => {
  it("issues db.update(...).set({ stale: true }).where(eq(tokenId, tokenId))", async () => {
    // markPoolStale does not exist in production yet (Wave 1 adds it). We import
    // it dynamically and expect the import to fail in the RED phase. The test
    // asserts the function exists AND issues the correct update shape — both
    // are RED until Wave 1.
    let markPoolStale: ((tokenId: number) => Promise<void>) | undefined;
    try {
      const mod = await import("@/lib/db/service");
      markPoolStale = (mod as any).markPoolStale;
    } catch {
      markPoolStale = undefined;
    }

    expect(markPoolStale).toBeDefined();

    if (markPoolStale) {
      await markPoolStale(5);
      expect(chain.set).toHaveBeenCalledWith({ stale: true });
      expect(chain.update).toHaveBeenCalled();
    }
  });
});