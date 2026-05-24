// Barrel re-export for backward-compatible imports.
// Prefer direct imports from the more specific modules:
//   config/public    — public constants (safe for client + server)
//   config/secrets   — server-only secrets (PINATA, FILEBASE, etc.)
//   config/defaults  — token launch default parameters
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

export {
  PINATA_API_KEY,
  PINATA_SECRET_KEY,
  FILEBASE_API_KEY,
  DATA_DIR,
  DATABASE_TYPE,
} from "./secrets";

export * from "./defaults";
