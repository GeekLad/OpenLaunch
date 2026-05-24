import { Connection, PublicKey, Transaction, Keypair } from "@solana/web3.js";
import { TokenFormData, LaunchStatus, TokenLaunchConfig } from "@/types/token";
import { TOKEN_DECIMALS, QUOTE_TOKEN_MINT, APP_URL } from "@/config/public";
import { DEFAULT_LAUNCH_PARAMS } from "@/config/defaults";
import { getConnection, getRecentBlockhash, confirmTransaction } from "@/lib/solana/connection";
import { createMint, mintTokens, revokeAllAuthorities } from "@/lib/solana/tokenUtils";
import { buildMetadata, createMetadataAccount } from "@/lib/solana/metadataUtils";
import { createDAMMv2Pool } from "@/lib/solana/poolUtils";
import {
  uploadTokenAssets,
  mockIPFSUpload,
  mockMetadataUpload,
  type TokenAssetsUploadResult
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
        TOKEN_DECIMALS
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
          launchpad: APP_URL,
        }
      );

      // Upload to IPFS (server-side API handles Pinata/Filebase, falls back to mock)
      let metadataUri: string;
      let uploadResult: TokenAssetsUploadResult | null = null;
      try {
        // Upload via server-side API (tries Pinata, then Filebase)
        uploadResult = await uploadTokenAssets(formData.logoFile, metadata);
        metadataUri = uploadResult.metadataGateway;
        // Update metadata with the complete metadata that includes image URL
        metadata.image = uploadResult.imageGateway;
        console.log("✓ Uploaded to IPFS successfully");
        console.log(`  Image URL: ${uploadResult.imageGateway}`);
        console.log(`  Metadata URL: ${uploadResult.metadataGateway}`);
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

      // Transaction 1: Mint creation (don't set blockhash yet)
      mintResult.transaction.feePayer = walletPublicKey;

      // Transaction 2: Mint tokens + create metadata + revoke authorities
      const mintTokensResult = await mintTokens(
        this.connection,
        walletPublicKey,
        mintResult.mint,
        walletPublicKey,
        formData.totalSupply ?? DEFAULT_LAUNCH_PARAMS.totalSupply,
        TOKEN_DECIMALS
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
      combinedTx.feePayer = walletPublicKey;

      // Transaction 3: Create DAMMv2 pool (pass TOKEN_PROGRAM_ID to skip on-chain lookup)
      const poolTokenAmount = Math.floor((formData.totalSupply ?? DEFAULT_LAUNCH_PARAMS.totalSupply) * (formData.holdbackPercentage ?? DEFAULT_LAUNCH_PARAMS.holdbackPercentage) / 100);

      console.log(`Pool creation amounts:\n` +
        `  Token amount: ${poolTokenAmount}\n` +
        `  SOL amount: 0 SOL (single-sided pool)\n` +
        `  Initial price: ${formData.initialPrice ?? DEFAULT_LAUNCH_PARAMS.initialPrice} SOL per token\n` +
        `  Market cap at launch: ${(poolTokenAmount * (formData.initialPrice ?? DEFAULT_LAUNCH_PARAMS.initialPrice)).toFixed(4)} SOL`
      );

      const { TOKEN_PROGRAM_ID } = await import("@solana/spl-token");

      // Map FeeSchedulerConfig to old CreatePoolParams.feeSchedule shape
      const feeSchedule = formData.feeSchedulerConfig.mode !== 'fixed' ? {
        enabled: true,
        startRate: formData.feeSchedulerConfig.mode === 'time-based'
          ? formData.feeSchedulerConfig.startRate
          : 50, // fallback for market-cap mode
        endRate: formData.feeSchedulerConfig.mode === 'time-based'
          ? formData.feeSchedulerConfig.endRate
          : 0.25,
        decayDuration: formData.feeSchedulerConfig.mode === 'time-based'
          ? formData.feeSchedulerConfig.durationMinutes
          : 0, // market-cap-based mode does not use time-based decay duration
      } : undefined;

      let poolResult = await createDAMMv2Pool({
        connection: this.connection,
        payer: walletPublicKey,
        tokenAMint: mintResult.mint,
        tokenBMint: new PublicKey(formData.quoteTokenMint ?? DEFAULT_LAUNCH_PARAMS.quoteTokenMint),
        tokenAAmount: poolTokenAmount,
        tokenADecimals: TOKEN_DECIMALS,
        tokenBDecimals: 9,
        initialPrice: formData.initialPrice ?? DEFAULT_LAUNCH_PARAMS.initialPrice,
        tokenAProgram: TOKEN_PROGRAM_ID,
        tokenBProgram: TOKEN_PROGRAM_ID,
        launchTime: formData.enableTimedLaunch && formData.launchDateTime ? formData.launchDateTime : undefined,
        feeSchedule: feeSchedule,
      });

      poolResult.transaction.feePayer = walletPublicKey;

      // Track if launch time was adjusted
      let launchTimeAdjusted = false;
      let requestedLaunchTime: Date | undefined = undefined;

      // Step 4.5: Check if launch time is in the past and auto-adjust
      this.updateStatus({
        step: "signing",
        message: "Validating pool configuration...",
        progress: 75,
      });

      console.log("Checking pool launch time validity...");
      console.log(`  enableTimedLaunch: ${formData.enableTimedLaunch}`);
      console.log(`  launchDateTime: ${formData.launchDateTime}`);

      // Check if launch time is in the past or too close to current time (within 2 minutes buffer)
      if (formData.enableTimedLaunch && formData.launchDateTime) {
        const now = new Date();
        const launchTime = new Date(formData.launchDateTime);
        const timeUntilLaunch = launchTime.getTime() - now.getTime();
        const twoMinutesInMs = 2 * 60 * 1000;

        console.log(`  Current time: ${now.toISOString()}`);
        console.log(`  Launch time: ${launchTime.toISOString()}`);
        console.log(`  Time until launch: ${Math.floor(timeUntilLaunch / 1000)} seconds`);

        if (timeUntilLaunch < twoMinutesInMs) {
          console.warn(
            '⚠️ Launch time is too close to current time or in the past.\n' +
            `  Requested: ${launchTime.toISOString()}\n` +
            `  Current:   ${now.toISOString()}\n` +
            `  Difference: ${Math.floor(timeUntilLaunch / 1000)} seconds\n` +
            'Automatically adjusting to immediate activation...'
          );

          // Track the adjustment
          launchTimeAdjusted = true;
          requestedLaunchTime = formData.launchDateTime;

          this.updateStatus({
            step: "signing",
            message: "Adjusting to immediate launch due to expired time...",
            progress: 77,
            launchTimeAdjusted: true,
            requestedLaunchTime: formData.launchDateTime,
          });

          // Re-create pool with immediate activation
          poolResult = await createDAMMv2Pool({
            connection: this.connection,
            payer: walletPublicKey,
            tokenAMint: mintResult.mint,
            tokenBMint: new PublicKey(formData.quoteTokenMint ?? DEFAULT_LAUNCH_PARAMS.quoteTokenMint),
            tokenAAmount: poolTokenAmount,
            tokenADecimals: TOKEN_DECIMALS,
            tokenBDecimals: 9,
            initialPrice: formData.initialPrice ?? DEFAULT_LAUNCH_PARAMS.initialPrice,
            tokenAProgram: TOKEN_PROGRAM_ID,
            tokenBProgram: TOKEN_PROGRAM_ID,
            launchTime: undefined, // Immediate activation
            feeSchedule: feeSchedule,
          });

          console.log("✓ Pool recreated for immediate activation");
        } else {
          console.log(`✓ Launch time is valid (${Math.floor(timeUntilLaunch / 1000)} seconds in the future)`);
        }
      }


      // Step 5: Get fresh blockhash right before signing
      this.updateStatus({
        step: "signing",
        message: "Getting fresh blockhash...",
        progress: 78,
      });

      const { blockhash, lastValidBlockHeight } = await getRecentBlockhash(this.connection);
      console.log("Fresh blockhash obtained for signing");

      // Assign blockhash to all transactions
      mintResult.transaction.recentBlockhash = blockhash;
      combinedTx.recentBlockhash = blockhash;
      poolResult.transaction.recentBlockhash = blockhash;

      // Step 6: Sign all transactions at once (single user approval!)
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

      // Add keypair signatures after wallet signing
      signedTransactions[0].partialSign(mintKeypair); // Mint transaction
      signedTransactions[2].partialSign(poolResult.positionNft); // Pool transaction

      // Step 7: Submit all transactions sequentially
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
        `  - Minted ${formData.totalSupply ?? DEFAULT_LAUNCH_PARAMS.totalSupply} tokens\n` +
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

      let poolSignature: string;

      try {
        poolSignature = await this.connection.sendRawTransaction(signedTransactions[2].serialize());
        await confirmTransaction(this.connection, poolSignature, blockhash, lastValidBlockHeight);
        console.log(
          `✓ DAMMv2 pool created:\n` +
          `  Pool: ${poolResult.pool.toBase58()}\n` +
          `  Position: ${poolResult.position.toBase58()}\n` +
          `  Position NFT: ${poolResult.positionNft.publicKey.toBase58()}\n` +
          `  Signature: ${poolSignature}`
        );
      } catch (poolError: unknown) {
        // Check if this is an InvalidActivationPoint error
        const errorMessage = (poolError as Error & { logs?: string[] })?.message || '';
        const errorLogs = (poolError as Error & { logs?: string[] })?.logs?.join('\n') || '';

        const isActivationError =
          errorMessage.includes('InvalidActivationPoint') ||
          errorMessage.includes('0x177b') ||
          errorMessage.includes('6011') ||
          errorLogs.includes('InvalidActivationPoint') ||
          errorLogs.includes('0x177b') ||
          errorLogs.includes('6011');

        if (isActivationError && formData.enableTimedLaunch && formData.launchDateTime && !launchTimeAdjusted) {
          console.warn(
            '⚠️ Pool creation failed with InvalidActivationPoint error.\n' +
            'Launch time expired between validation and submission.\n' +
            'Recreating pool for immediate activation and requesting new approval...'
          );

          // Track the adjustment
          launchTimeAdjusted = true;
          requestedLaunchTime = formData.launchDateTime;

          this.updateStatus({
            step: "pool",
            message: "Launch time expired - recreating pool for immediate launch...",
            progress: 92,
            transactions: {
              mintSignature,
              setupSignature,
            },
            launchTimeAdjusted: true,
            requestedLaunchTime: formData.launchDateTime,
          });

          // Re-create pool with immediate activation
          const newPoolResult = await createDAMMv2Pool({
            connection: this.connection,
            payer: walletPublicKey,
            tokenAMint: mintResult.mint,
            tokenBMint: new PublicKey(formData.quoteTokenMint ?? DEFAULT_LAUNCH_PARAMS.quoteTokenMint),
            tokenAAmount: poolTokenAmount,
            tokenADecimals: TOKEN_DECIMALS,
            tokenBDecimals: 9,
            initialPrice: formData.initialPrice ?? DEFAULT_LAUNCH_PARAMS.initialPrice,
            tokenAProgram: TOKEN_PROGRAM_ID,
            tokenBProgram: TOKEN_PROGRAM_ID,
            launchTime: undefined, // Immediate activation
            feeSchedule: feeSchedule,
          });

          // Get fresh blockhash for the retry
          const { blockhash: newBlockhash, lastValidBlockHeight: newLastValidBlockHeight } =
            await getRecentBlockhash(this.connection);

          newPoolResult.transaction.recentBlockhash = newBlockhash;
          newPoolResult.transaction.feePayer = walletPublicKey;

          this.updateStatus({
            step: "signing",
            message: "Please approve the corrected pool transaction...",
            progress: 93,
          });

          console.log("Requesting user signature for corrected pool transaction...");
          const [signedPoolTx] = await signAllTransactions([newPoolResult.transaction]);
          signedPoolTx.partialSign(newPoolResult.positionNft);

          this.updateStatus({
            step: "pool",
            message: "Submitting corrected pool transaction...",
            progress: 95,
          });

          poolSignature = await this.connection.sendRawTransaction(signedPoolTx.serialize());
          await confirmTransaction(this.connection, poolSignature, newBlockhash, newLastValidBlockHeight);

          // Update poolResult for the final config
          poolResult = newPoolResult;

          console.log(
            `✓ DAMMv2 pool created (immediate activation):\n` +
            `  Pool: ${poolResult.pool.toBase58()}\n` +
            `  Position: ${poolResult.position.toBase58()}\n` +
            `  Position NFT: ${poolResult.positionNft.publicKey.toBase58()}\n` +
            `  Signature: ${poolSignature}`
          );
        } else {
          // Different error or already adjusted - rethrow
          throw poolError;
        }
      }

      // Step 8: Complete
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
        launchTimeAdjusted,
        requestedLaunchTime,
      });

      const launchConfig: TokenLaunchConfig = {
        mint: mintResult.mint,
        metadata: metadata,
        metadataUri: metadataUri, // IPFS URI where metadata JSON is stored
        totalSupply: formData.totalSupply ?? DEFAULT_LAUNCH_PARAMS.totalSupply,
        decimals: TOKEN_DECIMALS,
        quoteTokenMint: new PublicKey(QUOTE_TOKEN_MINT),
        initialPrice: formData.initialPrice ?? DEFAULT_LAUNCH_PARAMS.initialPrice,
        priceRangeMin: formData.priceRangeMin ?? DEFAULT_LAUNCH_PARAMS.priceRangeMin,
        priceRangeMax: formData.priceRangeMax ?? DEFAULT_LAUNCH_PARAMS.priceRangeMax,
        poolAddress: poolResult.pool,
        positionAddress: poolResult.position,
        positionNft: poolResult.positionNft.publicKey,
        feeSchedulerConfig: formData.feeSchedulerConfig,
        feeTokenMode: formData.feeTokenMode,
        holdbackPercentage: formData.holdbackPercentage ?? DEFAULT_LAUNCH_PARAMS.holdbackPercentage,
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
