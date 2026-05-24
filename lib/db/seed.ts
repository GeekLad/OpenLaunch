import { dbService } from './service';
import type { TokenCreateInput } from './service';

/**
 * Seed database with sample data for testing
 */

const sampleTokens: TokenCreateInput[] = [
  {
    mintAddress: 'SeedToken1111111111111111111111111111111111',
    poolAddress: 'SeedPool11111111111111111111111111111111111',
    name: 'Sample Meme Token',
    symbol: 'MEME',
    description: 'A sample meme token for testing the OpenLaunch platform',
    logoUrl: 'https://example.com/logo1.png',
    metadataUri: 'https://arweave.net/sample-metadata-1',
    decimals: 9,
    totalSupply: '1000000000',
    initialPrice: 0.0000001,
    quoteTokenMint: 'So11111111111111111111111111111111111111112',
    poolLiquidityPercentage: 1.0,
    feeDecayDurationMinutes: 0,
    feeDecayPeriods: 0,
    priceRangeMin: 0.000001,
    priceRangeMax: 0.0001,
    feeSchedulerMode: 'market-cap-based',
    feeTokenMode: 'quoteOnly',
    startingMarketCap: '1000',
    endingMarketCap: '100000',
    startRate: 0,
    endRate: 0,
    durationMinutes: 0,
    fixedBaseFeeBps: 0,
    holdbackPercentage: 0,
    launchDate: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
    launchSlot: 123456789,
    mintTxSignature: 'SampleMintTx1111111111111111111111111111111111111111111111111111111111111',
    metadataTxSignature: 'SampleMetaTx1111111111111111111111111111111111111111111111111111111111111',
    poolTxSignature: 'SamplePoolTx1111111111111111111111111111111111111111111111111111111111111',
    creatorWallet: 'Creator11111111111111111111111111111111111111',
  },
  {
    mintAddress: 'SeedToken2222222222222222222222222222222222',
    poolAddress: 'SeedPool22222222222222222222222222222222222',
    name: 'Moon Token',
    symbol: 'MOON',
    description: 'To the moon! A test token for the leaderboard',
    logoUrl: 'https://example.com/logo2.png',
    metadataUri: 'https://arweave.net/sample-metadata-2',
    decimals: 9,
    totalSupply: '500000000',
    initialPrice: 0.0000002,
    quoteTokenMint: 'So11111111111111111111111111111111111111112',
    poolLiquidityPercentage: 1.0,
    feeDecayDurationMinutes: 60,
    feeDecayPeriods: 60,
    priceRangeMin: 0.000001,
    priceRangeMax: 0.0001,
    feeSchedulerMode: 'time-based',
    feeTokenMode: 'quoteOnly',
    startingMarketCap: '0',
    endingMarketCap: '0',
    startRate: 50,
    endRate: 0.25,
    durationMinutes: 60,
    fixedBaseFeeBps: 0,
    holdbackPercentage: 0,
    launchDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    launchSlot: 123456790,
    mintTxSignature: 'SampleMintTx2222222222222222222222222222222222222222222222222222222222222',
    metadataTxSignature: 'SampleMetaTx2222222222222222222222222222222222222222222222222222222222222',
    poolTxSignature: 'SamplePoolTx2222222222222222222222222222222222222222222222222222222222222',
    creatorWallet: 'Creator22222222222222222222222222222222222222',
  },
  {
    mintAddress: 'SeedToken3333333333333333333333333333333333',
    poolAddress: 'SeedPool33333333333333333333333333333333333',
    name: 'Future Launch Token',
    symbol: 'FUTURE',
    description: 'This token launches in the future - test countdown timer',
    logoUrl: 'https://example.com/logo3.png',
    metadataUri: 'https://arweave.net/sample-metadata-3',
    decimals: 9,
    totalSupply: '2000000000',
    initialPrice: 0.00000015,
    quoteTokenMint: 'So11111111111111111111111111111111111111112',
    poolLiquidityPercentage: 1.0,
    feeDecayDurationMinutes: 0,
    feeDecayPeriods: 0,
    priceRangeMin: 0.000001,
    priceRangeMax: 0.0001,
    feeSchedulerMode: 'fixed',
    feeTokenMode: 'quoteOnly',
    startingMarketCap: '0',
    endingMarketCap: '0',
    startRate: 0,
    endRate: 0,
    durationMinutes: 0,
    fixedBaseFeeBps: 25,
    holdbackPercentage: 0,
    launchDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    launchSlot: 123456791,
    mintTxSignature: 'SampleMintTx3333333333333333333333333333333333333333333333333333333333333',
    metadataTxSignature: 'SampleMetaTx3333333333333333333333333333333333333333333333333333333333333',
    poolTxSignature: 'SamplePoolTx3333333333333333333333333333333333333333333333333333333333333',
    creatorWallet: 'Creator33333333333333333333333333333333333333',
  },
];

export async function seedDatabase(): Promise<void> {
  console.log('[Seed] Starting database seeding...');

  try {
    // Create sample tokens
    for (const tokenData of sampleTokens) {
      console.log(`[Seed] Creating token: ${tokenData.symbol}`);

      const token = await dbService.createToken(tokenData);

      // Only create pool stats for launched tokens (not future launches)
      if (token.launchDate <= new Date()) {
        console.log(`[Seed] Creating pool stats for: ${tokenData.symbol}`);

        // Create initial snapshot
        await dbService.createPoolStatsSnapshot(token.id, token.poolAddress, {
          totalFeesGenerated: '1000000', // 1 SOL in lamports
          fees24h: '250000',
          volume24h: '5000000000',
          currentLiquidity: '10000000000',
        });

        // Create fee update schedule
        const now = new Date();
        const nextUpdate = new Date(now.getTime() + 1 * 60 * 1000); // 1 minute from now

        await dbService.upsertFeeUpdateSchedule(
          token.id,
          token.poolAddress,
          nextUpdate,
          1 // Update every 1 minute (recent launch)
        );

        // Update cumulative fees snapshot
        await dbService.updateCumulativeFeesSnapshot(token.mintAddress, '1000000');
      }
    }

    console.log('[Seed] Database seeded successfully! ✓');
    console.log(`[Seed] Created ${sampleTokens.length} sample tokens`);
  } catch (error) {
    console.error('[Seed] Failed to seed database:', error);
    throw error;
  }
}

/**
 * CLI script to seed database
 * Usage: npm run db:seed
 */
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('[Seed] Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Seed] Error:', error);
      process.exit(1);
    });
}
