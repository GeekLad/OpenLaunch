import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { dbService } from '@/lib/db/service';
import { getConnection } from '@/lib/solana/connection';
import {
  getCreatorPositionFees,
  toClaimFeeTxParams,
  getCurrentPoolPrice,
} from '@/lib/solana/poolUtils';
import { getSolPrice } from '@/lib/services/priceService';
import { USDC_MINT, getQuoteTokenDecimals } from '@/config/defaults';
import { QUOTE_TOKEN_MINT } from '@/config/public';

/**
 * API Route: GET /api/tokens/[mintAddress]/unclaimed-fees?owner=<base58>
 *
 * Returns the creator's unclaimed pool fees for the token's DAMMv2 position,
 * an estimated USD value, and the JSON-safe parameters the client needs to
 * build and sign the claim transaction with the wallet adapter.
 *
 * Query params:
 *   owner - The connected wallet address (must equal the token's creatorWallet
 *           for any position to be found).
 *
 * Response (200):
 *   {
 *     feePendingARaw: string,     // base token pending fees (lamports, BN.toString)
 *     feePendingBRaw: string,     // quote token pending fees (lamports, BN.toString)
 *     feePendingA: number,        // human-readable base token amount
 *     feePendingB: number,        // human-readable quote token amount
 *     estimatedUsd: number,       // USD value of claimable fees
 *     feeTokenMode: string,       // 'quoteOnly' | 'both'
 *     quoteTokenLabel: string,    // 'SOL' | 'USDC'
 *     claimParams: ClaimFeeTxParams | null,  // null when no claimable fees / no position
 *     solPrice: number | null,
 *   }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mintAddress: string }> }
) {
  try {
    const { mintAddress } = await params;
    const ownerParam = request.nextUrl.searchParams.get('owner');

    const token = await dbService.getToken(mintAddress);
    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    // Ownership gate: only the creator can have a position for this pool.
    const expectedOwner = ownerParam || token.creatorWallet;
    if (expectedOwner !== token.creatorWallet) {
      return NextResponse.json({
        feePendingARaw: '0',
        feePendingBRaw: '0',
        feePendingA: 0,
        feePendingB: 0,
        estimatedUsd: 0,
        feeTokenMode: token.feeTokenMode,
        quoteTokenLabel: token.quoteTokenMint === QUOTE_TOKEN_MINT ? 'SOL' : 'USDC',
        claimParams: null,
        solPrice: null,
        notOwner: true,
      });
    }

    const connection = getConnection();
    const ownerPubkey = new PublicKey(token.creatorWallet);

    const info = await getCreatorPositionFees(
      connection,
      new PublicKey(token.poolAddress),
      ownerPubkey
    );

    const quoteTokenLabel =
      token.quoteTokenMint === QUOTE_TOKEN_MINT ? 'SOL' : 'USDC';

    if (!info) {
      return NextResponse.json({
        feePendingARaw: '0',
        feePendingBRaw: '0',
        feePendingA: 0,
        feePendingB: 0,
        estimatedUsd: 0,
        feeTokenMode: token.feeTokenMode,
        quoteTokenLabel,
        claimParams: null,
        solPrice: null,
      });
    }

    const quoteDecimals = getQuoteTokenDecimals(token.quoteTokenMint);
    const baseDecimals = token.decimals;

    const feePendingA = Number(info.feePendingA) / Math.pow(10, baseDecimals);
    const feePendingB = Number(info.feePendingB) / Math.pow(10, quoteDecimals);

    // ---- USD estimate -------------------------------------------------------
    // quoteOnly: only token B fees accrue (CollectFeeMode.OnlyB). For SOL quote
    //   use the SOL/USD price; for USDC quote use 1:1.
    // both: token A fees also accrue. Estimate the base token price from the
    //   pool's current sqrt price (token A priced in token B), then convert.
    let estimatedUsd = 0;
    let solPrice: number | null = null;

    const quoteIsSol = token.quoteTokenMint === QUOTE_TOKEN_MINT;
    const quoteIsUsdc = token.quoteTokenMint === USDC_MINT;

    if (quoteIsSol) {
      solPrice = await getSolPrice();
      const quoteUsd = solPrice ?? 0;
      estimatedUsd += feePendingB * quoteUsd;
    } else if (quoteIsUsdc) {
      estimatedUsd += feePendingB; // 1:1
    }

    if (token.feeTokenMode === 'both' && feePendingA > 0) {
      // Base token price in quote-token units from the pool's sqrt price.
      const basePriceInQuote = await getCurrentPoolPrice(
        connection,
        new PublicKey(token.poolAddress),
        baseDecimals,
        quoteDecimals
      );
      if (basePriceInQuote && basePriceInQuote > 0) {
        const baseValueInQuote = feePendingA * basePriceInQuote;
        if (quoteIsSol) {
          estimatedUsd += baseValueInQuote * (solPrice ?? 0);
        } else if (quoteIsUsdc) {
          estimatedUsd += baseValueInQuote;
        }
      }
    }

    const hasClaimable =
      !info.feePendingA.isZero() || !info.feePendingB.isZero();

    return NextResponse.json({
      feePendingARaw: info.feePendingA.toString(),
      feePendingBRaw: info.feePendingB.toString(),
      feePendingA,
      feePendingB,
      estimatedUsd,
      feeTokenMode: token.feeTokenMode,
      quoteTokenLabel,
      claimParams: hasClaimable ? toClaimFeeTxParams(info, ownerPubkey) : null,
      solPrice,
    });
  } catch (error) {
    console.error('[API] Error fetching unclaimed fees:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch unclaimed fees',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}