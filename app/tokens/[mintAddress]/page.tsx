"use client";

import { use, useEffect, useState } from "react";

import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Token } from "@/lib/db/schema";
import { Copy, Check, FileText, Globe, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/ui/countdown";
import { getSolscanTxUrl } from "@/lib/utils";
import { ExternalLinks } from "@/components/token-detail/ExternalLinks";

interface TokenDetailPageProps {
  params: Promise<{
    mintAddress: string;
  }>;
}

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
  badge,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="mt-4">
      <button
        className="w-full px-6 py-4 flex items-center justify-between text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">{title}</CardTitle>
          {badge}
        </div>
        <span className="text-muted-foreground text-sm">{open ? '▲' : '▼'}</span>
      </button>
      {open && <CardContent>{children}</CardContent>}
    </Card>
  );
}

function getFeeSchedulerLabel(mode: string | null): string {
  if (!mode) return 'Unknown';
  switch (mode) {
    case 'market-cap-based': return 'Market-Cap Based';
    case 'time-based': return 'Time-Based';
    case 'fixed': return 'Fixed Fee';
    default: return mode;
  }
}

function getFeeTokenModeLabel(mode: string | null): string {
  if (!mode) return 'Unknown';
  switch (mode) {
    case 'quoteOnly': return 'Quote Token Only';
    case 'both': return 'Both Quote + Base Token';
    default: return mode;
  }
}

function formatNumber(num: number | string | null): string {
  if (num === null || num === undefined) return '-';
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (Number.isNaN(n)) return String(num);
  return new Intl.NumberFormat().format(n);
}

export default function TokenDetailPage({ params }: TokenDetailPageProps) {
  const resolvedParams = use(params);
  const [token, setToken] = useState<Token | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncString = (address: string, offset=5) => {
    return address.slice(0, offset) + "..." + address.slice(-offset);
  }

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

  const [socials, setSocials] = useState<{ website?: string; twitter?: string; telegram?: string; discord?: string }>({});

  useEffect(() => {
    async function fetchSocials() {
      if (!token?.metadataUri) return;
      try {
        const response = await fetch(token?.metadataUri ?? "");
        if (!response.ok) return;
        const metadata = await response.json();
        const s: typeof socials = {};
        if (metadata.external_url) s.website = metadata.external_url;
        if (metadata.attributes && Array.isArray(metadata.attributes)) {
          metadata.attributes.forEach((attr: { trait_type: string; value: string }) => {
            if (attr.trait_type === "Twitter") s.twitter = attr.value;
            else if (attr.trait_type === "Telegram") s.telegram = attr.value;
            else if (attr.trait_type === "Discord") s.discord = attr.value;
          });
        }
        setSocials(s);
      } catch (error) {
        console.error("Failed to fetch metadata:", error);
      }
    }
    fetchSocials();
  }, [token?.metadataUri]);

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

  const handleCountdownComplete = () => { setHasLaunched(true); };

  const lockedLiquidity = Number(token.lockedLiquidityPercentage);
  const lowLiquidityWarning = lockedLiquidity < 90;

  const hasSocials = Object.values(socials).some(Boolean);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Launch Status */}
        {isUpcoming ? (
          <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950">
            <CardHeader>
              <CardTitle className="text-blue-600 dark:text-blue-400">🚀 Upcoming Launch</CardTitle>
              <CardDescription className="text-blue-600 dark:text-blue-300">Launches on {launchDate.toLocaleString()}</CardDescription>
            </CardHeader>
            <CardContent>
              <Countdown targetDate={launchDate} onComplete={handleCountdownComplete} />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-green-500 bg-green-50 dark:bg-green-950">
            <CardHeader>
              <CardTitle className="text-green-600 dark:text-green-400">✓ Launched</CardTitle>
              <CardDescription className="text-green-600 dark:text-green-300">Launched on {launchDate.toLocaleString()}</CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Token Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              {token.logoUrl && (
                <div className="flex-shrink-0">
                  <Image src={token.logoUrl} alt={token.symbol} width={80} height={80} className="rounded-lg object-cover" unoptimized={token.logoUrl.startsWith('http')} />
                </div>
              )}
              <div className="flex-1 space-y-3">
                <div>
                  <CardTitle className="text-4xl font-bold">{token.symbol}</CardTitle>
                  <p className="mt-1 text-lg text-muted-foreground">{token.name}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Token Address</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono bg-secondary px-2 py-1 rounded">{isMobile ? truncMintAddress : token.mintAddress}</code>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(token.mintAddress)} className="h-7 px-2">
                      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Launch Pool</p>
                    <span className="inline-flex items-center rounded-md bg-purple-50 dark:bg-purple-950 px-2 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">Meteora DAMMv2</span>
                  </div>
                  <a href={`https://app.meteora.ag/dammv2/${token.poolAddress}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline font-mono flex items-center gap-1">
                    <span className="truncate">{isMobile ? truncPoolAddress : token.poolAddress}</span>
                    <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Token Configuration</p>
                  <div className="text-sm space-y-1">
                    <p><strong>Decimals:</strong> {token.decimals}</p>
                    <p><strong>Total Supply:</strong> {formatNumber(token.totalSupply)}</p>
                    <div className="flex items-center gap-2">
                      <p><strong>Creator:</strong> {isMobile ? truncString(token.creatorWallet) : token.creatorWallet}</p>
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard(token.creatorWallet)} className="h-6 px-2">
                        {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Social Links — moved up right after Token Header */}
        {hasSocials && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Community & Social
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {socials.website && (
                  <a href={socials.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent hover:border-primary transition-colors group">
                    <Globe className="h-5 w-5" />
                    <p className="font-medium text-sm group-hover:text-primary">Website</p>
                  </a>
                )}
                {socials.twitter && (
                  <a href={socials.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent hover:border-primary transition-colors group">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    <p className="font-medium text-sm group-hover:text-primary">X (Twitter)</p>
                  </a>
                )}
                {socials.telegram && (
                  <a href={socials.telegram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent hover:border-primary transition-colors group">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                    </svg>
                    <p className="font-medium text-sm group-hover:text-primary">Telegram</p>
                  </a>
                )}
                {socials.discord && (
                  <a href={socials.discord} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent hover:border-primary transition-colors group">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                    </svg>
                    <p className="font-medium text-sm group-hover:text-primary">Discord</p>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* External Links (Trading & Analytics) */}
        <ExternalLinks
          mintAddress={token.mintAddress}
          poolAddress={token.poolAddress}
          metadataUri={token.metadataUri}
        />

        {/* Pool Configuration (collapsible) */}
        <CollapsibleSection title="Pool Configuration">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <p className="text-sm"><strong>Quote Token:</strong> {token.quoteTokenMint === 'So11111111111111111111111111111111111111112' ? 'SOL' : 'USDC'}</p>
            <p className="text-sm"><strong>Initial Market Cap:</strong> {formatNumber(token.initialMarketCap)}</p>
            <p className="text-sm"><strong>Market Cap Range:</strong> {formatNumber(token.marketCapRangeMin)} — {formatNumber(token.marketCapRangeMax)}</p>
            <p className="text-sm"><strong>Pool Liquidity %:</strong> {Number(token.poolLiquidityPercentage) * 100}%</p>
          </div>
        </CollapsibleSection>

        {/* Fee Schedule (collapsible) */}
        <CollapsibleSection title="Fee Schedule">
          <div className="space-y-2">
            <p className="text-sm"><strong>Scheduler Mode:</strong> {getFeeSchedulerLabel(token.feeSchedulerMode)} <span className="text-muted-foreground text-xs">mode: {token.feeSchedulerMode}</span></p>
            <p className="text-sm"><strong>Fee Token Mode:</strong> {getFeeTokenModeLabel(token.feeTokenMode)}</p>
            {token.feeSchedulerMode === 'market-cap-based' && (
              <>
                <p className="text-sm"><strong>Starting Market Cap:</strong> {formatNumber(token.startingMarketCap)}</p>
                <p className="text-sm"><strong>Ending Market Cap:</strong> {formatNumber(token.endingMarketCap)}</p>
                <p className="text-sm"><strong>Start Fee Rate:</strong> {token.startRatePercent}%</p>
                <p className="text-sm"><strong>End Fee Rate:</strong> {token.endRatePercent}%</p>
              </>
            )}
            {token.feeSchedulerMode === 'time-based' && (
              <>
                <p className="text-sm"><strong>Start Fee Rate:</strong> {token.startRatePercent}%</p>
                <p className="text-sm"><strong>End Fee Rate:</strong> {token.endRatePercent}%</p>
                <p className="text-sm"><strong>Duration:</strong> {Math.floor(Number(token.durationMinutes) / 60)}h {Number(token.durationMinutes) % 60}m</p>
              </>
            )}
            {token.feeSchedulerMode === 'fixed' && (
              <p className="text-sm"><strong>Base Fee:</strong> {token.fixedBaseFeePercent}%</p>
            )}
          </div>
        </CollapsibleSection>

        {/* Locked Liquidity (collapsible) */}
        <CollapsibleSection
          title="Locked Liquidity"
          badge={lowLiquidityWarning ? (
            <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 border border-red-200">
              ⚠ Low Lock ({token.lockedLiquidityPercentage}%)
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {token.lockedLiquidityPercentage}%
            </span>
          )}
        >
          <div className="space-y-2">
            <p className="text-sm"><strong>Locked Liquidity:</strong> {token.lockedLiquidityPercentage}%</p>
            {lowLiquidityWarning && (
              <p className="text-sm text-red-600">⚠ Only {token.lockedLiquidityPercentage}% of supply is locked in the pool. Low liquidity locks may be seen as a red flag by traders.</p>
            )}
          </div>
        </CollapsibleSection>

        {/* Transaction History */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase">Create token</p>
              <a href={getSolscanTxUrl(token.mintTxSignature)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm font-mono flex items-start gap-1">
                <span className="break-all">{isMobile ? truncString(token.mintTxSignature) : token.mintTxSignature}</span>
                <svg className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase">Configure and mint token</p>
              <a href={getSolscanTxUrl(token.metadataTxSignature)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm font-mono flex items-start gap-1">
                <span className="break-all">{isMobile ? truncString(token.metadataTxSignature) : token.metadataTxSignature}</span>
                <svg className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase">Create launch pool</p>
              <a href={getSolscanTxUrl(token.poolTxSignature)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm font-mono flex items-start gap-1">
                <span className="break-all">{isMobile ? truncString(token.poolTxSignature) : token.poolTxSignature}</span>
                <svg className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
