/**
 * Price service for fetching token prices from external APIs
 * Currently supports SOL price from CoinGecko API
 */

interface CoinGeckoPriceResponse {
  [key: string]: {
    usd: number;
  };
}

/**
 * Cache for SOL price to avoid excessive API calls
 */
let solPriceCache: {
  price: number;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

/**
 * Fetches SOL price from CoinGecko API
 * @returns SOL price in USD or null if failed
 */
export async function getSolPrice(): Promise<number | null> {
  // Check cache first
  if (solPriceCache && Date.now() - solPriceCache.timestamp < CACHE_DURATION) {
    return solPriceCache.price;
  }

  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: CoinGeckoPriceResponse = await response.json();
    
    if (!data?.solana?.usd) {
      throw new Error('Invalid response format from CoinGecko API');
    }

    const solPrice = data.solana.usd;
    
    // Update cache
    solPriceCache = {
      price: solPrice,
      timestamp: Date.now(),
    };

    console.log(`[Price Service] ✓ SOL price updated: $${solPrice.toFixed(4)}`);
    return solPrice;
  } catch (error) {
    console.error('[Price Service] Error fetching SOL price:', error);
    
    // Return cached price if available, even if expired
    if (solPriceCache) {
      console.log('[Price Service] Using cached SOL price as fallback');
      return solPriceCache.price;
    }
    
    return null;
  }
}

/**
 * Gets the current SOL price, with fallback to a default value
 * @returns SOL price in USD
 */
export async function getSolPriceWithFallback(): Promise<number> {
  const price = await getSolPrice();
  return price || 100; // Fallback to $100 if API fails
}

/**
 * Clears the SOL price cache (useful for testing or force refresh)
 */
export function clearSolPriceCache(): void {
  solPriceCache = null;
}