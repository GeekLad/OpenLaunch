import { SERVER_ENV } from "@/config/environment";
import { getSqlite } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";
import path from "path";
import fs from "fs";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface StartupValidationResult extends ValidationResult {
  databaseConfigured: boolean;
  ipfsConfigured: boolean;
}

/**
 * Validates database configuration and connectivity
 * Automatically initializes database and runs migrations if needed
 */
async function validateDatabase(): Promise<{ isValid: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    // Get database path from DATA_DIR environment variable or default
    // Database filename is hardcoded to openlaunch.db
    const dataDir = process.env.DATA_DIR || './data';
    const dbPath = path.join(dataDir, 'openlaunch.db');

    // Convert to absolute path
    const absolutePath = path.isAbsolute(dbPath)
      ? dbPath
      : path.join(process.cwd(), dbPath);

    // Check if database file exists (directory will be auto-created by getSqlite)
    const dbExists = fs.existsSync(absolutePath);

    if (!dbExists) {
      console.log('[Database] Database file does not exist, initializing...');
    }

    // Connect to database (this will auto-create the data directory)
    const sqlite = getSqlite();

    // If database didn't exist, run migrations to set up schema
    if (!dbExists) {
      console.log('[Database] Running initial migrations...');
      await runMigrations();
      console.log('[Database] Database initialized successfully');
    }

    // Verify database health
    const result = sqlite.prepare('SELECT 1 as health').get() as { health: number };

    if (result.health !== 1) {
      errors.push('Database health check failed');
      return { isValid: false, errors };
    }

  } catch (error) {
    errors.push(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { isValid: false, errors };
  }

  return { isValid: true, errors: [] };
}

/**
 * Validates IPFS service configuration
 */
function validateIPFS(): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if any IPFS service is configured
  const hasPinata = !!(SERVER_ENV.PINATA_API_KEY && SERVER_ENV.PINATA_SECRET_KEY);
  const hasFilebase = !!SERVER_ENV.FILEBASE_API_KEY;

  if (!hasPinata && !hasFilebase) {
    errors.push('No IPFS service is configured');
    errors.push('Please configure one of the following:');
    errors.push('  • Pinata: Set PINATA_API_KEY and PINATA_SECRET_KEY');
    errors.push('  • Filebase: Set FILEBASE_API_KEY');
    errors.push('');
    errors.push('Create a .env.local file with your IPFS credentials:');
    errors.push('  # For Pinata');
    errors.push('  PINATA_API_KEY=your_pinata_api_key');
    errors.push('  PINATA_SECRET_KEY=your_pinata_secret_key');
    errors.push('');
    errors.push('  # OR for Filebase');
    errors.push('  FILEBASE_API_KEY=your_filebase_api_key');
    return { isValid: false, errors, warnings };
  }

  // Validate Pinata configuration if present
  if (SERVER_ENV.PINATA_API_KEY && !SERVER_ENV.PINATA_SECRET_KEY) {
    warnings.push('PINATA_API_KEY is set but PINATA_SECRET_KEY is missing');
  } else if (!SERVER_ENV.PINATA_API_KEY && SERVER_ENV.PINATA_SECRET_KEY) {
    warnings.push('PINATA_SECRET_KEY is set but PINATA_API_KEY is missing');
  }

  return { isValid: true, errors: [], warnings };
}

/**
 * Validates all required services for the application to start
 */
export async function validateStartupConfig(): Promise<StartupValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate database
  const dbValidation = await validateDatabase();
  if (!dbValidation.isValid) {
    errors.push(...dbValidation.errors);
  }

  // Validate IPFS
  const ipfsValidation = validateIPFS();
  if (!ipfsValidation.isValid) {
    errors.push(...ipfsValidation.errors);
  }
  warnings.push(...ipfsValidation.warnings);

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    warnings,
    databaseConfigured: dbValidation.isValid,
    ipfsConfigured: ipfsValidation.isValid,
  };
}

/**
 * Prints validation results to console in a formatted way
 */
export function printValidationResults(result: StartupValidationResult): void {
  console.log('\n🚀 OpenLaunch Startup Validation');
  console.log('=====================================');

  if (result.isValid) {
    console.log('✅ All validations passed!');
  } else {
    console.log('❌ Validation failed with errors:');
  }

  // Print errors
  if (result.errors.length > 0) {
    console.log('\n🔴 Errors:');
    result.errors.forEach(error => {
      console.log(`   • ${error}`);
    });
  }

  // Print warnings
  if (result.warnings.length > 0) {
    console.log('\n🟡 Warnings:');
    result.warnings.forEach(warning => {
      console.log(`   • ${warning}`);
    });
  }

  // Print status summary
  console.log('\n📊 Status Summary:');
  console.log(`   • Database: ${result.databaseConfigured ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   • IPFS: ${result.ipfsConfigured ? '✅ Configured' : '❌ Not configured'}`);

  if (!result.isValid) {
    console.log('\n💡 To fix these issues:');
    console.log('   1. Create a .env.local file in your project root');
    console.log('   2. Copy the required environment variables from .env.local.example');
    console.log('   3. Fill in your actual values');
    console.log('   4. Restart the application');
    console.log('');
    console.log('   Note: The database will be automatically created on first run');
  }

  console.log('=====================================\n');
}

/**
 * Validates startup configuration and throws an error if validation fails
 * This is intended to be called during application initialization
 */
export async function requireValidStartupConfig(): Promise<void> {
  const result = await validateStartupConfig();

  // Always print validation results for visibility
  printValidationResults(result);

  if (!result.isValid) {
    throw new Error('Startup validation failed. Please fix the configuration errors above.');
  }
}