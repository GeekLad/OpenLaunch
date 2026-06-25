import { SOLANA_NETWORK } from "@/config/public";

/**
 * Time-windowed metric data from the Meteora DAMMv2 API.
 * Used for `fees`, `volume`, `protocol_fees`, and `fee_tvl_ratio` fields.
 * Each key is a rolling window; values are USD floats.
 */
export interface TimeWindowData {
  "30m": number;
  "1h": number;
  "2h": number;
  "4h": number;
  "12h": number;
  "24h": number;
}

/**
 * Per-token metrics from the Meteora DAMMv2 API.
 * Embedded in `MeteoraPoolMetrics.token_x` / `token_y`.
 */
export interface TokenMetrics {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  is_verified: boolean;
  holders: number;
  freeze_authority_disabled: boolean;
  total_supply: number;
  price: number;
  market_cap: number;
}

/**
 * Pool configuration from the Meteora DAMMv2 API.
 * `collect_fee_mode`: 0 = both tokens, 1 = quote token only (D-04).
 */
export interface PoolConfig {
  collect_fee_mode: number;
  base_fee_mode: number;
  base_fee_pct: number;
  protocol_fee_pct: number;
  partner_fee_pct: number;
  referral_fee_pct: number;
  dynamic_fee_initialized: boolean;
  pool_type: number;
  concentrated_liquidity: boolean;
  min_price: number;
  max_price: number;
  activation_type: number;
  activation_point: number;
}

/**
 * Pool metrics data from the Meteora DAMMv2 API.
 *
 * Verified against the live response of
 * `https://damm-v2.datapi.meteora.ag/pools/{address}` (D-10/D-11).
 *
 * The API returns this pool object directly on HTTP 200 (no `{status,error,data}`
 * wrapper). All monetary values (fees, volume, tvl, cumulative_metrics) are
 * USD floats (D-01). `cumulative_metrics` is present in live responses but not
 * in the OpenAPI `required` list — parse defensively with `?? 0` (Assumption A1).
 */
export interface MeteoraPoolMetrics {
  address: string;
  name: string;
  token_x: TokenMetrics;
  token_y: TokenMetrics;
  token_x_amount: number;
  token_y_amount: number;
  created_at: number;
  vault_x: string;
  vault_y: string;
  alpha_vault: string;
  pool_config: PoolConfig;
  tvl: number;
  current_price: number;
  has_farm: boolean;
  farm_apr: number;
  farm_apy: number;
  permanent_lock_liquidity: number;
  vested_liquidity: { months_3: number; months_6: number };
  volume: TimeWindowData;
  fees: TimeWindowData;
  protocol_fees: TimeWindowData;
  fee_tvl_ratio: TimeWindowData;
  cumulative_metrics: { volume: number; fees: number };
  is_blacklisted: boolean;
  launchpad: string | null;
  tags: string[];
}

/**
 * Get the Meteora DAMMv2 API base URL based on the configured Solana network.
 *
 * Mainnet: `https://damm-v2.datapi.meteora.ag` (D-12 — the previous mainnet URL 404s)
 * Devnet:  `https://damm-v2-api.dev.metdev.io` (D-12 — the previous devnet URL is dead)
 *
 * @returns The base URL for the current network (no trailing slash)
 */
function getMeteoraApiBaseUrl(): string {
  const network = SOLANA_NETWORK.toLowerCase();

  if (network === "devnet") {
    return "https://damm-v2-api.dev.metdev.io";
  }

  // Default to mainnet
  return "https://damm-v2.datapi.meteora.ag";
}

/**
 * Fetch pool metrics from the Meteora DAMMv2 API.
 *
 * Hits `GET {baseUrl}/pools/{poolAddress}` (no `/metrics` suffix — verified live
 * endpoint, D-11). The API returns the pool object directly on 200 (no wrapper),
 * `{message}` on error. Returns `null` on 404 or fetch failure.
 *
 * @param poolAddress - The pool address to fetch metrics for
 * @returns Pool metrics data, or `null` if the pool is not found / fetch fails
 */
export async function getPoolMetrics(
  poolAddress: string
): Promise<MeteoraPoolMetrics | null> {
  try {
    const baseUrl = getMeteoraApiBaseUrl();
    const url = `${baseUrl}/pools/${poolAddress}`;

    console.log(`[Meteora API] Fetching metrics for pool ${poolAddress} from ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // Prevent stale cached responses (D-20 / T-06-03)
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[Meteora API] Pool ${poolAddress} not found (404)`);
        return null;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // The real API returns the pool object directly (no {status,error,data} wrapper — D-11).
    const pool: MeteoraPoolMetrics = await response.json();

    console.log(
      `[Meteora API] ✓ Fetched metrics for ${poolAddress} | ` +
        `fees24h=${pool.fees["24h"]} ` +
        `cumulative=${pool.cumulative_metrics?.fees ?? 0} ` +
        `mode=${pool.pool_config.collect_fee_mode}`
    );

    return pool;
  } catch (error) {
    console.error(
      `[Meteora API] Error fetching pool metrics for ${poolAddress}:`,
      error
    );
    return null;
  }
}

/**
 * Fetch metrics for multiple pools in parallel.
 *
 * @param poolAddresses - Array of pool addresses
 * @returns Map of pool address to metrics (pools that failed/404'd are omitted)
 */
export async function getMultiplePoolMetrics(
  poolAddresses: string[]
): Promise<Map<string, MeteoraPoolMetrics>> {
  const results = new Map<string, MeteoraPoolMetrics>();

  // Fetch all pools in parallel
  const promises = poolAddresses.map(async (address) => {
    const metrics = await getPoolMetrics(address);
    if (metrics) {
      results.set(address, metrics);
    }
  });

  await Promise.all(promises);

  return results;
}