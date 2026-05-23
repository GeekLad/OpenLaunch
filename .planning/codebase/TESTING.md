# Testing Patterns

**Analysis Date:** 2026-05-23

## Test Framework

**Runner:**
- No formal test framework installed (Jest, Vitest, Mocha, Playwright, Cypress — none present)
- The only testing infrastructure is a hand-rolled smoke test script

**Assertion Library:**
- Custom `assert()` helper in `lib/db/test.ts`

**Run Commands:**
```bash
npm run db:test    # Run database smoke tests (tsx lib/db/test.ts)
# No other test commands exist
```

## Test File Organization

**Location:**
- `lib/db/test.ts` — single smoke test file for database operations
- No co-located `.test.ts` or `.spec.ts` files anywhere in the codebase

**Naming:**
- No naming convention for tests (only one test file exists)

**Structure:**
```
lib/db/test.ts          # Hand-rolled DB smoke tests
```

## Test Structure

**Suite Organization:**
```typescript
// From lib/db/test.ts
async function runTests(): Promise<void> {
  let passedTests = 0;
  let failedTests = 0;

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
    // Sequential numbered test blocks
    console.log('[Test 1] List all tokens');
    // ... assertions ...

    console.log('[Test 2] Get token by mint address');
    // ... assertions ...
  } catch (error) {
    console.error('[Test] Error during tests:', error);
    process.exit(1);
  }
}
```

**Patterns:**
- Sequential numbered tests (Test 1 through Test 10)
- Custom assertion helper with console output
- `try/catch` wrapper around entire test suite
- Manual pass/fail counting with exit codes
- Tests skip conditionally based on data state (e.g., "future launch")

## Mocking

**Framework:** None

**Patterns:**
- No mocking patterns exist
- The codebase relies on mock/fallback implementations within production code:
  - `mockIPFSUpload()` in `lib/services/ipfsService.ts`
  - `mockMetadataUpload()` in `lib/services/ipfsService.ts`
  - These are production fallbacks, not test mocks

**What to Mock:**
- Not applicable — no tests that would require mocking

**What NOT to Mock:**
- Not applicable

## Fixtures and Factories

**Test Data:**
- No fixture files or factory functions exist
- Smoke test reads from the actual database (assumes seed data exists)
- No test database isolation

**Location:**
- `lib/db/seed.ts` — production seed script, not test fixtures

## Coverage

**Requirements:** None enforced

**View Coverage:**
```bash
# No coverage tooling configured
```

## Test Types

**Unit Tests:**
- None exist
- All code in `lib/solana/`, `lib/services/`, `lib/meteora/`, `lib/db/` is untested by unit tests

**Integration Tests:**
- `lib/db/test.ts` — basic integration smoke test for Drizzle ORM + SQLite
- Tests real database queries (not a test database)
- Assumes tokens exist in the database

**E2E Tests:**
- Not used
- No Playwright, Cypress, or similar framework installed

## Common Patterns

**Async Testing:**
```typescript
// Pattern from lib/db/test.ts
try {
  const { tokens, total } = await dbService.listTokens({ limit: 10 });
  assert(tokens.length > 0, 'Should return at least one token');
} catch (error) {
  console.error('[Test] Error during tests:', error);
  process.exit(1);
}
```

**Error Testing:**
- No error-case tests exist
- All smoke tests assume happy-path data exists

## Where to Add New Tests

**If adding a test framework (recommended):**
- Unit tests for utilities: `lib/solana/__tests__/tokenUtils.test.ts`
- Unit tests for services: `lib/services/__tests__/launchService.test.ts`
- Unit tests for validation: `lib/validation/__tests__/startup.test.ts`
- Component tests: `components/forms/__tests__/TokenLaunchForm.test.tsx`
- API route tests: `app/api/tokens/__tests__/list.test.ts`

**Test database:**
- Create `lib/db/test-client.ts` with in-memory SQLite for isolated tests
- Use Drizzle's `better-sqlite3` with `:memory:` database

---

*Testing analysis: 2026-05-23*
