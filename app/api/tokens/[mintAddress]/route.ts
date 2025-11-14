import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/db/service';

/**
 * API Route: GET /api/tokens/[mintAddress]
 * Fetches a specific token by mint address
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mintAddress: string }> }
) {
  try {
    const { mintAddress } = await params;

    console.log('[API] Fetching token:', mintAddress);

    const token = await dbService.getToken(mintAddress);

    if (!token) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    // Get latest pool stats if available
    let poolStats = null;
    try {
      poolStats = await dbService.getLatestPoolStats(token.poolAddress);
    } catch (error) {
      console.warn('[API] Failed to fetch pool stats:', error);
      // Continue without pool stats - not critical
    }

    return NextResponse.json({
      token,
      poolStats,
    });
  } catch (error) {
    console.error('[API] Error fetching token:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch token',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
