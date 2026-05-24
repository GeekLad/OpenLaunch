import { SOLANA_NETWORK } from "@/config/public";

/**
 * Pool metrics data from Meteora DAMMv2 API
 */
export interface MeteoraPoolMetrics {
  pool_address: string;
  volume24h: number;
  volume7d: number;
  volume30d: number;
  lp_fee24h: number;
  lp_fee7d: number;
  lp_fee30d: number;
  protocol_fee24h: number;
  protocol_fee7d: number;
  protocol_fee30d: number;
  partner_fee24h: number;
  partner_fee7d: number;
  partner_fee30d: number;
  referral_fee24h: number;
  referral_fee7d: number;
  referral_fee30d: number;
  tvl: number; // Total Value Locked
  apr: number;
  fee_tvl_ratio: number;
  updated_at: number; // Unix timestamp
}

/**
 * API response wrapper from Meteora
 */
interface MeteoraApiResponse {
  status: number;
  error: {
    message: string;
    type: string;
  } | null;
  data: MeteoraPoolMetrics | null;
}

/**
 * Get the Meteora API base URL based on network
 */
function getMeteoraApiBaseUrl(): string {
  const network = SOLANA_NETWORK.toLowerCase();

  if (network === "devnet") {
    return "https://dammv2-api.devnet.meteora.ag";
  }

  // Default to mainnet
  return "https://dammv2-api.meteora.ag";
}

/**
 * Fetch pool metrics from Meteora DAMMv2 API
 * @param poolAddress - The pool address to fetch metrics for
 * @returns Pool metrics data
 */
export async function getPoolMetrics(poolAddress: string): Promise<MeteoraPoolMetrics | null> {
  try {
    const baseUrl = getMeteoraApiBaseUrl();
    const url = `${baseUrl}/pools/${poolAddress}/metrics`;

    console.log(`[Meteora API] Fetching metrics for pool ${poolAddress} from ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // Add cache control to prevent stale data
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[Meteora API] Pool ${poolAddress} not found (404)`);
        return null;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const apiResponse: MeteoraApiResponse = await response.json();

    // Check for errors in the response
    if (apiResponse.error || !apiResponse.data) {
      console.warn(
        `[Meteora API] Error in response for pool ${poolAddress}:`,
        apiResponse.error?.message || "No data returned"
      );
      return null;
    }

    console.log(`[Meteora API] ✓ Successfully fetched metrics for pool ${poolAddress}`);
    console.log(`[Meteora API] LP Fee 24h: ${apiResponse.data.lp_fee24h}, TVL: ${apiResponse.data.tvl}`);

    return apiResponse.data;
  } catch (error) {
    console.error(`[Meteora API] Error fetching pool metrics for ${poolAddress}:`, error);
    return null;
  }
}

/**
 * Fetch metrics for multiple pools
 * @param poolAddresses - Array of pool addresses
 * @returns Map of pool address to metrics
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
