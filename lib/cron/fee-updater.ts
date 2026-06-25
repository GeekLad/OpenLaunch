import * as cron from "node-cron";
import { getPoolMetrics } from "@/lib/meteora/client";
import { calculateNextUpdateTime } from "@/lib/meteora/polling-strategy";
import * as dbService from "@/lib/db/service";
import { MAX_CONSECUTIVE_FAILURES } from "@/config/defaults";

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

        // CRON-01 (D-05): read feeTokenMode for awareness/logging only.
        // The fetch + store path is IDENTICAL regardless of mode (D-05/D-22) —
        // the Meteora API returns aggregate USD fees regardless of collect_fee_mode.
        if (token.feeTokenMode === 'bothTokens') {
          console.log(
            `[Cron] Pool ${token.poolAddress} uses both-token fee mode; ` +
            `tracking aggregate USD fees (per-side tracking deferred per CRON-03)`
          );
        }

        const metrics = await getPoolMetrics(token.poolAddress);

        if (metrics) {
          // CRON-02 (D-01/D-02/D-08/D-09): all monetary metrics from the Meteora
          // API are USD floats. Convert to integer USD microunits (x1e6) for
          // integer-safe storage in text columns. APR (farm_apr) is a percentage
          // stored as-is as a real float (D-03) — no multiplication.
          const USD_MICROUNITS = 1_000_000;
          const cumulativeFeesMicro = Math.floor(
            (metrics.cumulative_metrics?.fees ?? 0) * USD_MICROUNITS
          );
          const fees24hMicro = Math.floor(metrics.fees["24h"] * USD_MICROUNITS);
          const volume24hMicro = Math.floor(metrics.volume["24h"] * USD_MICROUNITS);
          const tvlMicro = Math.floor(metrics.tvl * USD_MICROUNITS);
          const apr = metrics.farm_apr ?? null; // real column, no conversion (D-03)

          // Update cumulative fees snapshot (text-encoded USD microunits)
          await dbService.updateCumulativeFeesSnapshot(
            token.mintAddress,
            cumulativeFeesMicro.toString()
          );

          // Save snapshot to pool stats history (text-encoded USD microunits)
          await dbService.createPoolStatsSnapshot(
            token.id,
            token.poolAddress,
            {
              totalFeesGenerated: cumulativeFeesMicro.toString(),
              fees24h: fees24hMicro.toString(),
              volume24h: volume24hMicro.toString(),
              currentLiquidity: tvlMicro.toString(),
              apr,
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
            `[Cron] ✓ Updated fees for token ${token.id} (${token.symbol}): ${cumulativeFeesMicro} USD microunits (cumulative=${metrics.cumulative_metrics?.fees ?? 0} USD, mode=${token.feeTokenMode})`
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

          // Circuit breaker (D-14/D-17, Pitfall 4): recordUpdateFailure returns
          // void and increments via SQL, so re-fetch the schedule row to read
          // the post-increment consecutiveFailures count.
          const updated = await dbService.getFeeUpdateSchedule(token.id);
          if (updated && updated.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            await dbService.markPoolStale(token.id);
            console.warn(
              `[Cron] ⚠️ Pool ${token.poolAddress} marked stale after ${MAX_CONSECUTIVE_FAILURES} consecutive failures`
            );
          }
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

        // Circuit breaker (D-14/D-17, Pitfall 4): re-fetch to read post-increment
        // count, then mark stale if threshold reached. Uses schedule.poolAddress
        // (the catch block cannot reference the try-scoped `token`).
        const updated = await dbService.getFeeUpdateSchedule(schedule.tokenId);
        if (updated && updated.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          await dbService.markPoolStale(schedule.tokenId);
          console.warn(
            `[Cron] ⚠️ Pool ${schedule.poolAddress ?? 'unknown'} marked stale after ${MAX_CONSECUTIVE_FAILURES} consecutive failures`
          );
        }
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
