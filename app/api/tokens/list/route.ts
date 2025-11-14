import { NextRequest, NextResponse } from "next/server";
import * as dbService from "@/lib/db/service";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sortBy = searchParams.get("sortBy") || "date"; // 'date' or 'fees'
    const sortOrder = searchParams.get("sortOrder") || "desc"; // 'asc' or 'desc'

    // Validate parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Invalid pagination parameters" },
        { status: 400 }
      );
    }

    if (!["date", "fees"].includes(sortBy)) {
      return NextResponse.json(
        { error: "Invalid sortBy parameter. Must be 'date' or 'fees'" },
        { status: 400 }
      );
    }

    if (!["asc", "desc"].includes(sortOrder)) {
      return NextResponse.json(
        { error: "Invalid sortOrder parameter. Must be 'asc' or 'desc'" },
        { status: 400 }
      );
    }

    // Calculate offset
    const offset = (page - 1) * limit;

    // Get tokens based on sort criteria
    let tokens;
    if (sortBy === "fees") {
      tokens = await dbService.getTokensByFees(limit, offset, sortOrder as "asc" | "desc");
    } else {
      tokens = await dbService.getTokensByDate(limit, offset, sortOrder as "asc" | "desc");
    }

    // Get total count for pagination metadata
    const totalCount = await dbService.getTotalTokenCount();
    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = page < totalPages;

    return NextResponse.json({
      tokens,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore,
      },
      sort: {
        sortBy,
        sortOrder,
      },
    });
  } catch (error) {
    console.error("[API] Error listing tokens:", error);
    return NextResponse.json(
      { error: "Failed to fetch tokens" },
      { status: 500 }
    );
  }
}
