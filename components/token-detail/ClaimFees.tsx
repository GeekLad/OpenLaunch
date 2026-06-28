"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { CpAmm } from "@meteora-ag/cp-amm-sdk";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { getSolscanTxUrl } from "@/lib/utils";
import { CLAIM_FEES_REFRESH_INTERVAL_MS } from "@/config/public";

interface ClaimFeeTxParams {
  owner: string;
  position: string;
  positionNftAccount: string;
  pool: string;
  tokenAMint: string;
  tokenBMint: string;
  tokenAVault: string;
  tokenBVault: string;
  tokenAProgram: string;
  tokenBProgram: string;
}

interface UnclaimedFeesResponse {
  feePendingARaw: string;
  feePendingBRaw: string;
  feePendingA: number;
  feePendingB: number;
  estimatedUsd: number;
  feeTokenMode: string;
  quoteTokenLabel: string;
  claimParams: ClaimFeeTxParams | null;
  solPrice: number | null;
  notOwner?: boolean;
  error?: string;
  details?: string;
}

interface ClaimFeesProps {
  mintAddress: string;
  creatorWallet: string;
  feeTokenMode: string;
  quoteTokenLabel: string;
}

type Status =
  | { kind: "idle" }
  | { kind: "claiming" }
  | { kind: "claimed"; signature: string }
  | { kind: "error"; message: string };

function formatUsd(value: number): string {
  if (value <= 0) return "$0.00";
  if (value < 0.01) return "<$0.01";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTokenAmount(value: number, symbol: string): string {
  if (value <= 0) return `0 ${symbol}`;
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 6,
  }).format(value);
  return `${formatted} ${symbol}`;
}

/**
 * Renders the "Unclaimed fees" section on the token detail page. Only shown
 * when the connected wallet equals the token's `creatorWallet`.
 *
 * Fee data is read server-side via `/api/tokens/[mintAddress]/unclaimed-fees`
 * (which keeps the SOL price API key server-only). The claim transaction is
 * built and signed client-side using the Meteora CpAmm SDK and the wallet
 * adapter, mirroring the launch flow.
 */
export function ClaimFees({
  mintAddress,
  creatorWallet,
  feeTokenMode,
  quoteTokenLabel,
}: ClaimFeesProps) {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  const [data, setData] = useState<UnclaimedFeesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const isCreator = publicKey
    ? publicKey.toBase58() === creatorWallet
    : false;

  const fetchFees = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!publicKey) {
        setData(null);
        setLoading(false);
        return;
      }
      if (!opts?.silent) setLoading(true);
      try {
        const res = await fetch(
          `/api/tokens/${mintAddress}/unclaimed-fees?owner=${publicKey.toBase58()}`
        );
        const json = (await res.json()) as UnclaimedFeesResponse;
        if (!res.ok) {
          setStatus({
            kind: "error",
            message: json.error || "Failed to load unclaimed fees",
          });
        } else {
          setData(json);
          // Don't clobber a claiming/claimed status on a silent refresh.
          if (!opts?.silent) setStatus({ kind: "idle" });
        }
      } catch (err) {
        if (!opts?.silent) {
          setStatus({
            kind: "error",
            message:
              err instanceof Error ? err.message : "Failed to load unclaimed fees",
          });
        }
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [mintAddress, publicKey]
  );

  // Initial load + ownership gate.
  useEffect(() => {
    if (isCreator) {
      fetchFees();
    } else {
      setData(null);
      setLoading(false);
    }
  }, [isCreator, fetchFees]);

  // Periodically refresh fees (silent — no loading spinner) so newly
  // accumulated swap fees appear without a page reload. Paused while a
  // claim is in-flight or showing a claimed banner.
  useEffect(() => {
    if (!isCreator) return;
    const REFRESH_INTERVAL_MS = CLAIM_FEES_REFRESH_INTERVAL_MS;
    const id = setInterval(() => {
      if (status.kind === "claiming") return;
      fetchFees({ silent: true });
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isCreator, fetchFees, status.kind]);

  const handleClaim = async () => {
    if (!publicKey || !signTransaction) {
      setStatus({ kind: "error", message: "Please connect your wallet first" });
      return;
    }
    if (!data?.claimParams) {
      setStatus({ kind: "error", message: "No claimable fees available" });
      return;
    }

    setStatus({ kind: "claiming" });
    try {
      const cpAmm = new CpAmm(connection);
      const p = data.claimParams;

      const tx: Transaction = await cpAmm.claimPositionFee({
        owner: new PublicKey(p.owner),
        position: new PublicKey(p.position),
        pool: new PublicKey(p.pool),
        positionNftAccount: new PublicKey(p.positionNftAccount),
        tokenAMint: new PublicKey(p.tokenAMint),
        tokenBMint: new PublicKey(p.tokenBMint),
        tokenAVault: new PublicKey(p.tokenAVault),
        tokenBVault: new PublicKey(p.tokenBVault),
        tokenAProgram: new PublicKey(p.tokenAProgram),
        tokenBProgram: new PublicKey(p.tokenBProgram),
        feePayer: publicKey,
      });

      tx.feePayer = publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const signed = await signTransaction(tx);
      const signature = await connection.sendRawTransaction(
        signed.serialize()
      );

      // Confirm the transaction landed.
      const latest = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        { signature, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
        "confirmed"
      );

      setStatus({ kind: "claimed", signature });
      // Refresh fee data after a short delay to let on-chain state settle.
      setTimeout(() => fetchFees({ silent: true }), 2000);
    } catch (err) {
      console.error("[ClaimFees] Claim failed:", err);
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Claim transaction failed",
      });
    }
  };

  if (!isCreator) return null;

  const hasClaimable = !!data?.claimParams;
  const showBoth = feeTokenMode === "both";

  return (
    <Card className="border-emerald-500/40">
      <CardContent className="pt-6">
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          Unclaimed fees
        </h3>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading unclaimed fees...
          </div>
        )}

        {!loading && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-sm text-muted-foreground">
                  Estimated value
                </span>
                <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatUsd(data?.estimatedUsd ?? 0)}
                </span>
              </div>

              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-sm text-muted-foreground">
                  {quoteTokenLabel} fees
                </span>
                <span className="text-sm font-medium">
                  {formatTokenAmount(data?.feePendingB ?? 0, quoteTokenLabel)}
                </span>
              </div>

              {showBoth && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Token fees
                  </span>
                  <span className="text-sm font-medium">
                    {formatTokenAmount(data?.feePendingA ?? 0, "base")}
                  </span>
                </div>
              )}
            </div>

            {status.kind === "error" && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{status.message}</p>
              </div>
            )}

            {status.kind === "claimed" && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-emerald-700 dark:text-emerald-300">
                    Fees claimed successfully
                  </p>
                  <a
                    href={getSolscanTxUrl(status.signature)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 dark:text-emerald-400 hover:underline font-mono text-xs break-all"
                  >
                    View transaction on Solscan
                  </a>
                </div>
              </div>
            )}

            <Button
              onClick={handleClaim}
              disabled={
                !hasClaimable ||
                status.kind === "claiming" ||
                status.kind === "claimed"
              }
              className="w-full"
            >
              {status.kind === "claiming" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Claiming...
                </>
              ) : (
                <>Claim fees</>
              )}
            </Button>

            {!hasClaimable && status.kind === "idle" && (
              <p className="text-xs text-muted-foreground text-center">
                No fees available to claim yet. Fees accumulate as the pool
                generates trading volume.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}