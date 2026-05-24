import { NextRequest, NextResponse } from "next/server";
import {
  PINATA_API_KEY,
  PINATA_SECRET_KEY,
  FILEBASE_API_KEY,
} from "@/config/secrets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface IPFSUploadResult {
  uri: string;
  gateway: string;
  cid: string;
}

/**
 * Server-side API endpoint for uploading files to IPFS
 * This keeps API keys secure and not exposed to the client
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Try Pinata first if configured
    if (PINATA_API_KEY && PINATA_SECRET_KEY) {
      try {
        const result = await uploadToPinata(file);
        return NextResponse.json(result);
      } catch (error) {
        console.warn("Pinata upload failed:", error);
      }
    }

    // Try Filebase if configured
    if (FILEBASE_API_KEY) {
      try {
        const result = await uploadToFilebase(file);
        return NextResponse.json(result);
      } catch (error) {
        console.warn("Filebase upload failed:", error);
      }
    }

    // No IPFS service configured
    return NextResponse.json(
      { error: "IPFS upload service not configured. Please add PINATA_API_KEY/PINATA_SECRET_KEY or FILEBASE_API_KEY to your .env.local file." },
      { status: 503 }
    );
  } catch (error) {
    console.error("Error in upload-file API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    );
  }
}

/**
 * Upload file to Pinata IPFS service
 */
async function uploadToPinata(file: File): Promise<IPFSUploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  const metadata = JSON.stringify({
    name: file.name,
  });
  formData.append("pinataMetadata", metadata);

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      pinata_api_key: PINATA_API_KEY,
      pinata_secret_api_key: PINATA_SECRET_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Pinata upload failed: ${error.error || response.statusText}`);
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
 * Upload file to Filebase IPFS service
 */
async function uploadToFilebase(file: File): Promise<IPFSUploadResult> {
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
    throw new Error(`Filebase upload failed: ${response.statusText}`);
  }

  const result = await response.json();
  const cid = result.Hash;

  return {
    uri: `ipfs://${cid}`,
    gateway: `https://ipfs.filebase.io/ipfs/${cid}`,
    cid,
  };
}
