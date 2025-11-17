import type { Config } from 'drizzle-kit';
import path from 'path';

// Get database path from DATA_DIR environment variable or use default
// Database filename is hardcoded to openlaunch.db
const dataDir = process.env.DATA_DIR || './data';
const dbPath = path.join(dataDir, 'openlaunch.db');

export default {
  schema: './lib/db/schema/index.ts',
  out: './lib/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: dbPath,
  },
  verbose: true,
  strict: true,
} satisfies Config;
