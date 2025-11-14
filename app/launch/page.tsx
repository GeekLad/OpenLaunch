"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "@/components/wallet/WalletButton";
import { TokenFormData, LaunchStatus, TokenLaunchConfig } from "@/types/token";
import { TokenLaunchForm } from "@/components/forms/TokenLaunchForm";
import { TokenLaunchService } from "@/lib/services/launchService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSolscanTxUrl, getSolscanTokenUrl } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function LaunchPage() {
  const { publicKey, signAllTransactions } = useWallet();
  const [launchStatus, setLaunchStatus] = useState<LaunchStatus | null>(null);
  const [launchConfig, setLaunchConfig] = useState<TokenLaunchConfig | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);

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
      const launchService = new TokenLaunchService((status) => {
        setLaunchStatus(status);
      });

      const config = await launchService.launchToken(formData, publicKey, signAllTransactions);

      setLaunchConfig(config);
      setIsLaunching(false);
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Launch Your Meme Token</h1>
            <p className="mt-2 text-muted-foreground">
              Deploy your token on Solana with DAMMv2 liquidity
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <WalletButton />
          </div>
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
                {launchStatus.transactions && (
                  <div className="mt-4 space-y-3">
                    {launchStatus.transactions.mintSignature && (
                      <div className="p-3 bg-secondary rounded-md">
                        <p className="text-xs font-semibold mb-1 text-muted-foreground uppercase">
                          Transaction 1: Mint Creation
                        </p>
                        <a
                          href={getSolscanTxUrl(launchStatus.transactions.mintSignature)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline break-all font-mono"
                        >
                          {launchStatus.transactions.mintSignature}
                        </a>
                      </div>
                    )}
                    {launchStatus.transactions.setupSignature && (
                      <div className="p-3 bg-secondary rounded-md">
                        <p className="text-xs font-semibold mb-1 text-muted-foreground uppercase">
                          Transaction 2: Token Setup & Metadata
                        </p>
                        <a
                          href={getSolscanTxUrl(launchStatus.transactions.setupSignature)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline break-all font-mono"
                        >
                          {launchStatus.transactions.setupSignature}
                        </a>
                      </div>
                    )}
                    {launchStatus.transactions.poolSignature && (
                      <div className="p-3 bg-secondary rounded-md">
                        <p className="text-xs font-semibold mb-1 text-muted-foreground uppercase">
                          Transaction 3: DAMMv2 Pool Creation
                        </p>
                        <a
                          href={getSolscanTxUrl(launchStatus.transactions.poolSignature)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline break-all font-mono"
                        >
                          {launchStatus.transactions.poolSignature}
                        </a>
                      </div>
                    )}
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

        {/* Launch Time Adjustment Warning */}
        {launchStatus?.launchTimeAdjusted && launchStatus?.step === "complete" && (
          <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950">
            <CardHeader>
              <CardTitle className="text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <span>⚠️</span>
                <span>Pool Launched Immediately</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p className="text-amber-700 dark:text-amber-300">
                  Your requested launch time had already expired, so the pool was launched immediately instead.
                </p>
                {launchStatus.requestedLaunchTime && (
                  <div className="mt-3 p-3 bg-amber-100 dark:bg-amber-900 rounded-md">
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">
                      Requested Launch Time:
                    </p>
                    <p className="text-sm font-mono text-amber-800 dark:text-amber-200">
                      {new Date(launchStatus.requestedLaunchTime).toLocaleString()}
                    </p>
                  </div>
                )}
                <p className="text-amber-700 dark:text-amber-300 mt-2">
                  The pool is now active and trading is enabled.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success Summary */}
        {launchConfig && launchStatus?.step === "complete" && (
          <Card className="border-green-500 bg-green-50 dark:bg-green-950">
            <CardHeader>
              <CardTitle className="text-green-600 dark:text-green-400">
                Token Launched Successfully!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Token Name:</span>
                  <span>{launchConfig.metadata.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Token Symbol:</span>
                  <span>{launchConfig.metadata.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Mint Address:</span>
                  <a
                    href={getSolscanTokenUrl(launchConfig.mint.toBase58())}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    {launchConfig.mint.toBase58().slice(0, 8)}...
                    {launchConfig.mint.toBase58().slice(-8)}
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Total Supply:</span>
                  <span>{launchConfig.totalSupply.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Decimals:</span>
                  <span>{launchConfig.decimals}</span>
                </div>
                {launchConfig.poolAddress && (
                  <div className="flex justify-between">
                    <span className="font-medium">Pool Address:</span>
                    <a
                      href={`https://app.meteora.ag/dammv2/${launchConfig.poolAddress.toBase58()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      View on Meteora →
                    </a>
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
