"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Token } from "@/lib/db/schema";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/ui/countdown";
import { getSolscanTxUrl } from "@/lib/utils";

interface TokenDetailPageProps {
  params: Promise<{
    mintAddress: string;
  }>;
}

export default function TokenDetailPage({ params }: TokenDetailPageProps) {
  const resolvedParams = use(params);
  const [token, setToken] = useState<Token | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasLaunched, setHasLaunched] = useState(false);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    async function fetchToken() {
      try {
        const response = await fetch(`/api/tokens/${resolvedParams.mintAddress}`);

        if (!response.ok) {
          throw new Error("Token not found");
        }

        const data = await response.json();
        setToken(data.token);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load token");
      } finally {
        setLoading(false);
      }
    }

    fetchToken();
  }, [resolvedParams.mintAddress]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center">Loading token details...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <Card className="border-red-500 bg-red-50 dark:bg-red-950">
            <CardContent className="pt-6">
              <p className="text-center text-red-600 dark:text-red-400">
                {error || "Token not found"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const launchDate = new Date(token.launchDate);
  const isUpcoming = !hasLaunched && launchDate > new Date();

  const handleCountdownComplete = () => {
    setHasLaunched(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
          {/* Launch Status */}
          {isUpcoming ? (
            <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950">
              <CardHeader>
                <CardTitle className="text-blue-600 dark:text-blue-400">
                  🚀 Upcoming Launch
                </CardTitle>
                <CardDescription className="text-blue-600 dark:text-blue-300">
                  Launches on {launchDate.toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Countdown targetDate={launchDate} onComplete={handleCountdownComplete} />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-green-500 bg-green-50 dark:bg-green-950">
              <CardHeader>
                <CardTitle className="text-green-600 dark:text-green-400">
                  ✓ Launched
                </CardTitle>
                <CardDescription className="text-green-600 dark:text-green-300">
                  Launched on {launchDate.toLocaleString()}
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* Token Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                {token.logoUrl && (
                  <div className="flex-shrink-0">
                    <Image
                      src={token.logoUrl}
                      alt={token.symbol}
                      width={80}
                      height={80}
                      className="rounded-lg object-cover"
                      unoptimized={token.logoUrl.startsWith('http')}
                    />
                  </div>
                )}
                <div className="flex-1 space-y-3">
                  <div>
                    <CardTitle className="text-4xl font-bold">
                      {token.symbol}
                    </CardTitle>
                    <p className="mt-1 text-lg text-muted-foreground">
                      {token.name}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Token Address
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono bg-secondary px-2 py-1 rounded">
                        {token.mintAddress}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(token.mintAddress)}
                        className="h-7 px-2"
                      >
                        {copied ? (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase">
                        Launch Pool
                      </p>
                      <span className="inline-flex items-center rounded-md bg-purple-50 dark:bg-purple-950 px-2 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        Meteora DAMMv2
                      </span>
                    </div>
                    <a
                      href={`https://app.meteora.ag/dammv2/${token.poolAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline font-mono flex items-center gap-1"
                    >
                      <span className="truncate">{token.poolAddress}</span>
                      <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Transaction History */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase">Create token</p>
                <a
                  href={getSolscanTxUrl(token.mintTxSignature)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm font-mono flex items-start gap-1"
                >
                  <span className="break-all">{token.mintTxSignature}</span>
                  <svg className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase">Configure and mint token</p>
                <a
                  href={getSolscanTxUrl(token.metadataTxSignature)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm font-mono flex items-start gap-1"
                >
                  <span className="break-all">{token.metadataTxSignature}</span>
                  <svg className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase">Create launch pool</p>
                <a
                  href={getSolscanTxUrl(token.poolTxSignature)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm font-mono flex items-start gap-1"
                >
                  <span className="break-all">{token.poolTxSignature}</span>
                  <svg className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Placeholder for Phase 6 Features */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Coming Soon</CardTitle>
              <CardDescription>
                Live trading statistics and charts
              </CardDescription>
            </CardHeader>
          </Card>
      </div>
    </div>
  );
}
