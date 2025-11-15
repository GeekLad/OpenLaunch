"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Token } from "@/lib/db/schema";
import { CompactCountdown } from "@/components/ui/countdown";

interface TokenCardProps {
  token: Token;
}

export function TokenCard({ token }: TokenCardProps) {
  const launchDate = new Date(token.launchDate);
  const [hasLaunched, setHasLaunched] = useState(false);
  const isUpcoming = !hasLaunched && launchDate > new Date();
  const fees = BigInt(token.cumulativeFeesSnapshot);

  const handleCountdownComplete = () => {
    setHasLaunched(true);
  };

  return (
    <Link href={`/tokens/${token.mintAddress}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            {/* Logo */}
            {token.logoUrl && (
              <div className="flex-shrink-0">
                <Image
                  src={token.logoUrl}
                  alt={token.symbol}
                  width={48}
                  height={48}
                  className="rounded-lg object-cover"
                  unoptimized={token.logoUrl.startsWith('http')}
                />
              </div>
            )}

            {/* Token Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg truncate">{token.symbol}</h3>
              <p className="text-sm text-muted-foreground truncate">{token.name}</p>
            </div>

            {/* Status Badge */}
            {isUpcoming ? (
              <div className="flex-shrink-0">
                <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-950 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  Upcoming
                </span>
              </div>
            ) : (
              <div className="flex-shrink-0">
                <span className="inline-flex items-center rounded-full bg-green-50 dark:bg-green-950 px-2 py-1 text-xs font-medium text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800">
                  Live
                </span>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Launch Date / Countdown */}
          <div>
            <p className="text-xs text-muted-foreground uppercase mb-1">
              {isUpcoming ? "Launches In" : "Launched"}
            </p>
            {isUpcoming ? (
              <CompactCountdown targetDate={launchDate} onComplete={handleCountdownComplete} />
            ) : (
              <p className="text-sm font-mono">
                {launchDate.toLocaleDateString()} {launchDate.toLocaleTimeString()}
              </p>
            )}
          </div>

          {/* Cumulative Fees */}
          <div>
            <p className="text-xs text-muted-foreground uppercase mb-1">
              Cumulative Fees
            </p>
            <p className="text-sm font-mono font-semibold">
              {fees.toString() === '0' ? 'N/A' : `${(Number(fees) / 1e9).toFixed(4)} SOL`}
            </p>
          </div>

          {/* Pool Link */}
          <div className="pt-2 border-t">
            <span className="text-xs text-primary hover:underline">
              View Details →
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
