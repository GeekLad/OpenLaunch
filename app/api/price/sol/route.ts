import { NextResponse } from "next/server";
import { getSolPrice } from "@/lib/services/priceService";

/**
 * API Route: GET /api/price/sol
 *
 * Returns the current SOL/USD price. The upstream Jupiter Price API and its
 * API key are never exposed to the caller — only the numeric price is
 * returned in the response body.
 */
export async function GET() {
  try {
    const price = await getSolPrice();

    if (price == null) {
      return NextResponse.json({ price: null }, { status: 200 });
    }

    return NextResponse.json({ price }, { status: 200 });
  } catch (error) {
    console.error("[API] Error fetching SOL price:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch SOL price",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}