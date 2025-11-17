import * as cron from "node-cron";
import { PublicKey } from "@solana/web3.js";
import { getPoolMetrics } from "@/lib/meteora/client";
import { calculateNextUpdateTime } from "@/lib/meteora/polling-strategy";
import * as dbService from "@/lib/db/service";
import { getCurrentPoolPrice } from "@/lib/solana/poolUtils";
import { getConnection } from "@/lib/solana/connection";
import { getSolPriceWithFallback } from "@/lib/services/priceService";

/**
 * Background cron service to automatically update pool fees
 * Runs every 5 minutes and intelligently updates tokens based on age
 */

let cronJob: cron.ScheduledTask | null = null;

/**
 * Update fees for tokens that need updates based on age-based polling strategy
 */
export async function updateTokenFees() {
  try {
    console.log("[Cron] Starting fee update job...");

    // Get pools that are due for updates using the schedule table
    const scheduledPools = await dbService.getPoolsDueForUpdate();

    if (scheduledPools.length === 0) {
      console.log("[Cron] No pools scheduled for updates");
      return;
    }

    console.log(
      `[Cron] Found ${scheduledPools.length} pools needing updates`
    );

    // Update fees for eligible pools
    let successCount = 0;
    let failCount = 0;

    for (const schedule of scheduledPools) {
      try {
        // Get token details
        const token = await dbService.getTokenById(schedule.tokenId);
        if (!token) {
          console.warn(`[Cron] Token not found for schedule ID ${schedule.id}`);
          continue;
        }

        const metrics = await getPoolMetrics(token.poolAddress);

        if (metrics) {
          // Calculate cumulative fees from 30-day LP fees (in lamports)
          // Meteora returns fees in SOL, convert to lamports
          const cumulativeFeesLamports = Math.floor(metrics.lp_fee30d * 1e9);

          // Update cumulative fees snapshot
          await dbService.updateCumulativeFeesSnapshot(
            token.mintAddress,
            cumulativeFeesLamports.toString()
          );

          // Get current price from pool and SOL price
          const connection = getConnection();
          const [currentPrice, solPrice] = await Promise.all([
            getCurrentPoolPrice(
              connection,
              new PublicKey(token.poolAddress),
              token.decimals || 9,
              9 // SOL decimals
            ),
            getSolPriceWithFallback(),
          ]);

          // Save to pool stats history
          await dbService.createPoolStatsSnapshot(
            token.id,
            token.poolAddress,
            {
              totalFeesGenerated: cumulativeFeesLamports.toString(),
              fees24h: Math.floor(metrics.lp_fee24h * 1e9).toString(),
              volume24h: Math.floor(metrics.volume24h * 1e9).toString(),
              currentLiquidity: Math.floor(metrics.tvl * 1e9).toString(),
              currentPrice: currentPrice || 0,
              currentPriceUsd: (currentPrice || 0) * solPrice,
              priceChange24h: 0, // TODO: Calculate from historical data
            }
          );

          // Calculate next update time based on token age
          const { nextUpdate, intervalMinutes } = calculateNextUpdateTime(
            new Date(token.launchDate)
          );

          // Update the schedule
          await dbService.upsertFeeUpdateSchedule(
            token.id,
            token.poolAddress,
            nextUpdate,
            intervalMinutes
          );

          successCount++;
          console.log(
            `[Cron] ✓ Updated fees for token ${token.id} (${token.symbol}): ${cumulativeFeesLamports} lamports (${metrics.lp_fee30d} SOL)`
          );
        } else {
          failCount++;
          console.warn(
            `[Cron] ✗ Failed to fetch metrics for token ${token.id} (${token.symbol}) - Pool may not exist in Meteora DAMMv2`
          );
          
          // Record failure with more specific error
          await dbService.recordUpdateFailure(
            token.id,
            "Pool not found in Meteora DAMMv2 API (404)"
          );
        }
      } catch (error) {
        failCount++;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(
          `[Cron] Error updating pool schedule ${schedule.id} (token ${schedule.tokenId}):`,
          errorMessage
        );
        
        // Record failure with detailed error
        await dbService.recordUpdateFailure(
          schedule.tokenId,
          errorMessage
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
  setTimeout(updateTokenFees, 1000); // Delay to ensure database is ready
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
