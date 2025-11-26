import { NextRequest, NextResponse } from "next/server";
import * as dbService from "@/lib/db/service";
import { ENV } from "@/config/environment";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sortBy = searchParams.get("sortBy") || "date"; // 'date' or 'fees'
    const sortOrder = searchParams.get("sortOrder") || "desc"; // 'asc' or 'desc'
    const statusFilter = searchParams.get("status") || "all"; // 'all', 'live', or 'upcoming'

    // Validate parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Invalid pagination parameters" },
        { status: 400 }
      );
    }

    const validSortOptions = ENV.ENABLE_FEES_DISPLAY ? ["date", "fees"] : ["date"];
    if (!validSortOptions.includes(sortBy)) {
      return NextResponse.json(
        { error: `Invalid sortBy parameter. Must be ${validSortOptions.join(" or ")}` },
        { status: 400 }
      );
    }

    if (!["asc", "desc"].includes(sortOrder)) {
      return NextResponse.json(
        { error: "Invalid sortOrder parameter. Must be 'asc' or 'desc'" },
        { status: 400 }
      );
    }

    if (!["all", "live", "upcoming"].includes(statusFilter)) {
      return NextResponse.json(
        { error: "Invalid status parameter. Must be 'all', 'live', or 'upcoming'" },
        { status: 400 }
      );
    }

    // Calculate offset
    const offset = (page - 1) * limit;

    // Get tokens based on sort criteria and status filter
    let tokens;
    if (sortBy === "fees") {
      tokens = await dbService.getTokensByFees(limit, offset, sortOrder as "asc" | "desc", statusFilter as "all" | "live" | "upcoming");
    } else {
      tokens = await dbService.getTokensByDate(limit, offset, sortOrder as "asc" | "desc", statusFilter as "all" | "live" | "upcoming");
    }

    // Get total count for pagination metadata with filter
    const totalCount = await dbService.getTotalTokenCount(statusFilter as "all" | "live" | "upcoming");
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
      filter: {
        status: statusFilter,
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
