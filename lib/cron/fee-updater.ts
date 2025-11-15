import cron from "node-cron";
import { getPoolMetrics } from "@/lib/meteora/client";
import { shouldUpdateToken } from "@/lib/meteora/polling-strategy";
import * as dbService from "@/lib/db/service";

/**
 * Background cron service to automatically update pool fees
 * Runs every 5 minutes and intelligently updates tokens based on age
 */

let cronJob: cron.ScheduledTask | null = null;

/**
 * Update fees for tokens that need updates based on age-based polling strategy
 */
async function updateTokenFees() {
  try {
    console.log("[Cron] Starting fee update job...");

    // Get all tokens
    const tokens = await dbService.getAllTokens();

    if (tokens.length === 0) {
      console.log("[Cron] No tokens to update");
      return;
    }

    // Filter tokens that need updates based on age
    const tokensToUpdate = tokens.filter((token) => {
      const launchDate = new Date(token.launchDate);
      const lastUpdate = token.cumulativeFeesUpdatedAt
        ? new Date(token.cumulativeFeesUpdatedAt)
        : null;
      return shouldUpdateToken(launchDate, lastUpdate);
    });

    console.log(
      `[Cron] Found ${tokensToUpdate.length} tokens needing updates out of ${tokens.length} total`
    );

    if (tokensToUpdate.length === 0) {
      return;
    }

    // Update fees for eligible tokens
    let successCount = 0;
    let failCount = 0;

    for (const token of tokensToUpdate) {
      try {
        const metrics = await getPoolMetrics(token.poolAddress);

        if (metrics) {
          // Calculate cumulative fees from 30-day LP fees (in lamports)
          // Meteora returns fees in SOL, convert to lamports
          const cumulativeFeesLamports = Math.floor(metrics.lp_fee30d * 1e9);

          // Update cumulative fees snapshot
          await dbService.updateCumulativeFeesSnapshot(
            token.id,
            cumulativeFeesLamports.toString()
          );

          // Save to pool stats history
          await dbService.createPoolStatsSnapshot({
            tokenId: token.id,
            poolAddress: token.poolAddress,
            totalFeesGenerated: cumulativeFeesLamports.toString(),
            tradingVolume24h: Math.floor(metrics.volume24h * 1e9).toString(),
            totalValueLocked: Math.floor(metrics.tvl * 1e9).toString(),
            currentPrice: 0, // Price not available in metrics
          });

          successCount++;
          console.log(
            `[Cron] ✓ Updated fees for token ${token.id} (${token.symbol}): ${cumulativeFeesLamports} lamports (${metrics.lp_fee30d} SOL)`
          );
        } else {
          failCount++;
          console.warn(
            `[Cron] ✗ Failed to fetch metrics for token ${token.id} (${token.symbol})`
          );
        }
      } catch (error) {
        failCount++;
        console.error(
          `[Cron] Error updating token ${token.id} (${token.symbol}):`,
          error
        );
      }
    }

    console.log(
      `[Cron] Fee update job complete: ${successCount} succeeded, ${failCount} failed`
    );
  } catch (error) {
    console.error("[Cron] Error in fee update job:", error);
  }
}

/**
 * Start the cron job
 * Runs every 5 minutes by default
 */
export function startFeeUpdaterCron() {
  if (cronJob) {
    console.log("[Cron] Fee updater already running");
    return;
  }

  // Run every 5 minutes
  cronJob = cron.schedule("*/5 * * * *", updateTokenFees);

  console.log("[Cron] ✓ Fee updater cron started (runs every 5 minutes)");

  // Run immediately on startup
  updateTokenFees();
}

/**
 * Stop the cron job
 */
export function stopFeeUpdaterCron() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log("[Cron] Fee updater cron stopped");
  }
}

/**
 * Get status of the cron job
 */
export function getCronStatus() {
  return {
    running: cronJob !== null,
    schedule: "*/5 * * * *", // Every 5 minutes
  };
}
