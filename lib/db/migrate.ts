import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './client';
import path from 'path';

/**
 * Run database migrations
 * This will execute all pending migrations in the migrations folder
 */
export async function runMigrations(): Promise<void> {
  console.log('[Migrations] Starting database migrations...');

  try {
    const migrationsFolder = path.join(process.cwd(), 'lib/db/migrations');

    migrate(db, { migrationsFolder });

    console.log('[Migrations] All migrations completed successfully ✓');
  } catch (error) {
    console.error('[Migrations] Failed to run migrations:', error);
    throw error;
  }
}

/**
 * CLI script to run migrations
 * Usage: tsx lib/db/migrate.ts
 */
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('[Migrations] Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Migrations] Error:', error);
      process.exit(1);
    });
}
