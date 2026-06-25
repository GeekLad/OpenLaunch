import { NextRequest, NextResponse } from "next/server";
import { getPoolMetrics } from "@/lib/meteora/client";
import * as dbService from "@/lib/db/service";

/**
 * USD microunits conversion factor (D-02). All Meteora API monetary values are
 * USD floats; storage is integer microunits (6 decimals) as string-encoded integers.
 */
const USD_MICROUNITS = 1_000_000;

/**
 * API endpoint to update pool fees from Meteora API
 * POST /api/tokens/update-fees
 * Body: { tokenId?: number, poolAddress?: string }
 *
 * Updates cumulative fees for a specific token or all tokens.
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

      // Convert API USD floats → USD microunits (integer strings) for storage (D-02).
      const cumulativeFeesMicro = Math.floor(
        (metrics.cumulative_metrics?.fees ?? 0) * USD_MICROUNITS
      );

      // Update cumulative fees snapshot
      await dbService.updateCumulativeFeesSnapshot(
        tokenId,
        cumulativeFeesMicro.toString()
      );

      // Save to pool stats history
      await dbService.createPoolStatsSnapshot(tokenId, token.poolAddress, {
        totalFeesGenerated: cumulativeFeesMicro.toString(),
        fees24h: Math.floor(metrics.fees["24h"] * USD_MICROUNITS).toString(),
        volume24h: Math.floor(metrics.volume["24h"] * USD_MICROUNITS).toString(),
        currentLiquidity: Math.floor(metrics.tvl * USD_MICROUNITS).toString(),
        apr: metrics.farm_apr ?? null,
      });

      return NextResponse.json({
        success: true,
        tokenId,
        cumulativeFees: cumulativeFeesMicro.toString(),
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

      // Convert API USD floats → USD microunits (integer strings) for storage (D-02).
      const cumulativeFeesMicro = Math.floor(
        (metrics.cumulative_metrics?.fees ?? 0) * USD_MICROUNITS
      );

      // Update cumulative fees snapshot
      await dbService.updateCumulativeFeesSnapshot(
        token.id.toString(),
        cumulativeFeesMicro.toString()
      );

      // Save to pool stats history
      await dbService.createPoolStatsSnapshot(token.id, poolAddress, {
        totalFeesGenerated: cumulativeFeesMicro.toString(),
        fees24h: Math.floor(metrics.fees["24h"] * USD_MICROUNITS).toString(),
        volume24h: Math.floor(metrics.volume["24h"] * USD_MICROUNITS).toString(),
        currentLiquidity: Math.floor(metrics.tvl * USD_MICROUNITS).toString(),
        apr: metrics.farm_apr ?? null,
      });

      return NextResponse.json({
        success: true,
        tokenId: token.id,
        cumulativeFees: cumulativeFeesMicro.toString(),
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
            // Convert API USD floats → USD microunits (integer strings) for storage (D-02).
            const cumulativeFeesMicro = Math.floor(
              (metrics.cumulative_metrics?.fees ?? 0) * USD_MICROUNITS
            );

            await dbService.updateCumulativeFeesSnapshot(
              token.id.toString(),
              cumulativeFeesMicro.toString()
            );

            await dbService.createPoolStatsSnapshot(token.id, token.poolAddress, {
              totalFeesGenerated: cumulativeFeesMicro.toString(),
              fees24h: Math.floor(metrics.fees["24h"] * USD_MICROUNITS).toString(),
              volume24h: Math.floor(metrics.volume["24h"] * USD_MICROUNITS).toString(),
              currentLiquidity: Math.floor(metrics.tvl * USD_MICROUNITS).toString(),
              apr: metrics.farm_apr ?? null,
            });

            results.push({
              tokenId: token.id,
              success: true,
              cumulativeFees: cumulativeFeesMicro.toString(),
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