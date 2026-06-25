import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Vitest configuration for OpenLaunch.
 *
 * Mirrors the `tsconfig.json` path alias `@/*` -> project root so that test
 * files can import application modules identically to production code.
 *
 * The node environment is used because the cron, meteora client, and db
 * service modules all rely on Node APIs (`fetch`, `process.env`, etc.).
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
});