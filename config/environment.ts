export const ENV = {
  // Application Configuration
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'OpenLaunch',

  // Solana RPC Configuration
  RPC_URL: process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com',
  SOLANA_NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'mainnet-beta',

  // Fixed Quote Token (SOL Wrapped Mint)
  QUOTE_TOKEN_MINT: process.env.NEXT_PUBLIC_QUOTE_TOKEN_MINT || 'So11111111111111111111111111111111111111112',

  // Token Configuration
  TOKEN_DECIMALS: parseInt(process.env.NEXT_PUBLIC_TOKEN_DECIMALS || '9'),
  TOTAL_SUPPLY: parseInt(process.env.NEXT_PUBLIC_TOTAL_SUPPLY || '1000000000'),

  // Pricing Configuration
  INITIAL_PRICE: parseFloat(process.env.NEXT_PUBLIC_INITIAL_PRICE || '0.00001'),
  PRICE_RANGE_MIN: parseFloat(process.env.NEXT_PUBLIC_PRICE_RANGE_MIN || '0.000001'),
  PRICE_RANGE_MAX: parseFloat(process.env.NEXT_PUBLIC_PRICE_RANGE_MAX || '0.0001'),

  // Fee Schedule Configuration
  FEE_DECAY_DURATION_MINUTES: parseInt(process.env.NEXT_PUBLIC_FEE_DECAY_DURATION_MINUTES || '60'),
  FEE_DECAY_PERIODS: parseInt(process.env.NEXT_PUBLIC_FEE_DECAY_PERIODS || '60'), // Number of fee reduction periods

  // Pool Configuration
  POOL_LIQUIDITY_PERCENTAGE: parseFloat(process.env.NEXT_PUBLIC_POOL_LIQUIDITY_PERCENTAGE || '1.0'), // 100% of supply to pool for fair launch

  // IPFS/Storage Configuration (Client-side only)
  IPFS_GATEWAY: process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs/',
  MAX_IMAGE_SIZE_MB: parseFloat(process.env.NEXT_PUBLIC_MAX_IMAGE_SIZE_MB || '1'),

  // Metadata Configuration
  METADATA_MUTABLE: process.env.NEXT_PUBLIC_METADATA_MUTABLE === 'true', // Defaults to false (metadata is immutable)
  
  // Launchpad Configuration
  LAUNCHPAD_URL: process.env.NEXT_PUBLIC_LAUNCHPAD_URL, // Optional launchpad URL for token metadata

  // Fee Update Intervals (in minutes)
  FEE_UPDATE_INTERVAL_0_1H: process.env.FEE_UPDATE_INTERVAL_0_1H || '1', // First hour: every 1 minute
  FEE_UPDATE_INTERVAL_1_24H: process.env.FEE_UPDATE_INTERVAL_1_24H || '5', // 1-24 hours: every 5 minutes
  FEE_UPDATE_INTERVAL_1_4D: process.env.FEE_UPDATE_INTERVAL_1_4D || '10', // 24-96 hours: every 10 minutes
  FEE_UPDATE_INTERVAL_4D_PLUS: process.env.FEE_UPDATE_INTERVAL_4D_PLUS || '60', // 96+ hours: every 60 minutes

  // Feature Flags
  ENABLE_FEES_DISPLAY: process.env.NEXT_PUBLIC_ENABLE_FEES_DISPLAY === 'true', // Enable/disable fees display and sorting (default: false)
} as const;

// Server-side only environment variables (not exposed to client)
export const SERVER_ENV = {
  PINATA_API_KEY: process.env.PINATA_API_KEY || '',
  PINATA_SECRET_KEY: process.env.PINATA_SECRET_KEY || '',
  FILEBASE_API_KEY: process.env.FILEBASE_API_KEY || '',
} as const;

export type Environment = typeof ENV;
