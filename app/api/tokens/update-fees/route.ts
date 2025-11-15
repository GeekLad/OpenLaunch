import { NextRequest, NextResponse } from "next/server";
import { getPoolMetrics } from "@/lib/meteora/client";
import * as dbService from "@/lib/db/service";

/**
 * API endpoint to update pool fees from Meteora API
 * POST /api/tokens/update-fees
 * Body: { tokenId?: number, poolAddress?: string }
 *
 * Updates cumulative fees for a specific token or all tokens
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokenId, poolAddress } = body;

    if (tokenId) {
      // Update specific token by ID
      const token = await dbService.getTokenById(tokenId);
      if (!token) {
        return NextResponse.json(
          { error: "Token not found" },
          { status: 404 }
        );
      }

      const metrics = await getPoolMetrics(token.poolAddress);
      if (!metrics) {
        return NextResponse.json(
          { error: "Failed to fetch pool metrics from Meteora API" },
          { status: 500 }
        );
      }

      // Calculate cumulative fees from 30-day LP fees (in lamports)
      const cumulativeFeesLamports = Math.floor(metrics.lp_fee30d * 1e9);

      // Update cumulative fees snapshot
      await dbService.updateCumulativeFeesSnapshot(
        tokenId,
        cumulativeFeesLamports.toString()
      );

      // Save to pool stats history
      await dbService.createPoolStatsSnapshot({
        tokenId: tokenId,
        poolAddress: token.poolAddress,
        totalFeesGenerated: cumulativeFeesLamports.toString(),
        tradingVolume24h: Math.floor(metrics.volume24h * 1e9).toString(),
        totalValueLocked: Math.floor(metrics.tvl * 1e9).toString(),
        currentPrice: 0,
      });

      return NextResponse.json({
        success: true,
        tokenId,
        cumulativeFees: cumulativeFeesLamports.toString(),
        updatedAt: new Date().toISOString(),
      });
    } else if (poolAddress) {
      // Update specific token by pool address
      const token = await dbService.getTokenByPoolAddress(poolAddress);
      if (!token) {
        return NextResponse.json(
          { error: "Token not found" },
          { status: 404 }
        );
      }

      const metrics = await getPoolMetrics(poolAddress);
      if (!metrics) {
        return NextResponse.json(
          { error: "Failed to fetch pool metrics from Meteora API" },
          { status: 500 }
        );
      }

      // Calculate cumulative fees from 30-day LP fees (in lamports)
      const cumulativeFeesLamports = Math.floor(metrics.lp_fee30d * 1e9);

      // Update cumulative fees snapshot
      await dbService.updateCumulativeFeesSnapshot(
        token.id,
        cumulativeFeesLamports.toString()
      );

      // Save to pool stats history
      await dbService.createPoolStatsSnapshot({
        tokenId: token.id,
        poolAddress: poolAddress,
        totalFeesGenerated: cumulativeFeesLamports.toString(),
        tradingVolume24h: Math.floor(metrics.volume24h * 1e9).toString(),
        totalValueLocked: Math.floor(metrics.tvl * 1e9).toString(),
        currentPrice: 0,
      });

      return NextResponse.json({
        success: true,
        tokenId: token.id,
        cumulativeFees: cumulativeFeesLamports.toString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Update all tokens
      const tokens = await dbService.getAllTokens();
      const results = [];

      for (const token of tokens) {
        try {
          const metrics = await getPoolMetrics(token.poolAddress);
          if (metrics) {
            // Calculate cumulative fees from 30-day LP fees (in lamports)
            const cumulativeFeesLamports = Math.floor(metrics.lp_fee30d * 1e9);

            await dbService.updateCumulativeFeesSnapshot(
              token.id,
              cumulativeFeesLamports.toString()
            );

            await dbService.createPoolStatsSnapshot({
              tokenId: token.id,
              poolAddress: token.poolAddress,
              totalFeesGenerated: cumulativeFeesLamports.toString(),
              tradingVolume24h: Math.floor(metrics.volume24h * 1e9).toString(),
              totalValueLocked: Math.floor(metrics.tvl * 1e9).toString(),
              currentPrice: 0,
            });

            results.push({
              tokenId: token.id,
              success: true,
              cumulativeFees: cumulativeFeesLamports.toString(),
            });
          } else {
            results.push({
              tokenId: token.id,
              success: false,
              error: "Failed to fetch metrics",
            });
          }
        } catch (error) {
          console.error(`Error updating token ${token.id}:`, error);
          results.push({
            tokenId: token.id,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return NextResponse.json({
        success: true,
        totalTokens: tokens.length,
        results,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error updating fees:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update fees" },
      { status: 500 }
    );
  }
}
