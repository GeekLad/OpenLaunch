/**
 * Public application configuration.
 *
 * These values are safe to expose to the client and are used by both
 * frontend and backend. Unlike environment variables, they are baked into
 * the bundle and can be changed at build time if needed.
 */

// ── Application ───────────────────────────────────────────────
export const APP_NAME = "OpenLaunch" as const;
export const APP_URL = "https://openlaunch.app" as const;

// ── Solana ────────────────────────────────────────────────────
export const SOLANA_NETWORK = "mainnet-beta" as const;
export const RPC_URL = "https://api.mainnet-beta.solana.com" as const;
export const TOKEN_DECIMALS = 9;

// SOL mint used as the quote asset in all pools
export const QUOTE_TOKEN_MINT =
  "So11111111111111111111111111111111111111112" as const;

// ── IPFS ──────────────────────────────────────────────────────
export const IPFS_GATEWAY = "https://ipfs.io/ipfs/" as const;
export const MAX_IMAGE_SIZE_MB = 1;

// ── Metadata ─────────────────────────────────────────────────
export const METADATA_MUTABLE = false;

// ── Fee update polling intervals (minutes) ───────────────────
export const FEE_UPDATE_INTERVAL_0_1H = 1;
export const FEE_UPDATE_INTERVAL_1_24H = 5;
export const FEE_UPDATE_INTERVAL_1_4D = 10;
export const FEE_UPDATE_INTERVAL_4D_PLUS = 60;

// ── Feature flags ────────────────────────────────────────────
export const ENABLE_FEES_DISPLAY = false;
