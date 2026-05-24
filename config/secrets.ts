/**
 * Server-side secrets only.
 *
 * These values are read from environment variables and must NEVER be
 * imported in client-side code (browser bundles or "use client" components).
 */
export const PINATA_API_KEY = process.env.PINATA_API_KEY || "";
export const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY || "";
export const FILEBASE_API_KEY = process.env.FILEBASE_API_KEY || "";

// Optional runtime overrides
export const DATA_DIR = process.env.DATA_DIR || "./data";
export const DATABASE_TYPE = process.env.DATABASE_TYPE || "sqlite";
