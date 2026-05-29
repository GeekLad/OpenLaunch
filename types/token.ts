import { PublicKey } from "@solana/web3.js";
import { FeeSchedulerConfig, FeeTokenMode } from "./fee";

export interface TokenMetadata {
  name: string;
  symbol: string;
  description?: string;
  image: string;
  external_url?: string;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
  properties?: {
    files?: Array<{
      uri: string;
      type: string;
    }>;
    category?: string;
    creators?: Array<{
      address: string;
      share: number;
    }>;
  };
}

export interface TokenFormData {
  // Token Info
  symbol: string;
  name: string;
  description?: string;
  logoFile: File | null;

  // Fee Scheduler
  feeSchedulerConfig: FeeSchedulerConfig;
  feeTokenMode: FeeTokenMode;

  // Launch Parameters
  totalSupply: number;
  initialMarketCap: number;
  marketCapRangeMin: number;
  marketCapRangeMax: number;
  lockedLiquidityPercentage: number;
  quoteTokenMint: string;

  // Launch Time
  enableTimedLaunch: boolean;
  launchDateTime: Date | null;

  // Advanced Settings
  enableCustomPrivateKey: boolean;
  customPrivateKey?: string;

  // Socials
  websiteUrl?: string;
  twitterUrl?: string;
  telegramUrl?: string;
  discordUrl?: string;
}

export interface TokenLaunchConfig {
  mint: PublicKey;
  metadata: TokenMetadata;
  metadataUri?: string;
  totalSupply: number;
  decimals: number;
  quoteTokenMint: PublicKey;
  initialMarketCap: number;
  marketCapRangeMin: number;
  marketCapRangeMax: number;
  poolAddress?: PublicKey;
  positionAddress?: PublicKey;
  positionNft?: PublicKey;
  feeSchedulerConfig: FeeSchedulerConfig;
  feeTokenMode: FeeTokenMode;
  lockedLiquidityPercentage: number;
  launchTime?: Date;
}

export interface LaunchResult {
  config: TokenLaunchConfig;
  formData: TokenFormData;
}

export interface LaunchStatus {
  step: 'idle' | 'mint' | 'metadata' | 'signing' | 'submitting' | 'pool' | 'complete' | 'error';
  message: string;
  progress: number;
  txSignature?: string;
  error?: string;
  transactions?: {
    mintSignature?: string;
    setupSignature?: string;
    poolSignature?: string;
  };
  launchTimeAdjusted?: boolean;
  requestedLaunchTime?: Date;
}

export interface PoolConfig {
  poolAddress?: PublicKey;
  positionNFT?: PublicKey;
  baseToken: PublicKey;
  quoteToken: PublicKey;
  initialPrice: number;
  liquidityAmount: number;
}
