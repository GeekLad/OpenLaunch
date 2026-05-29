import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/db/service';
import type { TokenCreateInput } from '@/lib/db/service';
import { DEFAULT_LAUNCH_PARAMS, DEFAULT_FEE_DURATION_MINUTES } from '@/config/defaults';
import { validateLaunchParams } from '@/lib/validation/launch';

/**
 * API Route: POST /api/tokens/create
 * Creates a new token record in the database
 * Only called after successful blockchain launch
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    console.log('[API] Creating token in database:', {
      symbol: data.symbol,
      mint: data.mintAddress,
      pool: data.poolAddress,
    });

    // Belt-and-suspenders: re-validate launch parameters server-side
    const validationInput = {
      totalSupply: Number(data.totalSupply),
      holdbackPercentage: Number(data.holdbackPercentage),
      priceRangeMin: Number(data.priceRangeMin ?? DEFAULT_LAUNCH_PARAMS.priceRangeMin),
      initialPrice: Number(data.initialPrice),
      priceRangeMax: Number(data.priceRangeMax ?? DEFAULT_LAUNCH_PARAMS.priceRangeMax),
      baseFeeBps: Number(data.fixedBaseFeeBps ?? DEFAULT_LAUNCH_PARAMS.baseFeeBps),
      feeSchedulerConfig: {
        mode: String(data.feeSchedulerMode ?? DEFAULT_LAUNCH_PARAMS.feeSchedulerMode),
        ...(data.feeSchedulerMode === 'market-cap-based' ? {
          startingMarketCap: Number(data.startingMarketCap ?? 0),
          endingMarketCap: Number(data.endingMarketCap ?? 0),
          feeMarketCapStartRate: Number(data.startRate ?? 0),
          feeMarketCapEndRate: Number(data.endRate ?? 0),
        } : data.feeSchedulerMode === 'time-based' ? {
          startRate: Number(data.startRate ?? 0),
          endRate: Number(data.endRate ?? 0),
          durationMinutes: Number(data.durationMinutes ?? 0),
        } : {
          baseFeeBps: Number(data.fixedBaseFeeBps ?? 0),
        }),
      } as unknown as import('@/types/fee').FeeSchedulerConfig,
      feeTokenMode: String(data.feeTokenMode ?? DEFAULT_LAUNCH_PARAMS.feeTokenMode),
      quoteTokenMint: String(data.quoteTokenMint ?? DEFAULT_LAUNCH_PARAMS.quoteTokenMint),
      ...(data.feeDecayPeriods !== undefined && data.feeDecayPeriods !== null
        ? { feeDecayPeriods: Number(data.feeDecayPeriods) }
        : {}),
    };
    const validationErrors = validateLaunchParams(validationInput);
    if (validationErrors.length > 0) {
      return NextResponse.json({ error: 'Validation failed', details: validationErrors }, { status: 400 });
    }

    // Validate required fields
    if (!data.mintAddress || !data.poolAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: mintAddress, poolAddress' },
        { status: 400 }
      );
    }

    if (!data.mintTxSignature || !data.metadataTxSignature || !data.poolTxSignature) {
      return NextResponse.json(
        { error: 'Missing transaction signatures' },
        { status: 400 }
      );
    }

    // Check if token already exists (prevent duplicates)
    const existing = await dbService.getToken(data.mintAddress);
    if (existing) {
      console.log('[API] Token already exists in database');
      return NextResponse.json({ token: existing, existed: true });
    }

    // Prepare token data for database
    const tokenData: TokenCreateInput = {
      // Token identifiers
      mintAddress: data.mintAddress,
      poolAddress: data.poolAddress,

      // Token metadata
      name: data.name,
      symbol: data.symbol,
      description: data.description || undefined,
      logoUrl: data.logoUrl,
      metadataUri: data.metadataUri || undefined,

      // Token configuration
      decimals: data.decimals,
      totalSupply: data.totalSupply,

      // Pool configuration
      initialPrice: data.initialPrice,
      quoteTokenMint: data.quoteTokenMint,
      poolLiquidityPercentage: data.poolLiquidityPercentage,
      priceRangeMin: data.priceRangeMin ?? DEFAULT_LAUNCH_PARAMS.priceRangeMin,
      priceRangeMax: data.priceRangeMax ?? DEFAULT_LAUNCH_PARAMS.priceRangeMax,

      // Fee configuration
      feeDecayDurationMinutes: data.feeDecayDurationMinutes ?? 0,
      feeDecayPeriods: data.feeDecayPeriods ?? 0,
      feeSchedulerMode: data.feeSchedulerMode ?? DEFAULT_LAUNCH_PARAMS.feeSchedulerMode,
      feeTokenMode: data.feeTokenMode ?? DEFAULT_LAUNCH_PARAMS.feeTokenMode,
      startingMarketCap: data.startingMarketCap ?? DEFAULT_LAUNCH_PARAMS.startingMarketCap.toString(),
      endingMarketCap: data.endingMarketCap ?? DEFAULT_LAUNCH_PARAMS.endingMarketCap.toString(),
      startRate: data.startRate ?? DEFAULT_LAUNCH_PARAMS.feeStartRate,
      endRate: data.endRate ?? DEFAULT_LAUNCH_PARAMS.feeEndRate,
      durationMinutes: data.durationMinutes ?? DEFAULT_FEE_DURATION_MINUTES,
      fixedBaseFeeBps: data.fixedBaseFeeBps ?? DEFAULT_LAUNCH_PARAMS.baseFeeBps,
      holdbackPercentage: data.holdbackPercentage ?? DEFAULT_LAUNCH_PARAMS.holdbackPercentage,

      // Launch info
      launchDate: data.launchDate ? new Date(data.launchDate) : new Date(),
      launchSlot: data.launchSlot || undefined,

      // Transaction signatures
      mintTxSignature: data.mintTxSignature,
      metadataTxSignature: data.metadataTxSignature,
      poolTxSignature: data.poolTxSignature,

      // Creator
      creatorWallet: data.creatorWallet,
    };

    // Create token in database
    const token = await dbService.createToken(tokenData);

    console.log('[API] ✓ Token created in database:', token.id);

    // Create initial fee update schedule
    // Determine initial update interval based on launch date
    const now = new Date();
    const launchDate = new Date(tokenData.launchDate);
    const hoursSinceLaunch = (now.getTime() - launchDate.getTime()) / (1000 * 60 * 60);

    let updateIntervalMinutes: number;
    if (hoursSinceLaunch < 1) {
      updateIntervalMinutes = 1; // First hour: every 1 minute
    } else if (hoursSinceLaunch < 24) {
      updateIntervalMinutes = 5; // 1-24 hours: every 5 minutes
    } else if (hoursSinceLaunch < 96) {
      updateIntervalMinutes = 10; // 24-96 hours: every 10 minutes
    } else {
      updateIntervalMinutes = 60; // 96+ hours: every 60 minutes
    }

    const nextUpdate = new Date(now.getTime() + updateIntervalMinutes * 60 * 1000);

    await dbService.upsertFeeUpdateSchedule(
      token.id,
      token.poolAddress,
      nextUpdate,
      updateIntervalMinutes
    );

    console.log('[API] ✓ Fee update schedule created');

    return NextResponse.json({ token, created: true });
  } catch (error) {
    console.error('[API] Error creating token:', error);

    return NextResponse.json(
      {
        error: 'Failed to create token',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
