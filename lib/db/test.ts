import { dbService } from './service';

/**
 * Simple test script to verify database operations
 * This is a basic smoke test - for production, use a proper testing framework
 */

async function runTests(): Promise<void> {
  console.log('[Test] Starting database tests...\n');

  let passedTests = 0;
  let failedTests = 0;

  // Helper function for assertions
  function assert(condition: boolean, message: string): void {
    if (condition) {
      console.log(`✓ ${message}`);
      passedTests++;
    } else {
      console.error(`✗ ${message}`);
      failedTests++;
    }
  }

  try {
    // Test 1: List all tokens
    console.log('[Test 1] List all tokens');
    const { tokens, total } = await dbService.listTokens({ limit: 10 });
    assert(tokens.length > 0, 'Should return at least one token');
    assert(total >= tokens.length, 'Total count should be >= returned tokens');
    console.log(`  Found ${tokens.length} tokens (total: ${total})\n`);

    // Test 2: Get token by mint address
    console.log('[Test 2] Get token by mint address');
    const firstToken = tokens[0];
    const retrievedToken = await dbService.getToken(firstToken.mintAddress);
    assert(retrievedToken !== null, 'Should retrieve token by mint address');
    assert(retrievedToken?.id === firstToken.id, 'Retrieved token should match original');
    console.log(`  Retrieved: ${retrievedToken?.symbol}\n`);

    // Test 3: Search tokens
    console.log('[Test 3] Search tokens');
    const searchResults = await dbService.searchTokens(firstToken.symbol.substring(0, 3));
    assert(searchResults.length > 0, 'Search should return results');
    console.log(`  Search for "${firstToken.symbol.substring(0, 3)}" found ${searchResults.length} tokens\n`);

    // Test 4: Get latest pool stats
    console.log('[Test 4] Get latest pool stats');
    const poolStats = await dbService.getLatestPoolStats(firstToken.poolAddress);
    if (new Date(firstToken.launchDate) <= new Date()) {
      assert(poolStats !== null, 'Should have pool stats for launched token');
      console.log(`  Fees 24h: ${poolStats?.fees24h || 'N/A'}\n`);
    } else {
      console.log(`  Skipped (future launch)\n`);
    }

    // Test 5: List tokens sorted by fees
    console.log('[Test 5] List tokens sorted by fees');
    const { tokens: feeTokens } = await dbService.listTokens({
      sortBy: 'cumulativeFees',
      sortOrder: 'desc',
      limit: 10,
    });
    assert(feeTokens.length > 0, 'Should return tokens sorted by fees');
    console.log(`  Top token by fees: ${feeTokens[0].symbol} (${feeTokens[0].cumulativeFeesSnapshot} lamports)\n`);

    // Test 6: Get leaderboard
    console.log('[Test 6] Get leaderboard');
    const leaderboard = await dbService.getLeaderboard(10);
    assert(leaderboard.length > 0, 'Should return leaderboard entries');
    console.log(`  Leaderboard has ${leaderboard.length} entries\n`);

    // Test 7: Get fee update schedule
    console.log('[Test 7] Get fee update schedule');
    const schedule = await dbService.getFeeUpdateSchedule(firstToken.id);
    if (new Date(firstToken.launchDate) <= new Date()) {
      assert(schedule !== null, 'Should have update schedule for launched token');
      console.log(`  Next update interval: ${schedule?.updateIntervalMinutes} minutes\n`);
    } else {
      console.log(`  Skipped (future launch)\n`);
    }

    // Test 8: Get pools due for update
    console.log('[Test 8] Get pools due for update');
    const dueForUpdate = await dbService.getPoolsDueForUpdate(10);
    console.log(`  ${dueForUpdate.length} pools due for update\n`);

    // Test 9: Update cumulative fees
    console.log('[Test 9] Update cumulative fees');
    await dbService.updateCumulativeFeesSnapshot(firstToken.mintAddress, '2000000');
    const updatedToken = await dbService.getToken(firstToken.mintAddress);
    assert(
      updatedToken?.cumulativeFeesSnapshot === '2000000',
      'Should update cumulative fees snapshot'
    );
    console.log(`  Updated fees to: ${updatedToken?.cumulativeFeesSnapshot}\n`);

    // Test 10: Search by creator wallet
    console.log('[Test 10] Search by creator wallet');
    const creatorResults = await dbService.searchTokens(firstToken.creatorWallet);
    assert(creatorResults.length > 0, 'Should find tokens by creator wallet');
    console.log(`  Found ${creatorResults.length} tokens by creator\n`);

    // Summary
    console.log('='.repeat(50));
    console.log(`Tests completed: ${passedTests + failedTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log('='.repeat(50));

    if (failedTests === 0) {
      console.log('\n✓ All tests passed!');
      process.exit(0);
    } else {
      console.error('\n✗ Some tests failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('[Test] Error during tests:', error);
    process.exit(1);
  }
}

/**
 * CLI script to run tests
 * Usage: npm run db:test
 */
if (require.main === module) {
  runTests();
}
