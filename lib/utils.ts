import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { SOLANA_NETWORK } from "@/config/public";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generates a Solscan explorer URL with appropriate cluster parameter
 * @param path - The path after solscan.io (e.g., "tx/xxx" or "token/xxx")
 * @returns Full Solscan URL with cluster parameter if needed
 */
export function getSolscanUrl(path: string): string {
  const baseUrl = "https://solscan.io";
  const network = SOLANA_NETWORK.toLowerCase();

  // Add cluster parameter for non-mainnet networks
  if (network === "devnet" || network === "testnet") {
    return `${baseUrl}/${path}?cluster=${network}`;
  }

  // No cluster parameter needed for mainnet-beta
  return `${baseUrl}/${path}`;
}

/**
 * Generates a Solscan transaction URL
 * @param signature - Transaction signature
 * @returns Solscan transaction URL
 */
export function getSolscanTxUrl(signature: string): string {
  return getSolscanUrl(`tx/${signature}`);
}

/**
 * Generates a Solscan token URL
 * @param mintAddress - Token mint address
 * @returns Solscan token URL
 */
export function getSolscanTokenUrl(mintAddress: string): string {
  return getSolscanUrl(`token/${mintAddress}`);
}

/**
 * Generates a Solscan account URL
 * @param address - Account address
 * @returns Solscan account URL
 */
export function getSolscanAccountUrl(address: string): string {
  return getSolscanUrl(`account/${address}`);
}
