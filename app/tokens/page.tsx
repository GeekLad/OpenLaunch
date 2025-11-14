"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TokenCard } from "@/components/tokens/TokenCard";
import type { Token } from "@/lib/db/schema";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationData {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasMore: boolean;
}

interface SortData {
  sortBy: string;
  sortOrder: string;
}

export default function TokensPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
    hasMore: false,
  });
  const [sort, setSort] = useState<SortData>({
    sortBy: "date",
    sortOrder: "desc",
  });

  const fetchTokens = async (page: number, sortBy: string, sortOrder: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/tokens/list?page=${page}&limit=20&sortBy=${sortBy}&sortOrder=${sortOrder}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch tokens");
      }

      const data = await response.json();
      setTokens(data.tokens);
      setPagination(data.pagination);
      setSort(data.sort);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens(pagination.page, sort.sortBy, sort.sortOrder);
  }, []);

  const handleSortChange = (newSortBy: string) => {
    const newSortOrder = sort.sortBy === newSortBy && sort.sortOrder === "desc" ? "asc" : "desc";
    fetchTokens(1, newSortBy, newSortOrder);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    fetchTokens(newPage, sort.sortBy, sort.sortOrder);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold">Token Launches</h1>
              <p className="mt-2 text-muted-foreground">
                {pagination.totalCount > 0
                  ? `${pagination.totalCount} token${pagination.totalCount === 1 ? "" : "s"} launched`
                  : "No tokens launched yet"}
              </p>
            </div>

            <Link href="/launch">
              <Button size="lg">Launch Token</Button>
            </Link>
          </div>

          {/* Sort Controls */}
          <div className="flex gap-2">
            <Button
              variant={sort.sortBy === "date" ? "default" : "outline"}
              onClick={() => handleSortChange("date")}
            >
              Sort by Date
              {sort.sortBy === "date" && (
                <span className="ml-1">{sort.sortOrder === "desc" ? "↓" : "↑"}</span>
              )}
            </Button>
            <Button
              variant={sort.sortBy === "fees" ? "default" : "outline"}
              onClick={() => handleSortChange("fees")}
            >
              Sort by Fees
              {sort.sortBy === "fees" && (
                <span className="ml-1">{sort.sortOrder === "desc" ? "↓" : "↑"}</span>
              )}
            </Button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="h-64 animate-pulse">
                  <CardContent className="h-full bg-secondary/50" />
                </Card>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <Card className="border-red-500 bg-red-50 dark:bg-red-950">
              <CardContent className="pt-6">
                <p className="text-center text-red-600 dark:text-red-400">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!loading && !error && tokens.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">No tokens found</p>
                <Link href="/launch">
                  <Button>Launch Your First Token</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Token Grid */}
          {!loading && !error && tokens.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tokens.map((token) => (
                  <TokenCard key={token.id} token={token} />
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>

                  <div className="flex items-center gap-2">
                    {[...Array(pagination.totalPages)].map((_, i) => {
                      const page = i + 1;
                      // Show first page, last page, current page, and pages around current
                      const showPage =
                        page === 1 ||
                        page === pagination.totalPages ||
                        Math.abs(page - pagination.page) <= 1;

                      if (!showPage && page === 2) {
                        return <span key={page} className="px-2">...</span>;
                      }
                      if (!showPage && page === pagination.totalPages - 1) {
                        return <span key={page} className="px-2">...</span>;
                      }
                      if (!showPage) {
                        return null;
                      }

                      return (
                        <Button
                          key={page}
                          variant={page === pagination.page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.hasMore}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
      </div>
    </div>
  );
}
