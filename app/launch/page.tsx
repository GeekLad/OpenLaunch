"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { TokenFormData, LaunchStatus, LaunchResult } from "@/types/token";
import { TokenLaunchForm } from "@/components/forms/TokenLaunchForm";
import { TokenLaunchService } from "@/lib/services/launchService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_LAUNCH_PARAMS, DEFAULT_NUMBER_OF_PERIODS } from "@/config/defaults";
import { getConnection, getBalance } from "@/lib/solana/connection";

export default function LaunchPage() {
  const router = useRouter();
  const { publicKey, signAllTransactions } = useWallet();
  const [launchStatus, setLaunchStatus] = useState<LaunchStatus | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [launchResult, setLaunchResult] = useState<LaunchResult | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isSavingToDatabase, setIsSavingToDatabase] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);

  const MIN_BALANCE_REQUIRED = 0.05;

  useEffect(() => {
    async function checkWalletBalance() {
      if (!publicKey) {
        setWalletBalance(null);
        return;
      }

      setIsCheckingBalance(true);
      try {
        const connection = getConnection();
        const balance = await getBalance(connection, publicKey.toBase58());
        setWalletBalance(balance);
      } catch (error) {
        console.error("Error checking wallet balance:", error);
        setWalletBalance(null);
      } finally {
        setIsCheckingBalance(false);
      }
    }

    checkWalletBalance();
  }, [publicKey]);

  const handleLaunch = async (formData: TokenFormData) => {
    if (!publicKey || !signAllTransactions) {
      alert("Please connect your wallet first");
      return;
    }

    setIsLaunching(true);
    setLaunchStatus({
      step: "idle",
      message: "Initializing launch...",
      progress: 0,
    });

    try {
      let finalStatus: LaunchStatus | undefined;

      const launchService = new TokenLaunchService((status) => {
        setLaunchStatus(status);
        finalStatus = status;
      });

      const result = await launchService.launchToken(formData, publicKey, signAllTransactions);

      setLaunchResult(result);
      setIsLaunching(false);

      if (finalStatus && finalStatus.step === "complete" && finalStatus.transactions) {
        setLaunchStatus({
          step: "complete",
          message: "Gathering token information...",
          progress: 100,
          transactions: finalStatus!.transactions,
          launchTimeAdjusted: finalStatus!.launchTimeAdjusted,
          requestedLaunchTime: finalStatus!.requestedLaunchTime,
        });

        setIsSavingToDatabase(true);

        try {
          console.log("[Database] Saving token launch to database...");

          const connection = await import("@/lib/solana/connection").then(m => m.getConnection());
          const launchSlot = await connection.getSlot();

          // Build fee scheduler payload from discriminated union
          let feePayload: Record<string, unknown>;
          const config = result.formData.feeSchedulerConfig;
          if (config.mode === 'market-cap-based') {
            feePayload = {
              startingMarketCap: String(config.startingMarketCap),
              endingMarketCap: String(config.endingMarketCap),
              startRatePercent: config.feeMarketCapStartRatePercent,
              endRatePercent: config.feeMarketCapEndRatePercent,
            };
          } else if (config.mode === 'time-based') {
            feePayload = {
              startRatePercent: config.startRatePercent,
              endRatePercent: config.endRatePercent,
              durationMinutes: config.durationMinutes,
              feeDecayPeriods: DEFAULT_NUMBER_OF_PERIODS,
            };
          } else {
            feePayload = {
              fixedBaseFeePercent: config.baseFeePercent,
            };
          }

          const response = await fetch("/api/tokens/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mintAddress: result.config.mint.toBase58(),
              poolAddress: result.config.poolAddress?.toBase58() || "",
              name: result.config.metadata.name,
              symbol: result.config.metadata.symbol,
              description: result.config.metadata.description || "",
              logoUrl: result.config.metadata.image,
              metadataUri: result.config.metadataUri || "",
              decimals: result.config.decimals,
              totalSupply: result.config.totalSupply.toString(),
              initialMarketCap: result.config.initialMarketCap,
              quoteTokenMint: result.config.quoteTokenMint.toBase58(),
              poolLiquidityPercentage: DEFAULT_LAUNCH_PARAMS.poolLiquidityPercentage,
              marketCapRangeMax: result.formData.marketCapRangeMax ?? DEFAULT_LAUNCH_PARAMS.marketCapRangeMax,
              feeSchedulerMode: result.formData.feeSchedulerConfig.mode,
              feeTokenMode: result.formData.feeTokenMode,
              lockedLiquidityPercentage: result.formData.lockedLiquidityPercentage ?? DEFAULT_LAUNCH_PARAMS.lockedLiquidityPercentage,
              ...feePayload,
              launchDate: result.config.launchTime || new Date(),
              launchSlot,
              mintTxSignature: finalStatus!.transactions.mintSignature || "",
              metadataTxSignature: finalStatus!.transactions.setupSignature || "",
              poolTxSignature: finalStatus!.transactions.poolSignature || "",
              creatorWallet: publicKey.toBase58(),
            }),
          });

          if (response.ok) {
            console.log("[Database] ✓ Token saved successfully");
            router.push(`/tokens/${result.config.mint.toBase58()}`);
          } else {
            const error = await response.json();
            console.error("[Database] Failed to save token:", error);
          }
        } catch (dbError) {
          console.error("[Database] Error saving to database:", dbError);
        } finally {
          setIsSavingToDatabase(false);
        }
      }
    } catch (error) {
      console.error("Launch failed:", error);
      setIsLaunching(false);
      setLaunchStatus({
        step: "error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        progress: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Launch Your Meme Token</h1>
          <p className="mt-2 text-muted-foreground">
            Deploy your token on Solana with DAMMv2 liquidity
          </p>
        </div>

        {!publicKey && (
          <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
            <CardContent className="pt-6">
              <p className="text-center text-sm">
                Please connect your wallet to launch a token
              </p>
            </CardContent>
          </Card>
        )}

        {publicKey && !isCheckingBalance && walletBalance !== null && walletBalance < MIN_BALANCE_REQUIRED && (
          <Card className="border-red-500 bg-red-50 dark:bg-red-950">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                  Insufficient Balance
                </p>
                <p className="text-sm text-red-600 dark:text-red-400">
                  You need at least <span className="font-bold">{MIN_BALANCE_REQUIRED} SOL</span> to launch a token.
                </p>
                <p className="text-sm text-red-600 dark:text-red-400">
                  Current balance: <span className="font-bold">{walletBalance.toFixed(4)} SOL</span>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {launchStatus && launchStatus.step !== "idle" && (
          <Card>
            <CardHeader>
              <CardTitle>Launch Status</CardTitle>
              <CardDescription>{launchStatus.message}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="w-full bg-secondary rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${launchStatus.progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium capitalize">{launchStatus.step}</span>
                  <span className="text-muted-foreground">{launchStatus.progress.toFixed(1)}%</span>
                </div>
                {isSavingToDatabase && (
                  <div className="flex flex-col items-center justify-center py-8 space-y-3">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    <p className="text-sm text-muted-foreground">Saving token data...</p>
                  </div>
                )}
                {launchStatus.error && (
                  <div className="mt-4 p-4 bg-destructive/10 border border-destructive rounded-md">
                    <p className="text-sm font-medium text-destructive mb-1">Error:</p>
                    <p className="text-sm text-destructive">{launchStatus.error}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {publicKey && !isLaunching && launchStatus?.step !== "complete" && !isCheckingBalance && (walletBalance === null || walletBalance >= MIN_BALANCE_REQUIRED) && (
          <TokenLaunchForm onSubmit={handleLaunch} isLoading={isLaunching} />
        )}
      </div>
    </div>
  );
}
