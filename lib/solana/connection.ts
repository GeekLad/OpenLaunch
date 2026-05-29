import { Connection, ConnectionConfig, Commitment, PublicKey } from "@solana/web3.js";
import { CLIENT_RPC_URL } from "@/config/public";
import { RPC_URL } from "@/config/secrets";

const DEFAULT_RPC_URL = "https://api.mainnet-beta.solana.com";

const DEFAULT_COMMITMENT: Commitment = "confirmed";

const connectionConfig: ConnectionConfig = {
  commitment: DEFAULT_COMMITMENT,
  confirmTransactionInitialTimeout: 60000,
};

let connection: Connection | null = null;

export function getConnection(): Connection {
  if (!connection) {
    // Prefer server-side RPC_URL (runtime-configurable), fall back to client RPC
    connection = new Connection(RPC_URL || CLIENT_RPC_URL || DEFAULT_RPC_URL, connectionConfig);
  }
  return connection;
}

export function createConnection(rpcUrl?: string, commitment?: Commitment): Connection {
  const url = rpcUrl || RPC_URL || CLIENT_RPC_URL || DEFAULT_RPC_URL;
  const config: ConnectionConfig = {
    ...connectionConfig,
    commitment: commitment || DEFAULT_COMMITMENT,
  };
  return new Connection(url, config);
}

export async function getRecentBlockhash(connection: Connection) {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  return { blockhash, lastValidBlockHeight };
}

export async function confirmTransaction(
  connection: Connection,
  signature: string,
  blockhash: string,
  lastValidBlockHeight: number
) {
  const confirmation = await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight,
  });

  if (confirmation.value.err) {
    throw new Error(`Transaction failed: ${confirmation.value.err}`);
  }

  return confirmation;
}

export async function getBalance(connection: Connection, publicKey: string) {
  try {
    const balance = await connection.getBalance(new PublicKey(publicKey));
    return balance / 1e9; // Convert lamports to SOL
  } catch (error) {
    console.error("Error fetching balance:", error);
    throw error;
  }
}

// Utility to check if connection is healthy
export async function checkConnection(connection: Connection): Promise<boolean> {
  try {
    const version = await connection.getVersion();
    return !!version;
  } catch (error) {
    console.error("Connection health check failed:", error);
    return false;
  }
}
