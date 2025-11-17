#!/usr/bin/env tsx

/**
 * Migration script to initialize fee update schedules for existing tokens
 * This should be run once after updating the fee updater system
 */

import { db } from '../lib/db/client';
import { tokens, feeUpdateSchedule } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { calculateNextUpdateTime } from '../lib/meteora/polling-strategy';

async function migrateFeeUpdateSchedules() {
  console.log('[Migration] Starting fee update schedule migration...');

  try {
    // Get all tokens that don't have a fee update schedule
    const tokensWithoutSchedule = await db
      .select({
        id: tokens.id,
        poolAddress: tokens.poolAddress,
        launchDate: tokens.launchDate,
      })
      .from(tokens)
      .leftJoin(
        feeUpdateSchedule,
        eq(tokens.id, feeUpdateSchedule.tokenId)
      )
      .where(eq(feeUpdateSchedule.tokenId, null));

    console.log(`[Migration] Found ${tokensWithoutSchedule.length} tokens without fee update schedules`);

    if (tokensWithoutSchedule.length === 0) {
      console.log('[Migration] No migration needed');
      return;
    }

    // Create fee update schedules for existing tokens
    let successCount = 0;
    let failCount = 0;

    for (const token of tokensWithoutSchedule) {
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
        console.log(`[Migration] ✓ Created schedule for token ${token.id}`);
      } catch (error) {
        failCount++;
        console.error(`[Migration] ✗ Failed to create schedule for token ${token.id}:`, error);
      }
    }

    console.log(`[Migration] Migration complete: ${successCount} succeeded, ${failCount} failed`);
  } catch (error) {
    console.error('[Migration] Error during migration:', error);
    process.exit(1);
  }
}

// Run the migration
migrateFeeUpdateSchedules()
  .then(() => {
    console.log('[Migration] ✓ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Migration] ✗ Migration failed:', error);
    process.exit(1);
  });