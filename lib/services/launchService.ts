import { Connection, PublicKey, Transaction, Keypair } from "@solana/web3.js";
import { TokenFormData, LaunchStatus, TokenLaunchConfig, LaunchResult } from "@/types/token";
import { TOKEN_DECIMALS, QUOTE_TOKEN_MINT, APP_URL } from "@/config/public";
import { DEFAULT_LAUNCH_PARAMS, getQuoteTokenDecimals } from "@/config/defaults";
import { getConnection, getRecentBlockhash, confirmTransaction } from "@/lib/solana/connection";
import { createMint, mintTokens, revokeAllAuthorities } from "@/lib/solana/tokenUtils";
import { buildMetadata, createMetadataAccount } from "@/lib/solana/metadataUtils";
import { createDAMMv2Pool } from "@/lib/solana/poolUtils";
import { CollectFeeMode } from "@meteora-ag/cp-amm-sdk";
import {
  uploadTokenAssets,
  mockIPFSUpload,
  mockMetadataUpload,
  type TokenAssetsUploadResult
} from "@/lib/services/ipfsService";
import { validateAndParsePrivateKey } from "@/lib/utils/keypairUtils";
import { validateLaunchParams, ValidationError } from "@/lib/validation/launch";

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
  ): Promise<LaunchResult> {
    try {
      // ─── Pre-flight validation ───
      const validationErrors = validateLaunchParams(formData as unknown as Parameters<typeof validateLaunchParams>[0]);
      if (validationErrors.length > 0) {
        throw new ValidationError(
          "Launch parameter validation failed",
          validationErrors
        );
      }

      // Step 1: Generate or use custom mint keypair
      this.updateStatus({
        step: "mint",
        message: "Generating token mint address...",
        progress: 5,
      });

      let mintKeypair: Keypair;

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

      // Step 3: Upload assets to IPFS
      this.updateStatus({
        step: "metadata",
        message: "Uploading logo to IPFS...",
        progress: 50,
      });

      if (!formData.logoFile) {
        throw new Error("Logo file is required");
      }

      const metadata = buildMetadata(
        formData.name,
        formData.symbol,
        "",
        formData.description,
        {
          website: formData.websiteUrl,
          twitter: formData.twitterUrl,
          telegram: formData.telegramUrl,
          discord: formData.discordUrl,
          launchpad: APP_URL,
        }
      );

      let metadataUri: string;
      let uploadResult: TokenAssetsUploadResult | null = null;
      try {
        uploadResult = await uploadTokenAssets(formData.logoFile, metadata);
        metadataUri = uploadResult.metadataGateway;
        metadata.image = uploadResult.imageGateway;
        console.log("✓ Uploaded to IPFS successfully");
      } catch (uploadError) {
        console.warn("IPFS upload failed, using mock upload:", uploadError);
        const mockImageResult = await mockIPFSUpload(formData.logoFile);
        metadata.image = mockImageResult.gateway;
        const mockMetadataResult = await mockMetadataUpload(metadata);
        metadataUri = mockMetadataResult.gateway;
      }

      // Step 4: Prepare all three transactions for batch signing
      this.updateStatus({
        step: "metadata",
        message: "Preparing all transactions for single approval...",
        progress: 70,
      });

      mintResult.transaction.feePayer = walletPublicKey;

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

      // Pool creation — locked liquidity is the inverse of holdback
      const lockedLiquidity = formData.lockedLiquidityPercentage ?? DEFAULT_LAUNCH_PARAMS.lockedLiquidityPercentage;
      const poolTokenAmount = Math.floor(
        (formData.totalSupply ?? DEFAULT_LAUNCH_PARAMS.totalSupply) * lockedLiquidity / 100
      );

      console.log(`Pool creation amounts:\n` +
        `  Token amount (to pool): ${poolTokenAmount}\n` +
        `  Locked liquidity: ${lockedLiquidity}%\n` +
        `  Creator keeps: ${(formData.totalSupply ?? DEFAULT_LAUNCH_PARAMS.totalSupply) - poolTokenAmount}\n` +
        `  Initial market cap: ${formData.initialMarketCap ?? DEFAULT_LAUNCH_PARAMS.initialMarketCap}`
      );

      const { TOKEN_PROGRAM_ID } = await import("@solana/spl-token");

      let poolResult = await createDAMMv2Pool({
        connection: this.connection,
        payer: walletPublicKey,
        tokenAMint: mintResult.mint,
        tokenBMint: new PublicKey(formData.quoteTokenMint ?? DEFAULT_LAUNCH_PARAMS.quoteTokenMint),
        tokenAAmount: poolTokenAmount,
        tokenADecimals: TOKEN_DECIMALS,
        tokenBDecimals: getQuoteTokenDecimals(formData.quoteTokenMint ?? DEFAULT_LAUNCH_PARAMS.quoteTokenMint),
        initialMarketCap: formData.initialMarketCap ?? DEFAULT_LAUNCH_PARAMS.initialMarketCap,
        totalSupply: formData.totalSupply ?? DEFAULT_LAUNCH_PARAMS.totalSupply,
        marketCapRangeMax: formData.marketCapRangeMax ?? DEFAULT_LAUNCH_PARAMS.marketCapRangeMax,
        tokenAProgram: TOKEN_PROGRAM_ID,
        tokenBProgram: TOKEN_PROGRAM_ID,
        launchTime: formData.enableTimedLaunch && formData.launchDateTime ? formData.launchDateTime : undefined,
        feeSchedulerConfig: formData.feeSchedulerConfig,
        collectFeeMode: formData.feeTokenMode === 'both' ? CollectFeeMode.BothToken : CollectFeeMode.OnlyB,
      });

      poolResult.transaction.feePayer = walletPublicKey;

      // Track if launch time was adjusted
      let launchTimeAdjusted = false;
      let requestedLaunchTime: Date | undefined = undefined;

      // Step 4.5: Check if launch time is in the past
      this.updateStatus({
        step: "signing",
        message: "Validating pool configuration...",
        progress: 75,
      });

      if (formData.enableTimedLaunch && formData.launchDateTime) {
        const now = new Date();
        const launchTime = new Date(formData.launchDateTime);
        const timeUntilLaunch = launchTime.getTime() - now.getTime();
        const twoMinutesInMs = 2 * 60 * 1000;

        if (timeUntilLaunch < twoMinutesInMs) {
          console.warn(
            '⚠️ Launch time is too close or in the past. Auto-adjusting to immediate...'
          );

          launchTimeAdjusted = true;
          requestedLaunchTime = formData.launchDateTime;

          this.updateStatus({
            step: "signing",
            message: "Adjusting to immediate launch due to expired time...",
            progress: 77,
            launchTimeAdjusted: true,
            requestedLaunchTime: formData.launchDateTime,
          });

          poolResult = await createDAMMv2Pool({
            connection: this.connection,
            payer: walletPublicKey,
            tokenAMint: mintResult.mint,
            tokenBMint: new PublicKey(formData.quoteTokenMint ?? DEFAULT_LAUNCH_PARAMS.quoteTokenMint),
            tokenAAmount: poolTokenAmount,
            tokenADecimals: TOKEN_DECIMALS,
            tokenBDecimals: getQuoteTokenDecimals(formData.quoteTokenMint ?? DEFAULT_LAUNCH_PARAMS.quoteTokenMint),
            initialMarketCap: formData.initialMarketCap ?? DEFAULT_LAUNCH_PARAMS.initialMarketCap,
            totalSupply: formData.totalSupply ?? DEFAULT_LAUNCH_PARAMS.totalSupply,
            marketCapRangeMax: formData.marketCapRangeMax ?? DEFAULT_LAUNCH_PARAMS.marketCapRangeMax,
            tokenAProgram: TOKEN_PROGRAM_ID,
            tokenBProgram: TOKEN_PROGRAM_ID,
            launchTime: undefined,
            feeSchedulerConfig: formData.feeSchedulerConfig,
            collectFeeMode: formData.feeTokenMode === 'both' ? CollectFeeMode.BothToken : CollectFeeMode.OnlyB,
          });

          console.log("✓ Pool recreated for immediate activation");
        }
      }

      // Ensure feePayer is set on the (possibly recreated) pool transaction
      poolResult.transaction.feePayer = walletPublicKey;

      // Step 5: Get fresh blockhash
      this.updateStatus({
        step: "signing",
        message: "Getting fresh blockhash...",
        progress: 78,
      });

      const { blockhash, lastValidBlockHeight } = await getRecentBlockhash(this.connection);

      mintResult.transaction.recentBlockhash = blockhash;
      combinedTx.recentBlockhash = blockhash;
      poolResult.transaction.recentBlockhash = blockhash;

      // Step 6: Sign all transactions at once
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

      const signedTransactions = await signAllTransactions(allTransactions);

      signedTransactions[0].partialSign(mintKeypair);
      signedTransactions[2].partialSign(poolResult.positionNft);

      // Step 7: Submit sequentially
      this.updateStatus({
        step: "submitting",
        message: "Submitting mint transaction...",
        progress: 85,
      });

      const mintSignature = await this.connection.sendRawTransaction(signedTransactions[0].serialize());
      await confirmTransaction(this.connection, mintSignature, blockhash, lastValidBlockHeight);

      this.updateStatus({
        step: "submitting",
        message: "Finalizing token setup...",
        progress: 90,
        transactions: { mintSignature },
      });

      const setupSignature = await this.connection.sendRawTransaction(signedTransactions[1].serialize());
      await confirmTransaction(this.connection, setupSignature, blockhash, lastValidBlockHeight);

      this.updateStatus({
        step: "pool",
        message: "Creating DAMMv2 pool...",
        progress: 95,
        transactions: { mintSignature, setupSignature },
      });

      let poolSignature: string;

      try {
        poolSignature = await this.connection.sendRawTransaction(signedTransactions[2].serialize());
        await confirmTransaction(this.connection, poolSignature, blockhash, lastValidBlockHeight);
      } catch (poolError: unknown) {
        const errorMessage = (poolError as Error & { logs?: string[] })?.message || '';
        const errorLogs = (poolError as Error & { logs?: string[] })?.logs?.join('\n') || '';

        const isActivationError =
          errorMessage.includes('InvalidActivationPoint') ||
          errorMessage.includes('0x177b') ||
          errorMessage.includes('6011') ||
          errorLogs.includes('InvalidActivationPoint');

        if (isActivationError && formData.enableTimedLaunch && formData.launchDateTime && !launchTimeAdjusted) {
          console.warn('⚠️ Pool creation failed with InvalidActivationPoint. Recreating for immediate launch...');

          launchTimeAdjusted = true;
          requestedLaunchTime = formData.launchDateTime;

          this.updateStatus({
            step: "pool",
            message: "Launch time expired - recreating pool for immediate launch...",
            progress: 92,
            transactions: { mintSignature, setupSignature },
            launchTimeAdjusted: true,
            requestedLaunchTime: formData.launchDateTime,
          });

          const newPoolResult = await createDAMMv2Pool({
            connection: this.connection,
            payer: walletPublicKey,
            tokenAMint: mintResult.mint,
            tokenBMint: new PublicKey(formData.quoteTokenMint ?? DEFAULT_LAUNCH_PARAMS.quoteTokenMint),
            tokenAAmount: poolTokenAmount,
            tokenADecimals: TOKEN_DECIMALS,
            tokenBDecimals: getQuoteTokenDecimals(formData.quoteTokenMint ?? DEFAULT_LAUNCH_PARAMS.quoteTokenMint),
            initialMarketCap: formData.initialMarketCap ?? DEFAULT_LAUNCH_PARAMS.initialMarketCap,
            totalSupply: formData.totalSupply ?? DEFAULT_LAUNCH_PARAMS.totalSupply,
            marketCapRangeMax: formData.marketCapRangeMax ?? DEFAULT_LAUNCH_PARAMS.marketCapRangeMax,
            tokenAProgram: TOKEN_PROGRAM_ID,
            tokenBProgram: TOKEN_PROGRAM_ID,
            launchTime: undefined,
            feeSchedulerConfig: formData.feeSchedulerConfig,
            collectFeeMode: formData.feeTokenMode === 'both' ? CollectFeeMode.BothToken : CollectFeeMode.OnlyB,
          });

          const { blockhash: newBlockhash, lastValidBlockHeight: newLastValidBlockHeight } =
            await getRecentBlockhash(this.connection);

          newPoolResult.transaction.recentBlockhash = newBlockhash;
          newPoolResult.transaction.feePayer = walletPublicKey;

          this.updateStatus({
            step: "signing",
            message: "Please approve the corrected pool transaction...",
            progress: 93,
          });

          const [signedPoolTx] = await signAllTransactions([newPoolResult.transaction]);
          signedPoolTx.partialSign(newPoolResult.positionNft);

          this.updateStatus({
            step: "pool",
            message: "Submitting corrected pool transaction...",
            progress: 95,
          });

          poolSignature = await this.connection.sendRawTransaction(signedPoolTx.serialize());
          await confirmTransaction(this.connection, poolSignature, newBlockhash, newLastValidBlockHeight);

          console.log("✓ DAMMv2 pool created (immediate activation)");
        } else {
          throw poolError;
        }
      }

      // Step 8: Complete
      this.updateStatus({
        step: "complete",
        message: "Token launch complete!",
        progress: 100,
        txSignature: setupSignature,
        transactions: { mintSignature, setupSignature, poolSignature },
        launchTimeAdjusted,
        requestedLaunchTime,
      });

      const launchConfig: TokenLaunchConfig = {
        mint: mintResult.mint,
        metadata: metadata,
        metadataUri: metadataUri,
        totalSupply: formData.totalSupply ?? DEFAULT_LAUNCH_PARAMS.totalSupply,
        decimals: TOKEN_DECIMALS,
        quoteTokenMint: new PublicKey(QUOTE_TOKEN_MINT),
        initialMarketCap: formData.initialMarketCap ?? DEFAULT_LAUNCH_PARAMS.initialMarketCap,
        marketCapRangeMax: formData.marketCapRangeMax ?? DEFAULT_LAUNCH_PARAMS.marketCapRangeMax,
        poolAddress: poolResult.pool,
        positionAddress: poolResult.position,
        positionNft: poolResult.positionNft.publicKey,
        feeSchedulerConfig: formData.feeSchedulerConfig,
        feeTokenMode: formData.feeTokenMode,
        lockedLiquidityPercentage: formData.lockedLiquidityPercentage ?? DEFAULT_LAUNCH_PARAMS.lockedLiquidityPercentage,
        launchTime: formData.enableTimedLaunch ? formData.launchDateTime || undefined : undefined,
      };

      const result: LaunchResult = {
        config: launchConfig,
        formData,
      };

      return result;
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
