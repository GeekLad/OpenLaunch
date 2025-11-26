"use client";

import { FC, ReactNode, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  LedgerWalletAdapter,
  CoinbaseWalletAdapter,
  TrustWalletAdapter,
  TorusWalletAdapter,
  Coin98WalletAdapter,
  TrezorWalletAdapter,
  WalletConnectWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { ENV } from "@/config/environment";

// Import wallet adapter CSS
import "@solana/wallet-adapter-react-ui/styles.css";

interface SolanaProviderProps {
  children: ReactNode;
}

export const SolanaProvider: FC<SolanaProviderProps> = ({ children }) => {
  const endpoint = useMemo(() => {
    const rpcUrl = ENV.RPC_URL;
    if (!rpcUrl || typeof rpcUrl !== 'string' || (!rpcUrl.startsWith('http://') && !rpcUrl.startsWith('https://'))) {
      console.warn('Invalid RPC URL, using default:', rpcUrl);
      return 'https://api.mainnet-beta.solana.com';
    }
    return rpcUrl;
  }, []);

  const wallets = useMemo(
    () => {
      // Determine network from environment
      const network = ENV.SOLANA_NETWORK === "mainnet-beta"
        ? WalletAdapterNetwork.Mainnet
        : WalletAdapterNetwork.Devnet;

      return [
        // Most popular wallets first
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter({ network }),
        new CoinbaseWalletAdapter(),
        new TrustWalletAdapter(),

        // Hardware wallets
        new LedgerWalletAdapter(),
        new TrezorWalletAdapter({ email: "support@openlaunch.app" }),

        // Additional wallets
        new TorusWalletAdapter(),
        new Coin98WalletAdapter(),
        new WalletConnectWalletAdapter({ network, options: {} }),
      ];
    },
    [] // Empty dependency array ensures wallets are only created once
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
