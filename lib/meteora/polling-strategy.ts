import {
  FEE_UPDATE_INTERVAL_0_1H,
  FEE_UPDATE_INTERVAL_1_24H,
  FEE_UPDATE_INTERVAL_1_4D,
  FEE_UPDATE_INTERVAL_4D_PLUS,
} from "@/config/public";

/**
 * Polling interval configuration based on token age
 */
export interface PollingInterval {
  intervalMinutes: number;
  nextUpdate: Date;
}

/**
 * Calculate the next update time based on token age
 * Uses age-based polling strategy:
 * - 0-1 hour: Every 1 minute (configurable via FEE_UPDATE_INTERVAL_0_1H)
 * - 1-24 hours: Every 5 minutes (configurable via FEE_UPDATE_INTERVAL_1_24H)
 * - 24-96 hours: Every 10 minutes (configurable via FEE_UPDATE_INTERVAL_1_4D)
 * - 96+ hours: Every 60 minutes (configurable via FEE_UPDATE_INTERVAL_4D_PLUS)
 *
 * @param launchDate - The token's launch date
 * @returns Polling interval configuration
 */
export function calculateNextUpdateTime(launchDate: Date): PollingInterval {
  const now = new Date();
  const hoursSinceLaunch = (now.getTime() - launchDate.getTime()) / (1000 * 60 * 60);

  let intervalMinutes: number;

  if (hoursSinceLaunch < 1) {
    // First hour: every 1 minute (default)
    intervalMinutes = FEE_UPDATE_INTERVAL_0_1H;
  } else if (hoursSinceLaunch < 24) {
    // 1-24 hours: every 5 minutes (default)
    intervalMinutes = FEE_UPDATE_INTERVAL_1_24H;
  } else if (hoursSinceLaunch < 96) {
    // 24-96 hours (1-4 days): every 10 minutes (default)
    intervalMinutes = FEE_UPDATE_INTERVAL_1_4D;
  } else {
    // 96+ hours (4+ days): every 60 minutes (default)
    intervalMinutes = FEE_UPDATE_INTERVAL_4D_PLUS;
  }

  const nextUpdate = new Date(now.getTime() + intervalMinutes * 60 * 1000);

  return { intervalMinutes, nextUpdate };
}

/**
 * Check if a token needs an update based on last update time and age
 * @param launchDate - The token's launch date
 * @param lastUpdateTime - Last time the token was updated
 * @returns True if the token needs an update
 */
export function shouldUpdateToken(launchDate: Date, lastUpdateTime: Date | null): boolean {
  if (!lastUpdateTime) {
    // Never updated, needs update
    return true;
  }

  const { intervalMinutes } = calculateNextUpdateTime(launchDate);
  const now = new Date();
  const minutesSinceLastUpdate = (now.getTime() - lastUpdateTime.getTime()) / (1000 * 60);

  return minutesSinceLastUpdate >= intervalMinutes;
}

/**
 * Get all tokens that need updates based on age-based polling strategy
 * @param tokens - Array of tokens with launch dates and last update times
 * @returns Array of token IDs that need updates
 */
export function getTokensNeedingUpdate(
  tokens: Array<{ id: number; launchDate: Date; lastUpdateTime: Date | null }>
): number[] {
  return tokens
    .filter((token) => shouldUpdateToken(token.launchDate, token.lastUpdateTime))
    .map((token) => token.id);
}
