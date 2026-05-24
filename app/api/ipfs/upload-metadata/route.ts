import { NextRequest, NextResponse } from "next/server";
import {
  PINATA_API_KEY,
  PINATA_SECRET_KEY,
  FILEBASE_API_KEY,
} from "@/config/secrets";
import { TokenMetadata } from "@/types/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface IPFSUploadResult {
  uri: string;
  gateway: string;
  cid: string;
}

/**
 * Server-side API endpoint for uploading metadata to IPFS
 * This keeps API keys secure and not exposed to the client
 */
export async function POST(request: NextRequest) {
  try {
    const metadata = await request.json() as TokenMetadata;

    if (!metadata || !metadata.name || !metadata.symbol) {
      return NextResponse.json(
        { error: "Invalid metadata provided" },
        { status: 400 }
      );
    }

    // Try Pinata first if configured
    if (PINATA_API_KEY && PINATA_SECRET_KEY) {
      try {
        const result = await uploadToPinata(metadata);
        return NextResponse.json(result);
      } catch (error) {
        console.warn("Pinata metadata upload failed:", error);
      }
    }

    // Try Filebase if configured
    if (FILEBASE_API_KEY) {
      try {
        const result = await uploadToFilebase(metadata);
        return NextResponse.json(result);
      } catch (error) {
        console.warn("Filebase metadata upload failed:", error);
      }
    }

    // No IPFS service configured
    return NextResponse.json(
      { error: "IPFS upload service not configured. Please add PINATA_API_KEY/PINATA_SECRET_KEY or FILEBASE_API_KEY to your .env.local file." },
      { status: 503 }
    );
  } catch (error) {
    console.error("Error in upload-metadata API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    );
  }
}

/**
 * Upload metadata to Pinata IPFS service
 */
async function uploadToPinata(metadata: TokenMetadata): Promise<IPFSUploadResult> {
  const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      pinata_api_key: PINATA_API_KEY,
      pinata_secret_api_key: PINATA_SECRET_KEY,
    },
    body: JSON.stringify({
      pinataContent: metadata,
      pinataMetadata: {
        name: `${metadata.symbol}-metadata.json`,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Pinata metadata upload failed: ${error.error || response.statusText}`);
  }

  const result = await response.json();
  const cid = result.IpfsHash;

  return {
    uri: `ipfs://${cid}`,
    gateway: `https://gateway.pinata.cloud/ipfs/${cid}`,
    cid,
  };
}

/**
 * Upload metadata to Filebase IPFS service
 */
async function uploadToFilebase(metadata: TokenMetadata): Promise<IPFSUploadResult> {
  // Create a blob from the JSON metadata
  const blob = new Blob([JSON.stringify(metadata)], { type: "application/json" });
  const file = new File([blob], `${metadata.symbol}-metadata.json`, { type: "application/json" });

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("https://rpc.filebase.io/api/v0/add", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FILEBASE_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Filebase metadata upload failed: ${response.statusText}`);
  }

  const result = await response.json();
  const cid = result.Hash;

  return {
    uri: `ipfs://${cid}`,
    gateway: `https://ipfs.filebase.io/ipfs/${cid}`,
    cid,
  };
}
