#!/usr/bin/env node

import { fileURLToPath } from "url";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _filename = fileURLToPath(import.meta.url);

// Set up environment
process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.env.NEXT_PUBLIC_SOLANA_NETWORK = "devnet";

// Import after env is set
const { dbService } = await import("./lib/db/service.js");

async function checkFees() {
  const tokens = await dbService.getAllTokens();
  console.log('Tokens with cumulative fees:');
  tokens.filter(t => t.cumulativeFeesSnapshot !== '0').forEach(t => {
    console.log(`Token ${t.id} (${t.symbol}): ${t.cumulativeFeesSnapshot} lamports, Updated: ${t.cumulativeFeesUpdatedAt}`);
  });
  
  console.log('\nAll tokens:');
  tokens.forEach(t => {
    console.log(`Token ${t.id} (${t.symbol}): ${t.cumulativeFeesSnapshot} lamports, Pool: ${t.poolAddress}`);
  });
}

checkFees().catch(console.error);