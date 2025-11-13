import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

export interface KeypairValidationResult {
  isValid: boolean;
  error?: string;
  keypair?: Keypair;
}

/**
 * Detects and validates a private key in either JSON array format or base58 format
 * @param privateKeyInput - The private key string (JSON array or base58)
 * @returns KeypairValidationResult with validation status and keypair if valid
 */
export function validateAndParsePrivateKey(privateKeyInput: string): KeypairValidationResult {
  if (!privateKeyInput || privateKeyInput.trim() === "") {
    return {
      isValid: false,
      error: "Private key cannot be empty",
    };
  }

  const trimmedInput = privateKeyInput.trim();

  // Try to detect format and parse accordingly
  try {
    // Check if it's a JSON array format
    if (trimmedInput.startsWith("[") && trimmedInput.endsWith("]")) {
      return parseJsonArrayPrivateKey(trimmedInput);
    }

    // Otherwise, assume it's base58 format
    return parseBase58PrivateKey(trimmedInput);
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "Failed to parse private key",
    };
  }
}

/**
 * Parses a private key from JSON array format [1,2,3,...]
 */
function parseJsonArrayPrivateKey(input: string): KeypairValidationResult {
  try {
    const parsed = JSON.parse(input);

    if (!Array.isArray(parsed)) {
      return {
        isValid: false,
        error: "JSON input must be an array of numbers",
      };
    }

    if (parsed.length !== 64) {
      return {
        isValid: false,
        error: `Private key must be 64 bytes, got ${parsed.length} bytes`,
      };
    }

    // Validate all elements are numbers between 0-255
    for (let i = 0; i < parsed.length; i++) {
      if (typeof parsed[i] !== "number" || parsed[i] < 0 || parsed[i] > 255 || !Number.isInteger(parsed[i])) {
        return {
          isValid: false,
          error: `Invalid byte at index ${i}: must be an integer between 0-255`,
        };
      }
    }

    const secretKey = Uint8Array.from(parsed);
    const keypair = Keypair.fromSecretKey(secretKey);

    return {
      isValid: true,
      keypair,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "Failed to parse JSON array",
    };
  }
}

/**
 * Parses a private key from base58 format
 */
function parseBase58PrivateKey(input: string): KeypairValidationResult {
  try {
    const decoded = bs58.decode(input);

    if (decoded.length !== 64) {
      return {
        isValid: false,
        error: `Private key must be 64 bytes, got ${decoded.length} bytes. Make sure you're using the private key, not the public key.`,
      };
    }

    const keypair = Keypair.fromSecretKey(decoded);

    return {
      isValid: true,
      keypair,
    };
  } catch (error) {
    return {
      isValid: false,
      error: "Invalid base58 format. Please check your private key.",
    };
  }
}

/**
 * Exports a keypair's secret key to base58 format
 */
export function exportKeypairToBase58(keypair: Keypair): string {
  return bs58.encode(keypair.secretKey);
}

/**
 * Exports a keypair's secret key to JSON array format
 */
export function exportKeypairToJsonArray(keypair: Keypair): string {
  return JSON.stringify(Array.from(keypair.secretKey));
}
