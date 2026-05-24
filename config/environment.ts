/**
 * @deprecated — Prefer direct imports from `config/public.ts` or `config/secrets.ts`.
 *
 * This barrel file re-exports everything for backward-compatible imports.
 * New code should import only what it needs from the more specific modules
 * (`config/public`, `config/secrets`, `config/defaults`).
 */

// ── Public constants (safe for client + server code) ─────────
export {
  APP_NAME,
  APP_URL,
  SOLANA_NETWORK,
  RPC_URL,
  TOKEN_DECIMALS,
  QUOTE_TOKEN_MINT,
  IPFS_GATEWAY,
  MAX_IMAGE_SIZE_MB,
  METADATA_MUTABLE,
  FEE_UPDATE_INTERVAL_0_1H,
  FEE_UPDATE_INTERVAL_1_24H,
  FEE_UPDATE_INTERVAL_1_4D,
  FEE_UPDATE_INTERVAL_4D_PLUS,
  ENABLE_FEES_DISPLAY,
} from "./public";

// ── Server-only secrets ───────────────────────────────────────
export {
  PINATA_API_KEY,
  PINATA_SECRET_KEY,
  FILEBASE_API_KEY,
  DATA_DIR,
  DATABASE_TYPE,
} from "./secrets";

// ── Feature / launch defaults ─────────────────────────────────
export * from "./defaults";

// ── LEGACY COMPATIBILITY ────────────────────────────────────
// The ENV / SERVER_ENV objects are preserved so existing imports
// don’t break, but new code should import from the specific
// modules above.
import * as publicConfig from "./public";
import * as secrets from "./secrets";

/** @deprecated Prefer named imports from config/public.ts. */
export const ENV = {
  APP_NAME: publicConfig.APP_NAME,
  RPC_URL: publicConfig.RPC_URL,
  SOLANA_NETWORK: publicConfig.SOLANA_NETWORK,
  QUOTE_TOKEN_MINT: publicConfig.QUOTE_TOKEN_MINT,
  TOKEN_DECIMALS: publicConfig.TOKEN_DECIMALS,
  IPFS_GATEWAY: publicConfig.IPFS_GATEWAY,
  MAX_IMAGE_SIZE_MB: publicConfig.MAX_IMAGE_SIZE_MB,
  METADATA_MUTABLE: publicConfig.METADATA_MUTABLE,
  LAUNCHPAD_URL: publicConfig.APP_URL,
  FEE_UPDATE_INTERVAL_0_1H: publicConfig.FEE_UPDATE_INTERVAL_0_1H,
  FEE_UPDATE_INTERVAL_1_24H: publicConfig.FEE_UPDATE_INTERVAL_1_24H,
  FEE_UPDATE_INTERVAL_1_4D: publicConfig.FEE_UPDATE_INTERVAL_1_4D,
  FEE_UPDATE_INTERVAL_4D_PLUS: publicConfig.FEE_UPDATE_INTERVAL_4D_PLUS,
  ENABLE_FEES_DISPLAY: publicConfig.ENABLE_FEES_DISPLAY,
} as const;

/** @deprecated Prefer named imports from config/secrets.ts. */
export const SERVER_ENV = {
  PINATA_API_KEY: secrets.PINATA_API_KEY,
  PINATA_SECRET_KEY: secrets.PINATA_SECRET_KEY,
  FILEBASE_API_KEY: secrets.FILEBASE_API_KEY,
} as const;
