/**
 * Price service for fetching SOL/USD price from the Jupiter Price API.
 *
 * The Jupiter API key is held server-side (config/secrets.ts) and is only
 * ever used here, which runs exclusively on the Next.js server (API routes
 * and the cron fee-updater). It is never imported by client code.
 */

import { JUPITER_API_KEY } from "@/config/secrets";
import { QUOTE_TOKEN_MINT } from "@/config/public";

/**
 * Response shape from `GET https://api.jup.ag/price/v3?ids=<mint>`.
 * The response object is keyed directly by the requested mint address.
 */
interface JupiterPriceResponse {
  [mint: string]: {
    usdPrice?: number;
    [key: string]: unknown;
  };
}

/**
 * Cache for SOL price to avoid excessive API calls.
 */
let solPriceCache: {
  price: number;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

/**
 * Fetches SOL price in USD from the Jupiter Price API (price/v3).
 *
 * @returns SOL price in USD, or null if the fetch/parse failed and no
 *          cached value is available.
 */
export async function getSolPrice(): Promise<number | null> {
  // Check cache first
  if (solPriceCache && Date.now() - solPriceCache.timestamp < CACHE_DURATION) {
    return solPriceCache.price;
  }

  try {
    const url = `https://api.jup.ag/price/v3?ids=${QUOTE_TOKEN_MINT}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(JUPITER_API_KEY ? { "x-api-key": JUPITER_API_KEY } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as JupiterPriceResponse;

    const entry = data?.[QUOTE_TOKEN_MINT];
    if (!entry || typeof entry.usdPrice !== "number") {
      throw new Error("Invalid response format from Jupiter Price API");
    }

    const solPrice = entry.usdPrice;

    // Update cache
    solPriceCache = {
      price: solPrice,
      timestamp: Date.now(),
    };

    console.log(`[Price Service] ✓ SOL price updated: $${solPrice.toFixed(4)}`);
    return solPrice;
  } catch (error) {
    console.error("[Price Service] Error fetching SOL price:", error);

    // Return cached price if available, even if expired
    if (solPriceCache) {
      console.log("[Price Service] Using cached SOL price as fallback");
      return solPriceCache.price;
    }

    return null;
  }
}

/**
 * Gets the current SOL price, with fallback to a default value.
 * @returns SOL price in USD
 */
export async function getSolPriceWithFallback(): Promise<number> {
  const price = await getSolPrice();
  return price || 100; // Fallback to $100 if API fails
}

/**
 * Clears the SOL price cache (useful for testing or force refresh).
 */
export function clearSolPriceCache(): void {
  solPriceCache = null;
}