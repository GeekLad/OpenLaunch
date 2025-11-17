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
async function initializeApplication() {
  console.log("[App Init] Starting application initialization...");

  // 1. Validate startup configuration
  await requireValidStartupConfig();

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
// Skip initialization during build time
let isInitialized = false;
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';

if (!isInitialized && typeof window === 'undefined' && !isBuildTime) {
  initializeApplication().catch((error) => {
    console.error("[App Init] Failed to initialize application:", error);
    process.exit(1);
  });
  isInitialized = true;
} else if (isBuildTime) {
  console.log("[App Init] Skipping initialization during build time");
}

export {}; // Make this a module
