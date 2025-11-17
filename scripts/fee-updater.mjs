#!/usr/bin/env node

/**
 * Standalone fee updater cron service
 * Can be run independently of the Next.js app
 *
 * Usage:
 *   node scripts/fee-updater.mjs
 *
 * Or add to systemd, pm2, or use with crontab
 */



// Set up environment
process.env.NODE_ENV = process.env.NODE_ENV || "production";

console.log("[Fee Updater] Starting standalone fee updater service...");
console.log("[Fee Updater] Environment:", process.env.NODE_ENV);

// Import after env is set
const { startFeeUpdaterCron, getCronStatus } = await import("../lib/cron/fee-updater.ts");

// Start the cron job
startFeeUpdaterCron();

// Log status
const status = getCronStatus();
console.log("[Fee Updater] Status:", status);
console.log("[Fee Updater] Service running. Press Ctrl+C to stop.");

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n[Fee Updater] Shutting down gracefully...");
  import("../lib/cron/fee-updater.ts").then(({ stopFeeUpdaterCron }) => {
    stopFeeUpdaterCron();
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("\n[Fee Updater] Received SIGTERM, shutting down...");
  import("../lib/cron/fee-updater.ts").then(({ stopFeeUpdaterCron }) => {
    stopFeeUpdaterCron();
    process.exit(0);
  });
});
