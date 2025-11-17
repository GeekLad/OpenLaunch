import { db } from './client';
import { tokens, feeUpdateSchedule } from './schema';
import { calculateNextUpdateTime } from '@/lib/meteora/polling-strategy';

/**
 * Initialize fee update schedules for existing tokens that don't have them
 */
export async function migrateFeeUpdateSchedules(): Promise<void> {
  console.log('[Migration] Starting fee update schedule migration...');

  try {
    // Get all tokens
    const allTokens = await db.select().from(tokens);
    
    // Get tokens that already have schedules
    const tokensWithSchedules = await db
      .select({ tokenId: feeUpdateSchedule.tokenId })
      .from(feeUpdateSchedule);

    const tokenIdsWithSchedules = new Set(tokensWithSchedules.map(t => t.tokenId));
    
    // Find tokens without schedules
    const tokensWithoutSchedules = allTokens.filter(
      token => !tokenIdsWithSchedules.has(token.id)
    );

    console.log(`[Migration] Found ${tokensWithoutSchedules.length} tokens without fee update schedules`);

    if (tokensWithoutSchedules.length === 0) {
      console.log('[Migration] No migration needed');
      return;
    }

    // Create fee update schedules for existing tokens
    let successCount = 0;
    let failCount = 0;

    for (const token of tokensWithoutSchedules) {
      try {
        const { nextUpdate, intervalMinutes } = calculateNextUpdateTime(
          new Date(token.launchDate)
        );

        await db.insert(feeUpdateSchedule).values({
          tokenId: token.id,
          poolAddress: token.poolAddress,
          lastUpdated: new Date(),
          nextUpdate,
          updateIntervalMinutes: intervalMinutes,
        });

        successCount++;
        console.log(`[Migration] ✓ Created schedule for token ${token.id} (${token.symbol})`);
      } catch (error) {
        failCount++;
        console.error(`[Migration] ✗ Failed to create schedule for token ${token.id}:`, error);
      }
    }

    console.log(`[Migration] Migration complete: ${successCount} succeeded, ${failCount} failed`);
  } catch (error) {
    console.error('[Migration] Error during migration:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  migrateFeeUpdateSchedules()
    .then(() => {
      console.log('[Migration] ✓ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Migration] ✗ Migration failed:', error);
      process.exit(1);
    });
}