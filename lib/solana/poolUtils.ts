import { Connection, PublicKey, Transaction, Keypair } from "@solana/web3.js";
import { CpAmm, type PoolFeesParams, getFeeTimeSchedulerParams, getFeeMarketCapSchedulerParams, BaseFeeMode, CollectFeeMode, getDynamicFeeParams, getSqrtPriceFromPrice, getPriceFromSqrtPrice, getUnClaimLpFee } from "@meteora-ag/cp-amm-sdk";
import { getMint, Mint, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import BN from "bn.js";
import { DEFAULT_NUMBER_OF_PERIODS, DEFAULT_SCHEDULER_EXPIRATION_SECONDS, percentToBps } from "@/config/defaults";
import type { FeeSchedulerConfig } from "@/types/fee";

// Meteora DAMMv2 Program ID
export const DAMM_V2_PROGRAM_ID = new PublicKey("cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG");

/**
 * Converts a human-readable price to sqrt price in Q64 format.
 * Delegates to the Meteora SDK's `getSqrtPriceFromPrice` for exact precision
 * (uses decimal.js internally instead of float64).
 * @param price - Human readable price (e.g., 0.00001)
 * @param tokenADecimals - Decimals for token A (base token)
 * @param tokenBDecimals - Decimals for token B (quote token)
 * @returns BN representing sqrt price in Q64 format
 */
export function priceToSqrtPrice(price: number, tokenADecimals: number, tokenBDecimals: number): BN {
  return getSqrtPriceFromPrice(String(price), tokenADecimals, tokenBDecimals);
}

/**
 * Converts sqrt price in Q64 format to human-readable price.
 * Delegates to the Meteora SDK's `getPriceFromSqrtPrice` for exact precision.
 * @param sqrtPrice - Sqrt price in Q64 format
 * @param tokenADecimals - Decimals for token A (base token)
 * @param tokenBDecimals - Decimals for token B (quote token)
 * @returns Human readable price
 */
export function sqrtPriceToPrice(sqrtPrice: BN, tokenADecimals: number, tokenBDecimals: number): number {
  return getPriceFromSqrtPrice(sqrtPrice, tokenADecimals, tokenBDecimals).toNumber();
}

export interface CreatePoolParams {
  connection: Connection;
  payer: PublicKey;
  tokenAMint: PublicKey; // Base token (the launched token) - Token A in Meteora
  tokenBMint: PublicKey; // Quote token (SOL) - Token B in Meteora
  tokenAAmount: number; // Only token A amount for single-sided pool
  tokenADecimals: number;
  tokenBDecimals: number;
  initialMarketCap: number; // Market cap in terms of quote token (totalSupply * price)
  totalSupply: number;
  marketCapRangeMax: number;
  baseFeeNumerator?: number; // Base fee in basis points (default 25 = 0.25%)
  hasAlphaVault?: boolean;
  tokenAProgram?: PublicKey;
  tokenBProgram?: PublicKey;
  launchTime?: Date;
  feeSchedulerConfig?: FeeSchedulerConfig;
  collectFeeMode?: CollectFeeMode;
}

export interface CreatePoolResult {
  transaction: Transaction;
  pool: PublicKey;
  position: PublicKey;
  positionNft: Keypair;
}

/**
 * Creates a DAMMv2 pool on Meteora with single-sided liquidity.
 * Converts market cap values to price internally for the SDK.
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
    initialMarketCap,
    totalSupply,
    marketCapRangeMax,
    baseFeeNumerator = 25,
    hasAlphaVault = false,
    tokenAProgram: providedTokenAProgram,
    tokenBProgram: providedTokenBProgram,
    launchTime,
    feeSchedulerConfig,
    collectFeeMode,
  } = params;

  // Convert market cap to price for SDK
  const initialPrice = totalSupply > 0 ? initialMarketCap / totalSupply : 0;
  const maxPrice = totalSupply > 0 ? marketCapRangeMax / totalSupply : 0;

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
    tokenAMintInfo = await getMint(connection, tokenAMint);
    isTokenA2022 = tokenAMintInfo.tlvData && tokenAMintInfo.tlvData.length > 0;
    tokenAProgram = isTokenA2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
  }

  if (providedTokenBProgram) {
    tokenBProgram = providedTokenBProgram;
  } else {
    const tokenBMintInfo = await getMint(connection, tokenBMint);
    const isTokenB2022 = tokenBMintInfo.tlvData && tokenBMintInfo.tlvData.length > 0;
    tokenBProgram = isTokenB2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
  }

  // Convert token amount to BN with proper decimals
  const tokenAAmountBN = new BN(tokenAAmount).mul(new BN(10).pow(new BN(tokenADecimals)));

  // Calculate sqrt prices from price
  const initSqrtPrice = priceToSqrtPrice(initialPrice, tokenADecimals, tokenBDecimals);

  // For one-sided pools, min price = initial price, max price from range
  const sqrtMinPrice = initSqrtPrice;
  const sqrtMaxPrice = priceToSqrtPrice(maxPrice, tokenADecimals, tokenBDecimals);

  // Calculate liquidity delta using single-sided helper
  const tokenAInfo = isTokenA2022 && tokenAMintInfo ? {
    mint: tokenAMintInfo,
    currentEpoch: 0,
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
  let poolFees: PoolFeesParams;
  const dynamicFee = getDynamicFeeParams(baseFeeNumerator, 1500);

  if (feeSchedulerConfig && feeSchedulerConfig.mode !== "fixed") {
    let baseFee;
    if (feeSchedulerConfig.mode === "market-cap-based") {
      const startBps = percentToBps(feeSchedulerConfig.feeMarketCapStartRatePercent);
      const endBps = percentToBps(feeSchedulerConfig.feeMarketCapEndRatePercent);
      const numberOfPeriod = DEFAULT_NUMBER_OF_PERIODS;
      // Derive priceMultiple from sqrt prices computed via the SAME priceToSqrtPrice
      // function used for the pool range. This guarantees consistent decimal handling
      // between the pool's price range and the scheduler's price range.
      // The scheduler uses its own independent startingMarketCap/endingMarketCap
      // fields, so the user can set a different range than the pool if desired.
      const schedulerStartPrice = totalSupply > 0 ? feeSchedulerConfig.startingMarketCap / totalSupply : 0;
      const schedulerEndPrice = totalSupply > 0 ? feeSchedulerConfig.endingMarketCap / totalSupply : 0;
      const schedulerStartSqrt = priceToSqrtPrice(schedulerStartPrice, tokenADecimals, tokenBDecimals);
      const schedulerEndSqrt = priceToSqrtPrice(schedulerEndPrice, tokenADecimals, tokenBDecimals);
      // priceMultiple = (endSqrt / startSqrt)^2 = endPrice / startPrice
      const sqrtRatio = schedulerStartSqrt.gt(new BN(0))
        ? Number(schedulerEndSqrt) / Number(schedulerStartSqrt)
        : 1;
      const priceMultiple = sqrtRatio * sqrtRatio;
      const schedulerExpirationDuration = DEFAULT_SCHEDULER_EXPIRATION_SECONDS;
      const baseFeeMode = feeSchedulerConfig.decayMode === "linear"
        ? BaseFeeMode.FeeMarketCapSchedulerLinear
        : BaseFeeMode.FeeMarketCapSchedulerExponential;

      console.log(
        `Fee configuration (market-cap-based):\n` +
          `  Start rate: ${feeSchedulerConfig.feeMarketCapStartRatePercent}% (${startBps} bps)\n` +
          `  End rate: ${feeSchedulerConfig.feeMarketCapEndRatePercent}% (${endBps} bps)\n` +
          `  Scheduler starting market cap: ${feeSchedulerConfig.startingMarketCap}\n` +
          `  Scheduler ending market cap: ${feeSchedulerConfig.endingMarketCap}\n` +
          `  Scheduler start price: ${schedulerStartPrice}\n` +
          `  Scheduler end price: ${schedulerEndPrice}\n` +
          `  Number of periods: ${numberOfPeriod}\n` +
          `  Price multiple (from sqrt prices): ${priceMultiple}\n` +
          `  Decay mode: ${feeSchedulerConfig.decayMode ?? "exponential"}\n` +
          `  Dynamic fees: Enabled (adjusts based on volatility)`
      );

      baseFee = getFeeMarketCapSchedulerParams(
        startBps,
        endBps,
        baseFeeMode,
        numberOfPeriod,
        priceMultiple,
        schedulerExpirationDuration
      );
    } else {
      // time-based
      const startBps = percentToBps(feeSchedulerConfig.startRatePercent);
      const endBps = percentToBps(feeSchedulerConfig.endRatePercent);
      const durationSeconds = feeSchedulerConfig.durationMinutes * 60;
      const numberOfPeriods = DEFAULT_NUMBER_OF_PERIODS;

      console.log(
        `Fee configuration (time-based):\n` +
          `  Start rate: ${feeSchedulerConfig.startRatePercent}% (${startBps} bps)\n` +
          `  End rate: ${feeSchedulerConfig.endRatePercent}% (${endBps} bps)\n` +
          `  Decay duration: ${feeSchedulerConfig.durationMinutes} minutes (${durationSeconds} seconds)\n` +
          `  Number of periods: ${numberOfPeriods}\n` +
          `  Dynamic fees: Enabled (adjusts based on volatility)`
      );

      baseFee = getFeeTimeSchedulerParams(
        startBps,
        endBps,
        BaseFeeMode.FeeTimeSchedulerExponential,
        numberOfPeriods,
        durationSeconds
      );
    }

    poolFees = {
      baseFee,
      compoundingFeeBps: 0,
      padding: 0,
      dynamicFee,
    };
  } else {
    // Fixed fee mode
    const baseFeeBps = feeSchedulerConfig ? percentToBps(feeSchedulerConfig.baseFeePercent) : baseFeeNumerator;
    const baseFee = getFeeTimeSchedulerParams(
      baseFeeBps,
      baseFeeBps,
      BaseFeeMode.FeeTimeSchedulerLinear,
      0,
      0
    );

    console.log(
      `Fee configuration:\n` +
        `  Base fee: ${baseFeeBps} bps\n` +
        `  Mode: Fixed\n` +
        `  Dynamic fees: Enabled (adjusts based on volatility)`
    );

    poolFees = {
      baseFee,
      compoundingFeeBps: 0,
      padding: 0,
      dynamicFee,
    };
  }

  // Determine activation type based on launch time
  let activationType: number;
  let activationPoint: BN | null;

  if (launchTime) {
    activationType = 1;
    const launchTimestamp = Math.floor(launchTime.getTime() / 1000);
    activationPoint = new BN(launchTimestamp);
  } else {
    activationType = 0;
    activationPoint = null;
  }

  // Create the pool using createCustomPool
  const { tx: transaction, pool, position } = await cpAmm.createCustomPool({
    payer,
    creator: payer,
    positionNft: positionNft.publicKey,
    tokenAMint,
    tokenBMint,
    tokenAAmount: tokenAAmountBN,
    tokenBAmount: new BN(0),
    sqrtMinPrice,
    sqrtMaxPrice,
    liquidityDelta,
    initSqrtPrice,
    poolFees,
    hasAlphaVault,
    activationType,
    collectFeeMode: collectFeeMode ?? CollectFeeMode.OnlyB,
    activationPoint,
    tokenAProgram,
    tokenBProgram,
    isLockLiquidity: true,
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
 */
export async function getCurrentPoolPrice(
  connection: Connection,
  poolAddress: PublicKey,
  tokenADecimals: number = 9,
  tokenBDecimals: number = 9
): Promise<number | null> {
  try {
    const poolInfo = await getPoolInfo(connection, poolAddress);
    return sqrtPriceToPrice(poolInfo.sqrtPrice, tokenADecimals, tokenBDecimals);
  } catch (error) {
    console.error(`Error getting current price for pool ${poolAddress}:`, error);
    return null;
  }
}

/**
 * Fetches pool information from DAMMv2
 */
export async function getPoolInfo(connection: Connection, poolAddress: PublicKey): Promise<PoolInfo> {
  const cpAmm = new CpAmm(connection);
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

// ============================================================================
// Fee claiming helpers
// ============================================================================

/**
 * Result of reading the creator's position and its unclaimed fees for a pool.
 */
export interface PositionFeeInfo {
  position: PublicKey;
  positionNftAccount: PublicKey;
  feePendingA: BN;
  feePendingB: BN;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  tokenAVault: PublicKey;
  tokenBVault: PublicKey;
  tokenAProgram: PublicKey;
  tokenBProgram: PublicKey;
  pool: PublicKey;
  /** True when the position NFT is held by `ownerWallet`. */
  isOwner: boolean;
}

/**
 * Fetches the creator's position for a pool and its unclaimed fee balances.
 *
 * The position address is not persisted in the database, so it is discovered
 * on-chain via `CpAmm.getUserPositionByPool(pool, ownerWallet)`. When the
 * owner holds multiple positions for the same pool, fees are aggregated and
 * the first position is returned (used only for the claim instruction).
 *
 * @param connection - Solana RPC connection
 * @param poolAddress - DAMMv2 pool address
 * @param ownerWallet - Expected position NFT holder (the token creator)
 * @returns Position fee info, or null when the owner has no position in this pool
 */
export async function getCreatorPositionFees(
  connection: Connection,
  poolAddress: PublicKey,
  ownerWallet: PublicKey
): Promise<PositionFeeInfo | null> {
  const cpAmm = new CpAmm(connection);
  const poolState = await cpAmm.fetchPoolState(poolAddress);
  if (!poolState) return null;

  const positions = await cpAmm.getUserPositionByPool(poolAddress, ownerWallet);
  if (positions.length === 0) return null;

  // The pool account does not store the SPL token program ids; derive them
  // from the mints the same way createDAMMv2Pool does.
  const [tokenAMintInfo, tokenBMintInfo] = await Promise.all([
    getMint(connection, poolState.tokenAMint),
    getMint(connection, poolState.tokenBMint),
  ]);
  const tokenAProgram =
    tokenAMintInfo.tlvData && tokenAMintInfo.tlvData.length > 0
      ? TOKEN_2022_PROGRAM_ID
      : TOKEN_PROGRAM_ID;
  const tokenBProgram =
    tokenBMintInfo.tlvData && tokenBMintInfo.tlvData.length > 0
      ? TOKEN_2022_PROGRAM_ID
      : TOKEN_PROGRAM_ID;

  const first = positions[0];

  // The on-chain `feeAPending`/`feeBPending` fields are only refreshed when a
  // position is touched (deposit/withdraw/claim). Between touches the claimable
  // fees must be derived from the pool's cumulative `feeAPerLiquidity` minus
  // the position's `feeAPerTokenCheckpoint`, scaled by the position liquidity.
  // The SDK's `getUnClaimLpFee` does exactly this and returns the real claimable
  // amounts (it adds the stored pending fees on top of the checkpoint delta).
  let feePendingA = new BN(0);
  let feePendingB = new BN(0);
  for (const p of positions) {
    const unclaimed = getUnClaimLpFee(poolState, p.positionState);
    feePendingA = feePendingA.add(unclaimed.feeTokenA);
    feePendingB = feePendingB.add(unclaimed.feeTokenB);
  }

  return {
    position: first.position,
    positionNftAccount: first.positionNftAccount,
    feePendingA,
    feePendingB,
    tokenAMint: poolState.tokenAMint,
    tokenBMint: poolState.tokenBMint,
    tokenAVault: poolState.tokenAVault,
    tokenBVault: poolState.tokenBVault,
    tokenAProgram,
    tokenBProgram,
    pool: poolAddress,
    isOwner: true,
  };
}

/**
 * Parameters for building a claim-position-fee transaction client-side.
 * All values are returned as base58 strings so they can be serialized to JSON
 * by an API route and reconstructed into PublicKeys in the browser.
 */
export interface ClaimFeeTxParams {
  owner: string;
  position: string;
  positionNftAccount: string;
  pool: string;
  tokenAMint: string;
  tokenBMint: string;
  tokenAVault: string;
  tokenBVault: string;
  tokenAProgram: string;
  tokenBProgram: string;
}

/**
 * Converts a {@link PositionFeeInfo} into the JSON-safe params shape needed by
 * the client to call `CpAmm.claimPositionFee`.
 */
export function toClaimFeeTxParams(info: PositionFeeInfo, owner: PublicKey): ClaimFeeTxParams {
  return {
    owner: owner.toBase58(),
    position: info.position.toBase58(),
    positionNftAccount: info.positionNftAccount.toBase58(),
    pool: info.pool.toBase58(),
    tokenAMint: info.tokenAMint.toBase58(),
    tokenBMint: info.tokenBMint.toBase58(),
    tokenAVault: info.tokenAVault.toBase58(),
    tokenBVault: info.tokenBVault.toBase58(),
    tokenAProgram: info.tokenAProgram.toBase58(),
    tokenBProgram: info.tokenBProgram.toBase58(),
  };
}
