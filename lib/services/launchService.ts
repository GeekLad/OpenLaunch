import { Connection, PublicKey, Transaction, Keypair } from "@solana/web3.js";
import { TokenFormData, LaunchStatus, TokenLaunchConfig } from "@/types/token";
import { ENV } from "@/config/environment";
import { getConnection, getRecentBlockhash, confirmTransaction } from "@/lib/solana/connection";
import { createMint, mintTokens, revokeAllAuthorities } from "@/lib/solana/tokenUtils";
import { buildMetadata, createMetadataAccount } from "@/lib/solana/metadataUtils";
import { createDAMMv2Pool } from "@/lib/solana/poolUtils";
import {
  uploadTokenAssets,
  mockIPFSUpload,
  mockMetadataUpload
} from "@/lib/services/ipfsService";
import { validateAndParsePrivateKey } from "@/lib/utils/keypairUtils";

export class TokenLaunchService {
  private connection: Connection;
  private statusCallback?: (status: LaunchStatus) => void;

  constructor(statusCallback?: (status: LaunchStatus) => void) {
    this.connection = getConnection();
    this.statusCallback = statusCallback;
  }

  private updateStatus(status: LaunchStatus) {
    if (this.statusCallback) {
      this.statusCallback(status);
    }
  }

  /**
   * Main method to launch a token with all steps
   * @param formData - Token form data from user
   * @param walletPublicKey - User's wallet public key
   * @param signAllTransactions - Function to sign all transactions at once
   * @returns Launch configuration with all addresses
   */
  async launchToken(
    formData: TokenFormData,
    walletPublicKey: PublicKey,
    signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>
  ): Promise<TokenLaunchConfig> {
    try {
      // Step 1: Generate or use custom mint keypair
      this.updateStatus({
        step: "mint",
        message: "Generating token mint address...",
        progress: 5,
      });

      let mintKeypair: Keypair;

      // Check if user provided a custom private key
      if (formData.enableCustomPrivateKey && formData.customPrivateKey) {
        const validationResult = validateAndParsePrivateKey(formData.customPrivateKey);

        if (!validationResult.isValid || !validationResult.keypair) {
          throw new Error(`Invalid private key: ${validationResult.error}`);
        }

        mintKeypair = validationResult.keypair;
        console.log(`Using custom mint keypair: ${mintKeypair.publicKey.toBase58()}`);
      } else {
        mintKeypair = Keypair.generate();
        console.log(`Mint address generated: ${mintKeypair.publicKey.toBase58()}`);
      }

      // Step 2: Create mint and mint tokens
      this.updateStatus({
        step: "mint",
        message: "Creating token mint...",
        progress: 25,
      });

      const mintResult = await createMint(
        this.connection,
        walletPublicKey,
        mintKeypair,
        ENV.TOKEN_DECIMALS
      );

      // Step 3: Upload assets to IPFS (do this before preparing all transactions)
      this.updateStatus({
        step: "metadata",
        message: "Uploading logo to IPFS...",
        progress: 50,
      });

      if (!formData.logoFile) {
        throw new Error("Logo file is required");
      }

      // Build metadata
      const metadata = buildMetadata(
        formData.name,
        formData.symbol,
        "", // Will be filled after image upload
        formData.description,
        {
          website: formData.websiteUrl,
          twitter: formData.twitterUrl,
          telegram: formData.telegramUrl,
          discord: formData.discordUrl,
        }
      );

      // Upload to IPFS (server-side API handles Pinata/Filebase, falls back to mock)
      let metadataUri: string;
      try {
        // Upload via server-side API (tries Pinata, then Filebase)
        const ipfsResult = await uploadTokenAssets(formData.logoFile, metadata);
        metadataUri = ipfsResult.gateway;
        console.log("✓ Uploaded to IPFS successfully");
      } catch (uploadError) {
        console.warn("IPFS upload failed, using mock upload:", uploadError);

        // Final fallback to mock upload for testing
        const mockImageResult = await mockIPFSUpload(formData.logoFile);
        metadata.image = mockImageResult.gateway;
        const mockMetadataResult = await mockMetadataUpload(metadata);
        metadataUri = mockMetadataResult.gateway;

        console.error(
          "\n⚠️  WARNING: Using mock IPFS upload - URLs will NOT work!\n\n" +
          "To fix this, get a FREE API key from one of these services:\n\n" +
          "Option 1: Filebase (RECOMMENDED - 5GB Free + S3-compatible)\n" +
          "  1. Go to https://filebase.com\n" +
          "  2. Sign up (free account)\n" +
          "  3. Generate API key from dashboard\n" +
          "  4. Add to .env.local: FILEBASE_API_KEY=your_key\n\n" +
          "Option 2: Pinata (1GB Free)\n" +
          "  1. Go to https://pinata.cloud\n" +
          "  2. Sign up and get API credentials\n" +
          "  3. Add to .env.local:\n" +
          "     PINATA_API_KEY=your_key\n" +
          "     PINATA_SECRET_KEY=your_secret\n"
        );
      }

      console.log(`Metadata uploaded: ${metadataUri}`);

      // Step 4: Prepare all three transactions for batch signing
      this.updateStatus({
        step: "metadata",
        message: "Preparing all transactions for single approval...",
        progress: 70,
      });

      const { blockhash, lastValidBlockHeight } = await getRecentBlockhash(this.connection);

      // Transaction 1: Mint creation
      mintResult.transaction.recentBlockhash = blockhash;
      mintResult.transaction.feePayer = walletPublicKey;

      // Transaction 2: Mint tokens + create metadata + revoke authorities
      const mintTokensResult = await mintTokens(
        this.connection,
        walletPublicKey,
        mintResult.mint,
        walletPublicKey,
        ENV.TOTAL_SUPPLY,
        ENV.TOKEN_DECIMALS
      );

      const metadataTx = await createMetadataAccount({
        connection: this.connection,
        mint: mintResult.mint,
        mintAuthority: walletPublicKey,
        payer: walletPublicKey,
        updateAuthority: walletPublicKey,
        metadata: metadata,
        uri: metadataUri,
      });

      const revokeAuthTx = await revokeAllAuthorities(mintResult.mint, walletPublicKey);

      const combinedTx = new Transaction();
      combinedTx.add(...mintTokensResult.transaction.instructions);
      combinedTx.add(...metadataTx.instructions);
      combinedTx.add(...revokeAuthTx.instructions);
      combinedTx.recentBlockhash = blockhash;
      combinedTx.feePayer = walletPublicKey;

      // Transaction 3: Create DAMMv2 pool (pass TOKEN_PROGRAM_ID to skip on-chain lookup)
      const poolTokenAmount = Math.floor(ENV.TOTAL_SUPPLY * ENV.POOL_LIQUIDITY_PERCENTAGE);

      console.log(`Pool creation amounts:\n` +
        `  Token amount: ${poolTokenAmount}\n` +
        `  SOL amount: 0 SOL (single-sided pool)\n` +
        `  Initial price: ${ENV.INITIAL_PRICE} SOL per token\n` +
        `  Market cap at launch: ${(poolTokenAmount * ENV.INITIAL_PRICE).toFixed(4)} SOL`
      );

      const { TOKEN_PROGRAM_ID } = await import("@solana/spl-token");

      const poolResult = await createDAMMv2Pool({
        connection: this.connection,
        payer: walletPublicKey,
        tokenAMint: mintResult.mint,
        tokenBMint: new PublicKey(ENV.QUOTE_TOKEN_MINT),
        tokenAAmount: poolTokenAmount,
        tokenADecimals: ENV.TOKEN_DECIMALS,
        tokenBDecimals: 9,
        initialPrice: ENV.INITIAL_PRICE,
        tokenAProgram: TOKEN_PROGRAM_ID, // Our token uses standard TOKEN_PROGRAM_ID
        tokenBProgram: TOKEN_PROGRAM_ID, // SOL also uses standard TOKEN_PROGRAM_ID
        launchTime: formData.enableTimedLaunch && formData.launchDateTime ? formData.launchDateTime : undefined,
        feeSchedule: formData.enableFeeScheduler ? {
          enabled: true,
          startRate: formData.startingFeeRate,
          endRate: formData.endingFeeRate,
          decayDuration: ENV.FEE_DECAY_DURATION_MINUTES,
        } : undefined,
      });

      poolResult.transaction.recentBlockhash = blockhash;
      poolResult.transaction.feePayer = walletPublicKey;

      // Step 5: Sign all transactions at once (single user approval!)
      this.updateStatus({
        step: "signing",
        message: "Please approve all transactions in your wallet...",
        progress: 80,
      });

      const allTransactions = [
        mintResult.transaction,
        combinedTx,
        poolResult.transaction,
      ];

      console.log("Requesting user signature for all 3 transactions at once...");
      const signedTransactions = await signAllTransactions(allTransactions);

      // Add keypair signatures to transactions that need them
      signedTransactions[0].partialSign(mintKeypair); // Mint transaction
      signedTransactions[2].partialSign(poolResult.positionNft); // Pool transaction

      // Step 6: Submit all transactions sequentially
      this.updateStatus({
        step: "submitting",
        message: "Submitting mint transaction...",
        progress: 85,
      });

      const mintSignature = await this.connection.sendRawTransaction(signedTransactions[0].serialize());
      await confirmTransaction(this.connection, mintSignature, blockhash, lastValidBlockHeight);
      console.log(`✓ Mint created: ${mintResult.mint.toBase58()}, signature: ${mintSignature}`);

      this.updateStatus({
        step: "submitting",
        message: "Finalizing token setup...",
        progress: 90,
        transactions: {
          mintSignature,
        },
      });

      const setupSignature = await this.connection.sendRawTransaction(signedTransactions[1].serialize());
      await confirmTransaction(this.connection, setupSignature, blockhash, lastValidBlockHeight);
      console.log(
        `✓ Token setup complete:\n` +
        `  - Minted ${ENV.TOTAL_SUPPLY} tokens\n` +
        `  - Created immutable metadata\n` +
        `  - Revoked mint authority\n` +
        `  - Revoked freeze authority\n` +
        `  Signature: ${setupSignature}`
      );

      this.updateStatus({
        step: "pool",
        message: "Creating DAMMv2 pool...",
        progress: 95,
        transactions: {
          mintSignature,
          setupSignature,
        },
      });

      const poolSignature = await this.connection.sendRawTransaction(signedTransactions[2].serialize());
      await confirmTransaction(this.connection, poolSignature, blockhash, lastValidBlockHeight);
      console.log(
        `✓ DAMMv2 pool created:\n` +
        `  Pool: ${poolResult.pool.toBase58()}\n` +
        `  Position: ${poolResult.position.toBase58()}\n` +
        `  Position NFT: ${poolResult.positionNft.publicKey.toBase58()}\n` +
        `  Signature: ${poolSignature}`
      );

      // Step 7: Complete
      this.updateStatus({
        step: "complete",
        message: "Token launch complete!",
        progress: 100,
        txSignature: setupSignature,
        transactions: {
          mintSignature,
          setupSignature,
          poolSignature,
        },
      });

      const launchConfig: TokenLaunchConfig = {
        mint: mintResult.mint,
        metadata: metadata,
        totalSupply: ENV.TOTAL_SUPPLY,
        decimals: ENV.TOKEN_DECIMALS,
        quoteTokenMint: new PublicKey(ENV.QUOTE_TOKEN_MINT),
        initialPrice: ENV.INITIAL_PRICE,
        priceRangeMin: ENV.PRICE_RANGE_MIN,
        priceRangeMax: ENV.PRICE_RANGE_MAX,
        poolAddress: poolResult.pool,
        positionAddress: poolResult.position,
        positionNft: poolResult.positionNft.publicKey,
        feeSchedule: formData.enableFeeScheduler
          ? {
              enabled: true,
              startRate: formData.startingFeeRate,
              endRate: formData.endingFeeRate,
              decayDuration: ENV.FEE_DECAY_DURATION_MINUTES,
            }
          : undefined,
        launchTime: formData.enableTimedLaunch ? formData.launchDateTime || undefined : undefined,
      };

      return launchConfig;
    } catch (error) {
      console.error("Token launch failed:", error);
      this.updateStatus({
        step: "error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        progress: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }
}
