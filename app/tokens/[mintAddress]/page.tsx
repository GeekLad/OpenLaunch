"use client";

import { use, useEffect, useState } from "react";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import type { Token } from "@/lib/db/schema";
import { Copy, Check, Percent, ExternalLink, SlidersHorizontal, Clock } from "lucide-react";
import { Countdown } from "@/components/ui/countdown";
import { getSolscanTxUrl } from "@/lib/utils";
import { ExternalLinks } from "@/components/token-detail/ExternalLinks";

interface TokenDetailPageProps {
  params: Promise<{
    mintAddress: string;
  }>;
}

function formatNumber(num: number | string | null): string {
  if (num === null || num === undefined) return "-";
  const n = typeof num === "string" ? parseFloat(num) : num;
  if (Number.isNaN(n)) return String(num);
  return new Intl.NumberFormat().format(n);
}

function getFeeSchedulerLabel(mode: string | null): string {
  if (!mode) return "Unknown";
  switch (mode) {
    case "market-cap-based": return "Market cap based";
    case "time-based": return "Time-based";
    case "fixed": return "Fixed fee";
    default: return mode;
  }
}

function getFeeTokenModeLabel(mode: string | null): string {
  if (!mode) return "Unknown";
  switch (mode) {
    case "quoteOnly": return "Quote only";
    case "both": return "Both quote + base token";
    default: return mode;
  }
}

export default function TokenDetailPage({ params }: TokenDetailPageProps) {
  const resolvedParams = use(params);
  const [token, setToken] = useState<Token | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [hasLaunched, setHasLaunched] = useState(false);
  const [truncMintAddress, setTruncMintAddress] = useState("");
  const [truncPoolAddress, setTruncPoolAddress] = useState("");

  function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
      const check = () => setIsMobile(window.innerWidth < 768);
      check();
      window.addEventListener("resize", check);
      return () => window.removeEventListener("resize", check);
    }, []);
    return isMobile;
  }

  const isMobile = useIsMobile();

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const truncString = (address: string, offset = 5) => {
    return address.slice(0, offset) + "..." + address.slice(-offset);
  };

  useEffect(() => {
    async function fetchToken() {
      try {
        const response = await fetch(`/api/tokens/${resolvedParams.mintAddress}`);
        if (!response.ok) throw new Error("Token not found");
        const data = await response.json();
        setToken(data.token);
        setTruncMintAddress(truncString(data.token.mintAddress));
        setTruncPoolAddress(truncString(data.token.poolAddress));
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
              <p className="text-center text-red-600 dark:text-red-400">{error || "Token not found"}</p>
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

  const quoteTokenLabel = token.quoteTokenMint === "So11111111111111111111111111111111111111112" ? "SOL" : "USDC";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Launch Status */}
        {isUpcoming ? (
          <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950">
            <CardContent className="pt-6">
              <h2 className="text-blue-600 dark:text-blue-400 font-bold text-lg">🚀 Upcoming Launch</h2>
              <p className="text-blue-600 dark:text-blue-300 text-sm mt-1">Launches on {launchDate.toLocaleString()}</p>
              <div className="mt-4">
                <Countdown targetDate={launchDate} onComplete={handleCountdownComplete} />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-green-500 bg-green-50 dark:bg-green-950">
            <CardContent className="pt-6">
              <h2 className="text-green-600 dark:text-green-400 font-bold text-lg">✓ Launched</h2>
              <p className="text-green-600 dark:text-green-300 text-sm mt-1">Launched on {launchDate.toLocaleString()}</p>
            </CardContent>
          </Card>
        )}

        {/* Token Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                {token.logoUrl && (
                  <div className="flex-shrink-0">
                    <Image
                      src={token.logoUrl}
                      alt={token.symbol}
                      width={64}
                      height={64}
                      className="rounded-xl object-cover"
                      unoptimized={token.logoUrl.startsWith("http")}
                    />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold">{token.symbol}</h1>
                  <p className="text-sm text-muted-foreground">{token.name}</p>
                  <span className="inline-flex items-center rounded-full bg-purple-50 dark:bg-purple-950 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 mt-2">
                    Meteora DAMMv2
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total supply</p>
                <p className="text-lg font-semibold">{formatNumber(token.totalSupply)}</p>
                <p className="text-sm text-muted-foreground mt-1">Decimals</p>
                <p className="text-lg font-semibold">{token.decimals}</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Token address</p>
                <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
                  <code className="text-sm font-mono flex-1 break-all">{isMobile ? truncMintAddress : token.mintAddress}</code>
                  <button
                    onClick={() => copyToClipboard(token.mintAddress, "mint")}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copiedField === "mint" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Launch pool</p>
                <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
                  <a
                    href={`https://app.meteora.ag/dammv2/${token.poolAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-mono text-primary hover:underline flex-1 break-all"
                  >
                    {isMobile ? truncPoolAddress : token.poolAddress}
                  </a>
                  <a
                    href={`https://app.meteora.ag/dammv2/${token.poolAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Creator</p>
                <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
                  <code className="text-sm font-mono flex-1 break-all">{isMobile ? truncString(token.creatorWallet) : token.creatorWallet}</code>
                  <button
                    onClick={() => copyToClipboard(token.creatorWallet, "creator")}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copiedField === "creator" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trading & Analytics */}
        <ExternalLinks mintAddress={token.mintAddress} poolAddress={token.poolAddress} />

        {/* Pool Config & Fee Schedule */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Pool config
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-sm text-muted-foreground">Quote token</span>
                  <span className="text-sm font-medium">{quoteTokenLabel}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-sm text-muted-foreground">Locked liquidity</span>
                  <span className="inline-flex items-center rounded-full bg-green-50 dark:bg-green-950 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                    {Number(token.poolLiquidityPercentage) * 100}%
                  </span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-sm text-muted-foreground">Initial market cap</span>
                  <span className="text-sm font-medium">{formatNumber(token.initialMarketCap)} {quoteTokenLabel}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Max market cap</span>
                  <span className="text-sm font-medium">{formatNumber(token.marketCapRangeMax)} {quoteTokenLabel}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Fee schedule
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-sm text-muted-foreground">Mode</span>
                  <span className="text-sm font-medium">{getFeeSchedulerLabel(token.feeSchedulerMode)}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-sm text-muted-foreground">Fee token</span>
                  <span className="text-sm font-medium">{getFeeTokenModeLabel(token.feeTokenMode)}</span>
                </div>
                {token.feeSchedulerMode === "market-cap-based" && (
                  <>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-sm text-muted-foreground">Start ({formatNumber(token.startingMarketCap)} {quoteTokenLabel})</span>
                      <span className="text-sm font-medium">{token.startRatePercent}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">End ({formatNumber(token.endingMarketCap)} {quoteTokenLabel})</span>
                      <span className="text-sm font-medium">{token.endRatePercent}%</span>
                    </div>
                  </>
                )}
                {token.feeSchedulerMode === "time-based" && (
                  <>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-sm text-muted-foreground">Start rate</span>
                      <span className="text-sm font-medium">{token.startRatePercent}%</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-sm text-muted-foreground">End rate</span>
                      <span className="text-sm font-medium">{token.endRatePercent}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Duration</span>
                      <span className="text-sm font-medium">{Math.floor(Number(token.durationMinutes) / 60)}h {Number(token.durationMinutes) % 60}m</span>
                    </div>
                  </>
                )}
                {token.feeSchedulerMode === "fixed" && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Base fee</span>
                    <span className="text-sm font-medium">{token.fixedBaseFeePercent}%</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Transaction history
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Create token</p>
                <a
                  href={getSolscanTxUrl(token.mintTxSignature)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm font-mono flex items-start gap-1"
                >
                  <span className="break-all">{isMobile ? truncString(token.mintTxSignature) : token.mintTxSignature}</span>
                  <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                </a>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Configure & mint token</p>
                <a
                  href={getSolscanTxUrl(token.metadataTxSignature)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm font-mono flex items-start gap-1"
                >
                  <span className="break-all">{isMobile ? truncString(token.metadataTxSignature) : token.metadataTxSignature}</span>
                  <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                </a>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Create launch pool</p>
                <a
                  href={getSolscanTxUrl(token.poolTxSignature)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm font-mono flex items-start gap-1"
                >
                  <span className="break-all">{isMobile ? truncString(token.poolTxSignature) : token.poolTxSignature}</span>
                  <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
