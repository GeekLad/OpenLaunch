import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

/**
 * Get database URL from environment or use default
 * Default: ./data/openlaunch.db (relative to project root)
 */
function getDatabaseUrl(): string {
  const dbUrl = process.env.DATABASE_URL || 'file:./data/openlaunch.db';

  // Remove 'file:' prefix if present
  return dbUrl.replace(/^file:/, '');
}

/**
 * Initialize SQLite database connection
 * Singleton pattern - only one connection is created
 */
let sqlite: Database.Database | null = null;

export function getSqlite(): Database.Database {
  if (!sqlite) {
    const dbPath = getDatabaseUrl();

    // Ensure absolute path
    const absolutePath = path.isAbsolute(dbPath)
      ? dbPath
      : path.join(process.cwd(), dbPath);

    // Create data directory if it doesn't exist
    const dbDir = path.dirname(absolutePath);
    if (!fs.existsSync(dbDir)) {
      console.log(`[Database] Creating data directory: ${dbDir}`);
      fs.mkdirSync(dbDir, { recursive: true });
    }

    console.log(`[Database] Connecting to: ${absolutePath}`);

    sqlite = new Database(absolutePath);

    // Enable foreign keys (important for cascade deletes)
    sqlite.pragma('foreign_keys = ON');

    // Performance optimizations for SQLite
    sqlite.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
    sqlite.pragma('synchronous = NORMAL'); // Balance between safety and performance

    console.log('[Database] Connected successfully');
  }

  return sqlite;
}

/**
 * Drizzle ORM instance with schema
 * Use this for all database operations
 * Uses lazy initialization to prevent premature database creation
 */
let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    _db = drizzle(getSqlite(), { schema });
  }
  return _db;
}

// Maintain backwards compatibility with direct db export
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    return getDb()[prop as keyof ReturnType<typeof drizzle>];
  }
});

/**
 * Close database connection
 * Useful for testing and graceful shutdowns
 */
export function closeDatabase(): void {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    console.log('[Database] Connection closed');
  }
}

/**
 * Health check - verify database connection is working
 */
export function checkDatabaseHealth(): boolean {
  try {
    const sqlite = getSqlite();
    const result = sqlite.prepare('SELECT 1 as health').get() as { health: number };
    return result.health === 1;
  } catch (error) {
    console.error('[Database] Health check failed:', error);
    return false;
  }
}
