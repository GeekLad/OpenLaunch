import { Connection, PublicKey, Transaction, Keypair } from "@solana/web3.js";
import { CpAmm, type PoolFeesParams, getFeeTimeSchedulerParams, BaseFeeMode, CollectFeeMode, getDynamicFeeParams } from "@meteora-ag/cp-amm-sdk";
import { getMint, Mint, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import BN from "bn.js";
import { DEFAULT_NUMBER_OF_PERIODS } from "@/config/defaults";

// Meteora DAMMv2 Program ID
export const DAMM_V2_PROGRAM_ID = new PublicKey("cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG");

/**
 * Converts a human-readable price to sqrt price in Q64 format
 * @param price - Human readable price (e.g., 0.00001)
 * @param tokenADecimals - Decimals for token A
 * @param tokenBDecimals - Decimals for token B
 * @returns BN representing sqrt price in Q64 format
 */
export function priceToSqrtPrice(price: number, tokenADecimals: number, tokenBDecimals: number): BN {
  // Price = (amount of B / 10^decimalsB) / (amount of A / 10^decimalsA)
  // Adjust for decimal difference
  const decimalAdjustment = Math.pow(10, tokenBDecimals - tokenADecimals);
  const adjustedPrice = price * decimalAdjustment;

  // Calculate sqrt price
  const sqrtPrice = Math.sqrt(adjustedPrice);

  // Convert to Q64 format (multiply by 2^64)
  // Use string representation to avoid precision issues with large numbers
  const sqrtPriceScaled = sqrtPrice * Math.pow(2, 32); // Scale by 2^32 first (safe range)
  const sqrtPriceBN = new BN(Math.floor(sqrtPriceScaled)).shln(32); // Then shift left by 32 more bits (total 2^64)

  return sqrtPriceBN;
}

/**
 * Converts sqrt price in Q64 format to human-readable price
 * @param sqrtPrice - Sqrt price in Q64 format
 * @param tokenADecimals - Decimals for token A
 * @param tokenBDecimals - Decimals for token B
 * @returns Human readable price
 */
export function sqrtPriceToPrice(sqrtPrice: BN, tokenADecimals: number, tokenBDecimals: number): number {
  // Convert Q64 to normal number
  const Q64 = Math.pow(2, 64);
  const sqrtPriceNum = sqrtPrice.toNumber() / Q64;

  // Square to get price
  const price = Math.pow(sqrtPriceNum, 2);

  // Adjust for decimals
  const decimalAdjustment = Math.pow(10, tokenBDecimals - tokenADecimals);
  return price / decimalAdjustment;
}

export interface CreatePoolParams {
  connection: Connection;
  payer: PublicKey;
  tokenAMint: PublicKey; // Base token (our meme token) - Token A in Meteora
  tokenBMint: PublicKey; // Quote token (SOL) - Token B in Meteora
  tokenAAmount: number; // Only token A amount for single-sided pool
  tokenADecimals: number;
  tokenBDecimals: number;
  initialPrice: number; // Price in terms of token B per token A (SOL per token)
  maxPrice?: number; // Maximum price (defaults to 100x initial price)
  baseFeeNumerator?: number; // Base fee in basis points (default 30 = 0.3%)
  hasAlphaVault?: boolean; // Whether to enable alpha vault (default false)
  tokenAProgram?: PublicKey; // Optional: Token A program ID (auto-detected if not provided)
  tokenBProgram?: PublicKey; // Optional: Token B program ID (auto-detected if not provided)
  launchTime?: Date; // Optional: Schedule when the pool becomes active
  feeSchedule?: {
    enabled: boolean;
    startRate: number;    // In percentage (e.g., 50 for 50%)
    endRate: number;      // In percentage (e.g., 1 for 1%)
    decayDuration: number; // In minutes
  };
}

export interface CreatePoolResult {
  transaction: Transaction;
  pool: PublicKey;
  position: PublicKey;
  positionNft: Keypair;
}

// Fee configuration types matching Meteora SDK
// Note: These should match the SDK's internal types exactly

/**
 * Creates a DAMMv2 pool on Meteora with single-sided liquidity (token only, no SOL)
 * This implementation follows the Meteora reference implementation for one-sided pools
 * @param params - Pool creation parameters
 * @returns Transaction, pool address, position address, and NFT keypair
 */
export async function createDAMMv2Pool(params: CreatePoolParams): Promise<CreatePoolResult> {
  const {
    connection,
    payer,
    tokenAMint,
    tokenBMint,
    tokenAAmount,
    tokenADecimals,
    tokenBDecimals,
    initialPrice,
    maxPrice,
    baseFeeNumerator = 25, // 0.25% default fee
    hasAlphaVault = false,
    tokenAProgram: providedTokenAProgram,
    tokenBProgram: providedTokenBProgram,
    launchTime,
    feeSchedule,
  } = params;

  // Initialize CpAmm SDK
  const cpAmm = new CpAmm(connection);

  // Generate position NFT mint
  const positionNft = Keypair.generate();

  // Use provided token programs or auto-detect
  let tokenAProgram: PublicKey;
  let tokenBProgram: PublicKey;
  let tokenAMintInfo: Mint | undefined;
  let isTokenA2022 = false;

  if (providedTokenAProgram) {
    tokenAProgram = providedTokenAProgram;
    isTokenA2022 = providedTokenAProgram.equals(TOKEN_2022_PROGRAM_ID);
  } else {
    // Fetch token A mint info to check if it's TOKEN_2022
    tokenAMintInfo = await getMint(connection, tokenAMint);
    isTokenA2022 = tokenAMintInfo.tlvData && tokenAMintInfo.tlvData.length > 0;
    tokenAProgram = isTokenA2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
  }

  if (providedTokenBProgram) {
    tokenBProgram = providedTokenBProgram;
  } else {
    // Fetch token B mint info to check if it's TOKEN_2022
    const tokenBMintInfo = await getMint(connection, tokenBMint);
    const isTokenB2022 = tokenBMintInfo.tlvData && tokenBMintInfo.tlvData.length > 0;
    tokenBProgram = isTokenB2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
  }

  // Convert token amount to BN with proper decimals
  const tokenAAmountBN = new BN(tokenAAmount).mul(new BN(10).pow(new BN(tokenADecimals)));

  // Handle TOKEN_2022 transfer fees if applicable
  // Note: For simplicity, we're not implementing full transfer fee calculation here
  // In production, you should use the SDK's calculateTransferFeeIncludedAmount helper

  // Calculate sqrt prices
  const initSqrtPrice = priceToSqrtPrice(initialPrice, tokenADecimals, tokenBDecimals);

  // For one-sided pools, min price = initial price, max price is higher
  const sqrtMinPrice = initSqrtPrice; // Must equal init price for one-sided
  const calculatedMaxPrice = maxPrice || (initialPrice * 100);
  const sqrtMaxPrice = priceToSqrtPrice(calculatedMaxPrice, tokenADecimals, tokenBDecimals);

  // Calculate liquidity delta using single-sided helper
  // This is critical for one-sided pools - only token A is deposited
  const tokenAInfo = isTokenA2022 && tokenAMintInfo ? {
    mint: tokenAMintInfo,
    currentEpoch: 0, // You should fetch actual epoch in production
  } : undefined;

  const liquidityDelta = cpAmm.preparePoolCreationSingleSide({
    tokenAAmount: tokenAAmountBN,
    minSqrtPrice: sqrtMinPrice,
    maxSqrtPrice: sqrtMaxPrice,
    initSqrtPrice,
    tokenAInfo,
    collectFeeMode: CollectFeeMode.OnlyB,
  });

  // Create pool fees configuration
  // Convert basis points to fee numerator (denominator is 1,000,000,000)
  // e.g., 30 bps (0.3%) -> 3,000,000

  let poolFees: PoolFeesParams;

  // Configure dynamic fees (adjusts fees based on market volatility)
  // baseFeeNumerator is used as base, maxPriceChangeBps max is 1500 (15% price change tolerance)
  const dynamicFee = getDynamicFeeParams(baseFeeNumerator, 1500); // Enable dynamic fees with 15% max price change

  if (feeSchedule?.enabled) {
    // Fee scheduler mode with dynamic fees
    // Convert percentages to basis points (1% = 100 bps)
    const startBps = feeSchedule.startRate * 100;
    const endBps = feeSchedule.endRate * 100;

    // Convert duration from minutes to seconds
    const durationSeconds = feeSchedule.decayDuration * 60;

    // Get number of periods from default config
    // More periods = more frequent fee changes
    const numberOfPeriods = DEFAULT_NUMBER_OF_PERIODS;

    const periodIntervalSeconds = durationSeconds / numberOfPeriods;

    console.log(`Fee configuration:\n` +
      `  Base fee (scheduler):\n` +
      `    Start rate: ${feeSchedule.startRate}% (${startBps} bps)\n` +
      `    End rate: ${feeSchedule.endRate}% (${endBps} bps)\n` +
      `    Decay duration: ${feeSchedule.decayDuration} minutes (${durationSeconds} seconds)\n` +
      `    Number of periods: ${numberOfPeriods}\n` +
      `    Fee change interval: ${periodIntervalSeconds} seconds\n` +
      `    Mode: Exponential Scheduler\n` +
      `  Dynamic fees: Enabled (adjusts based on volatility)`
    );

    // Use the SDK's helper function to construct fee scheduler params
    const baseFee = getFeeTimeSchedulerParams(
      startBps,
      endBps,
      BaseFeeMode.FeeTimeSchedulerExponential, // Exponential decay from start to end (faster initial decay)
      numberOfPeriods,
      durationSeconds
    );

    poolFees = {
      baseFee,
      compoundingFeeBps: 0,
      padding: 0,
      dynamicFee, // Enable dynamic fees
    };
  } else {
    // Fixed fee mode with dynamic fees
    const baseFee = getFeeTimeSchedulerParams(
      baseFeeNumerator,
      baseFeeNumerator,
      BaseFeeMode.FeeTimeSchedulerLinear,
      0,
      0
    );

    console.log(`Fee configuration:\n` +
      `  Base fee: ${baseFeeNumerator} bps (${baseFeeNumerator / 100}%)\n` +
      `  Mode: Fixed (0)\n` +
      `  Dynamic fees: Enabled (adjusts based on volatility)`
    );

    poolFees = {
      baseFee,
      compoundingFeeBps: 0,
      padding: 0,
      dynamicFee, // Enable dynamic fees
    };
  }

  // Determine activation type based on launch time
  let activationType: number;
  let activationPoint: BN | null;

  if (launchTime) {
    // Timed activation - pool becomes active at specified timestamp
    activationType = 1; // 1 = slot-based activation
    // Convert launch time to Unix timestamp (seconds)
    const launchTimestamp = Math.floor(launchTime.getTime() / 1000);
    activationPoint = new BN(launchTimestamp);

    console.log(`Pool scheduled for timed launch:\n` +
      `  Launch time: ${launchTime.toISOString()}\n` +
      `  Timestamp: ${launchTimestamp}\n` +
      `  Activation type: Slot-based (1)`
    );
  } else {
    // Immediate activation
    activationType = 0; // 0 = immediate activation
    activationPoint = null;

    console.log(`Pool configured for immediate activation`);
  }

  // Create the pool using createCustomPool (not createPool)
  // This gives us full control over fees and configuration
  const { tx: transaction, pool, position } = await cpAmm.createCustomPool({
    payer,
    creator: payer,
    positionNft: positionNft.publicKey,
    tokenAMint,
    tokenBMint,
    tokenAAmount: tokenAAmountBN, // All our tokens (base token A)
    tokenBAmount: new BN(0), // 0 SOL (quote token B) - single-sided pool
    sqrtMinPrice,
    sqrtMaxPrice,
    liquidityDelta,
    initSqrtPrice,
    poolFees,
    hasAlphaVault,
    activationType,
    collectFeeMode: CollectFeeMode.OnlyB, // Collect fees only in token B (SOL/quote token)
    activationPoint,
    tokenAProgram,
    tokenBProgram,
    isLockLiquidity: true, // Lock 100% of the liquidity
  });

  return {
    transaction,
    pool,
    position,
    positionNft,
  };
}

export interface PoolInfo {
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  tokenAVault: PublicKey;
  tokenBVault: PublicKey;
  sqrtPrice: BN;
  sqrtMinPrice: BN;
  sqrtMaxPrice: BN;
  liquidity: BN;
}

/**
 * Gets the current price from a pool
 * @param connection - Solana connection
 * @param poolAddress - Pool public key
 * @param tokenADecimals - Decimals of token A (base token)
 * @param tokenBDecimals - Decimals of token B (quote token, usually SOL)
 * @returns Current price in terms of token B per token A
 */
export async function getCurrentPoolPrice(
  connection: Connection,
  poolAddress: PublicKey,
  tokenADecimals: number = 9,
  tokenBDecimals: number = 9
): Promise<number | null> {
  try {
    const poolInfo = await getPoolInfo(connection, poolAddress);
    // Convert sqrt price to human-readable price
    return sqrtPriceToPrice(poolInfo.sqrtPrice, tokenADecimals, tokenBDecimals);
  } catch (error) {
    console.error(`Error getting current price for pool ${poolAddress}:`, error);
    return null;
  }
}

/**
 * Fetches pool information from DAMMv2
 * @param connection - Solana connection
 * @param poolAddress - Pool public key
 * @returns Pool information
 */
export async function getPoolInfo(connection: Connection, poolAddress: PublicKey): Promise<PoolInfo> {
  const cpAmm = new CpAmm(connection);

  // Fetch pool state
  const poolState = await cpAmm.fetchPoolState(poolAddress);

  if (!poolState) {
    throw new Error("Pool not found");
  }

  return {
    tokenAMint: poolState.tokenAMint,
    tokenBMint: poolState.tokenBMint,
    tokenAVault: poolState.tokenAVault,
    tokenBVault: poolState.tokenBVault,
    sqrtPrice: poolState.sqrtPrice,
    sqrtMinPrice: poolState.sqrtMinPrice,
    sqrtMaxPrice: poolState.sqrtMaxPrice,
    liquidity: poolState.liquidity,
  };
}

/**
 * Checks if a pool exists for given token pair
 * Note: For customizable pools created with createCustomPool, the pool address is derived differently
 * and doesn't use a config PDA. This function is kept for reference but may not work with custom pools.
 * @param connection - Solana connection
 * @param poolAddress - The pool address to check
 * @returns true if pool exists, false otherwise
 */
export async function poolExists(
  connection: Connection,
  poolAddress: PublicKey
): Promise<boolean> {
  try {
    const accountInfo = await connection.getAccountInfo(poolAddress);
    return accountInfo !== null;
  } catch {
    return false;
  }
}
