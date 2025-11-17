"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { TokenFormData, LaunchStatus, TokenLaunchConfig } from "@/types/token";
import { TokenLaunchForm } from "@/components/forms/TokenLaunchForm";
import { TokenLaunchService } from "@/lib/services/launchService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ENV } from "@/config/environment";

export default function LaunchPage() {
  const router = useRouter();
  const { publicKey, signAllTransactions } = useWallet();
  const [launchStatus, setLaunchStatus] = useState<LaunchStatus | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [launchConfig, setLaunchConfig] = useState<TokenLaunchConfig | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isSavingToDatabase, setIsSavingToDatabase] = useState(false);

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
        finalStatus = status; // Capture the final status
      });

      const config = await launchService.launchToken(formData, publicKey, signAllTransactions);

      setLaunchConfig(config);
      setIsLaunching(false);

      // Save successful launch to database and redirect
      // Check if we have a complete launch with all transaction signatures
      if (finalStatus && finalStatus.step === "complete" && finalStatus.transactions) {
        // Update status to show we're gathering token information
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

          // Get the current slot for launch time tracking
          const connection = await import("@/lib/solana/connection").then(m => m.getConnection());
          const launchSlot = await connection.getSlot();

          const response = await fetch("/api/tokens/create", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              // Token identifiers
              mintAddress: config.mint.toBase58(),
              poolAddress: config.poolAddress?.toBase58() || "",

              // Token metadata
              name: config.metadata.name,
              symbol: config.metadata.symbol,
              description: config.metadata.description || "",
              logoUrl: config.metadata.image, // IPFS URL for the logo image
              metadataUri: config.metadataUri || "", // IPFS URI for the metadata JSON

              // Token configuration
              decimals: config.decimals,
              totalSupply: config.totalSupply.toString(),

              // Pool configuration
              initialPrice: config.initialPrice,
              quoteTokenMint: config.quoteTokenMint.toBase58(),
              poolLiquidityPercentage: ENV.POOL_LIQUIDITY_PERCENTAGE,

              // Fee configuration
              feeDecayDurationMinutes: config.feeSchedule?.decayDuration || ENV.FEE_DECAY_DURATION_MINUTES,
              feeDecayPeriods: ENV.FEE_DECAY_PERIODS,

              // Launch info
              launchDate: config.launchTime || new Date(),
              launchSlot: launchSlot,

              // Transaction signatures
              mintTxSignature: finalStatus!.transactions.mintSignature || "",
              metadataTxSignature: finalStatus!.transactions.setupSignature || "",
              poolTxSignature: finalStatus!.transactions.poolSignature || "",

              // Creator
              creatorWallet: publicKey.toBase58(),
            }),
          });

          if (response.ok) {
            console.log("[Database] ✓ Token saved successfully");

            // Redirect to token detail page immediately
            router.push(`/tokens/${config.mint.toBase58()}`);
          } else {
            const error = await response.json();
            console.error("[Database] Failed to save token:", error);
            // Don't fail the launch if database save fails - it's not critical
          }
        } catch (dbError) {
          console.error("[Database] Error saving to database:", dbError);
          // Don't fail the launch if database save fails
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
          {/* Page Title */}
          <div>
            <h1 className="text-4xl font-bold">Launch Your Meme Token</h1>
            <p className="mt-2 text-muted-foreground">
              Deploy your token on Solana with DAMMv2 liquidity
            </p>
          </div>

        {/* Connection Check */}
        {!publicKey && (
          <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
            <CardContent className="pt-6">
              <p className="text-center text-sm">
                Please connect your wallet to launch a token
              </p>
            </CardContent>
          </Card>
        )}

        {/* Launch Status */}
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


          {/* Launch Form */}
          {publicKey && !isLaunching && launchStatus?.step !== "complete" && (
            <TokenLaunchForm onSubmit={handleLaunch} isLoading={isLaunching} />
          )}
        </div>
    </div>
  );
}
