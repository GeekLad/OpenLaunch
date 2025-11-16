/**
 * Application initialization
 * This file runs once when the Next.js app starts
 * Import this in your root layout or a server component
 */

import { requireValidStartupConfig } from "./validation/startup";
import { startFeeUpdaterCron, getCronStatus } from "./cron/fee-updater";

/**
 * Initialize all application services
 */
function initializeApplication() {
  console.log("[App Init] Starting application initialization...");

  // 1. Validate startup configuration
  requireValidStartupConfig();

  // 2. Initialize cron jobs (only in production or when explicitly enabled)
  const shouldRunCron =
    process.env.NODE_ENV === "production" ||
    process.env.ENABLE_CRON === "true";

  if (shouldRunCron && typeof window === "undefined") {
    console.log("[App Init] Initializing background cron jobs...");
    startFeeUpdaterCron();

    const status = getCronStatus();
    console.log("[App Init] Cron status:", status);
  } else {
    if (typeof window !== "undefined") {
      console.log("[App Init] Skipping cron - running in browser");
    } else {
      console.log(
        "[App Init] Skipping cron - set NODE_ENV=production or ENABLE_CRON=true to enable"
      );
    }
  }

  console.log("[App Init] ✓ Application initialized successfully");
}

// Run initialization only once
let isInitialized = false;
if (!isInitialized && typeof window === 'undefined') {
  initializeApplication();
  isInitialized = true;
}

export {}; // Make this a module
