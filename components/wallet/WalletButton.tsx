"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";

/**
 * Client-side only wallet button to prevent hydration errors
 */
export function WalletButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return (
      <button className="wallet-adapter-button wallet-adapter-button-trigger" disabled>
        Loading...
      </button>
    );
  }

  return <WalletMultiButton />;
}
