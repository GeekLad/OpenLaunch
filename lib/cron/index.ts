/**
 * Cron initialization module
 * Automatically starts background cron jobs when imported
 */

import { startFeeUpdaterCron, getCronStatus } from "./fee-updater";

// Only run cron in production or when explicitly enabled
const shouldRunCron =
  process.env.NODE_ENV === "production" ||
  process.env.ENABLE_CRON === "true";

if (shouldRunCron && typeof window === "undefined") {
  // Only run on server-side (not in browser)
  console.log("[Cron Init] Initializing background cron jobs...");
  startFeeUpdaterCron();

  const status = getCronStatus();
  console.log("[Cron Init] Status:", status);
} else {
  if (typeof window !== "undefined") {
    console.log("[Cron Init] Skipping - running in browser");
  } else {
    console.log(
      "[Cron Init] Skipping - set NODE_ENV=production or ENABLE_CRON=true to enable"
    );
  }
}

// Export for manual control
export { startFeeUpdaterCron, stopFeeUpdaterCron, getCronStatus } from "./fee-updater";
