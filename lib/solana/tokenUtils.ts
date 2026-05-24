import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  createInitializeMintInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  AuthorityType,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { TOKEN_DECIMALS } from "@/config/public";

export interface CreateMintResult {
  mint: PublicKey;
  transaction: Transaction;
  mintKeypair: Keypair;
}

/**
 * Creates a new SPL Token Mint
 * @param connection - Solana connection
 * @param payer - The wallet that will pay for the transaction
 * @param mintKeypair - The keypair for the new mint
 * @param decimals - Number of decimals for the token
 * @returns CreateMintResult with mint address and transaction
 */
export async function createMint(
  connection: Connection,
  payer: PublicKey,
  mintKeypair: Keypair,
  decimals: number = TOKEN_DECIMALS
): Promise<CreateMintResult> {
  const lamports = await getMinimumBalanceForRentExemptMint(connection);

  const transaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      decimals,
      payer, // Mint authority
      payer, // Freeze authority
      TOKEN_PROGRAM_ID
    )
  );

  return {
    mint: mintKeypair.publicKey,
    transaction,
    mintKeypair,
  };
}

export interface MintTokensResult {
  tokenAccount: PublicKey;
  transaction: Transaction;
}

/**
 * Mints tokens to a specified account
 * @param connection - Solana connection
 * @param payer - The wallet that will pay for the transaction
 * @param mint - The mint address
 * @param destination - The destination token account or wallet
 * @param amount - Amount to mint (in base units)
 * @param mintAuthority - The current mint authority
 * @returns MintTokensResult with token account and transaction
 */
export async function mintTokens(
  connection: Connection,
  payer: PublicKey,
  mint: PublicKey,
  destination: PublicKey,
  amount: number,
  decimals: number = TOKEN_DECIMALS
): Promise<MintTokensResult> {
  // Get or create associated token account
  const tokenAccount = await getAssociatedTokenAddress(
    mint,
    destination,
    false,
    TOKEN_PROGRAM_ID
  );

  const transaction = new Transaction();

  // Check if token account exists, if not, create it
  const accountInfo = await connection.getAccountInfo(tokenAccount);
  if (!accountInfo) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        payer,
        tokenAccount,
        destination,
        mint,
        TOKEN_PROGRAM_ID
      )
    );
  }

  // Mint tokens
  const mintAmount = BigInt(amount) * BigInt(Math.pow(10, decimals));
  transaction.add(
    createMintToInstruction(
      mint,
      tokenAccount,
      payer, // Mint authority
      mintAmount,
      [],
      TOKEN_PROGRAM_ID
    )
  );

  return {
    tokenAccount,
    transaction,
  };
}

/**
 * Revokes mint authority permanently
 * @param connection - Solana connection
 * @param payer - The wallet that will pay for the transaction
 * @param mint - The mint address
 * @param currentAuthority - The current mint authority
 * @returns Transaction to revoke mint authority
 */
export async function revokeMintAuthority(
  mint: PublicKey,
  currentAuthority: PublicKey
): Promise<Transaction> {
  const transaction = new Transaction().add(
    createSetAuthorityInstruction(
      mint,
      currentAuthority,
      AuthorityType.MintTokens,
      null, // Setting to null permanently revokes authority
      [],
      TOKEN_PROGRAM_ID
    )
  );

  return transaction;
}

/**
 * Revokes freeze authority permanently
 * @param connection - Solana connection
 * @param payer - The wallet that will pay for the transaction
 * @param mint - The mint address
 * @param currentAuthority - The current freeze authority
 * @returns Transaction to revoke freeze authority
 */
export async function revokeFreezeAuthority(
  mint: PublicKey,
  currentAuthority: PublicKey
): Promise<Transaction> {
  const transaction = new Transaction().add(
    createSetAuthorityInstruction(
      mint,
      currentAuthority,
      AuthorityType.FreezeAccount,
      null, // Setting to null permanently revokes authority
      [],
      TOKEN_PROGRAM_ID
    )
  );

  return transaction;
}

/**
 * Revokes both mint and freeze authorities in a single transaction
 * @param mint - The mint address
 * @param currentAuthority - The current authority
 * @returns Transaction to revoke both authorities
 */
export async function revokeAllAuthorities(
  mint: PublicKey,
  currentAuthority: PublicKey
): Promise<Transaction> {
  const transaction = new Transaction()
    .add(
      createSetAuthorityInstruction(
        mint,
        currentAuthority,
        AuthorityType.MintTokens,
        null,
        [],
        TOKEN_PROGRAM_ID
      )
    )
    .add(
      createSetAuthorityInstruction(
        mint,
        currentAuthority,
        AuthorityType.FreezeAccount,
        null,
        [],
        TOKEN_PROGRAM_ID
      )
    );

  return transaction;
}

/**
 * Gets token account information
 * @param connection - Solana connection
 * @param tokenAccount - The token account address
 * @returns Token account info
 */
export async function getTokenAccountInfo(connection: Connection, tokenAccount: PublicKey) {
  try {
    const info = await connection.getTokenAccountBalance(tokenAccount);
    return info.value;
  } catch (error) {
    console.error("Error fetching token account info:", error);
    throw error;
  }
}

/**
 * Gets mint information
 * @param connection - Solana connection
 * @param mint - The mint address
 * @returns Mint info including supply, decimals, authorities
 */
export async function getMintInfo(connection: Connection, mint: PublicKey) {
  try {
    const info = await connection.getParsedAccountInfo(mint);
    if (!info.value || !("parsed" in info.value.data)) {
      throw new Error("Invalid mint account");
    }
    return info.value.data.parsed.info;
  } catch (error) {
    console.error("Error fetching mint info:", error);
    throw error;
  }
}

/**
 * Checks if a mint's authorities have been revoked
 * @param connection - Solana connection
 * @param mint - The mint address
 * @returns Object indicating if mint and freeze authorities are revoked
 */
export async function checkAuthoritiesRevoked(
  connection: Connection,
  mint: PublicKey
): Promise<{ mintAuthorityRevoked: boolean; freezeAuthorityRevoked: boolean }> {
  const mintInfo = await getMintInfo(connection, mint);

  return {
    mintAuthorityRevoked: mintInfo.mintAuthority === null,
    freezeAuthorityRevoked: mintInfo.freezeAuthority === null,
  };
}
