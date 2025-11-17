import { ENV } from "@/config/environment";
import { TokenMetadata } from "@/types/token";

/**
 * Gets the maximum allowed image size in bytes
 * Configured via NEXT_PUBLIC_MAX_IMAGE_SIZE_MB environment variable (default: 1MB)
 */
export function getMaxImageSizeBytes(): number {
  return ENV.MAX_IMAGE_SIZE_MB * 1024 * 1024;
}

/**
 * Gets the maximum allowed image size in MB
 */
export function getMaxImageSizeMB(): number {
  return ENV.MAX_IMAGE_SIZE_MB;
}

export interface IPFSUploadResult {
  uri: string;
  gateway: string;
  cid: string;
}

/**
 * Uploads a file to IPFS via server-side API endpoint
 * This keeps API keys secure by handling uploads server-side
 * @param file - File to upload
 * @returns IPFS URI
 */
export async function uploadFileToIPFS(file: File): Promise<IPFSUploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("/api/ipfs/upload-file", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`IPFS upload failed: ${error.error || response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error uploading file to IPFS:", error);
    throw error;
  }
}

/**
 * Uploads JSON metadata to IPFS via server-side API endpoint
 * This keeps API keys secure by handling uploads server-side
 * @param metadata - TokenMetadata object
 * @returns IPFS URI
 */
export async function uploadMetadataToIPFS(metadata: TokenMetadata): Promise<IPFSUploadResult> {
  try {
    const response = await fetch("/api/ipfs/upload-metadata", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Metadata upload failed: ${error.error || response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error uploading metadata to IPFS:", error);
    throw error;
  }
}

export interface TokenAssetsUploadResult {
  metadataUri: string;
  metadataGateway: string;
  metadataCid: string;
  imageUri: string;
  imageGateway: string;
  imageCid: string;
  completeMetadata: TokenMetadata;
}

/**
 * Uploads both image and metadata to IPFS
 * @param logoFile - Logo image file
 * @param metadata - Token metadata (without image URI)
 * @returns Complete upload result with both image and metadata URIs
 */
export async function uploadTokenAssets(
  logoFile: File,
  metadata: Omit<TokenMetadata, "image">
): Promise<TokenAssetsUploadResult> {
  // First, upload the image
  const imageResult = await uploadFileToIPFS(logoFile);

  // Then, upload metadata with the image URI
  const completeMetadata: TokenMetadata = {
    ...metadata,
    image: imageResult.gateway, // Use gateway URL for better compatibility
  };

  const metadataResult = await uploadMetadataToIPFS(completeMetadata);

  return {
    metadataUri: metadataResult.uri,
    metadataGateway: metadataResult.gateway,
    metadataCid: metadataResult.cid,
    imageUri: imageResult.uri,
    imageGateway: imageResult.gateway,
    imageCid: imageResult.cid,
    completeMetadata,
  };
}

/**
 * Note: File and metadata uploads to Filebase and Pinata are now handled
 * server-side via /api/ipfs/upload-file and /api/ipfs/upload-metadata endpoints.
 * This keeps API keys secure and prevents exposure to the client.
 */

/**
 * Mock upload for testing without IPFS credentials
 * @param file - File to mock upload
 * @returns Mock IPFS URI
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function mockIPFSUpload(_file: File): Promise<IPFSUploadResult> {
  // Simulate upload delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const mockCid = `Qm${Math.random().toString(36).substring(2, 15)}`;

  return {
    uri: `ipfs://${mockCid}`,
    gateway: `${ENV.IPFS_GATEWAY}${mockCid}`,
    cid: mockCid,
  };
}

/**
 * Mock metadata upload for testing
 * @param metadata - Metadata to mock upload
 * @returns Mock IPFS URI
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function mockMetadataUpload(_metadata: TokenMetadata): Promise<IPFSUploadResult> {
  // Simulate upload delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  const mockCid = `Qm${Math.random().toString(36).substring(2, 15)}`;

  return {
    uri: `ipfs://${mockCid}`,
    gateway: `${ENV.IPFS_GATEWAY}${mockCid}`,
    cid: mockCid,
  };
}

/**
 * Validates file type for logo upload
 * @param file - File to validate
 * @returns true if valid
 */
export function validateImageFile(file: File): boolean {
  const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];

  if (!validTypes.includes(file.type)) {
    throw new Error("Invalid file type. Please upload PNG, JPG, GIF, or WebP");
  }

  // Check file size (configurable via environment variable, default 1MB)
  const maxSize = getMaxImageSizeBytes();
  const maxSizeMB = getMaxImageSizeMB();
  if (file.size > maxSize) {
    throw new Error(`File size too large. Maximum size is ${maxSizeMB}MB`);
  }

  return true;
}

/**
 * Converts IPFS URI to HTTP gateway URL
 * @param ipfsUri - IPFS URI (ipfs://...)
 * @param gateway - Optional custom gateway URL
 * @returns HTTP gateway URL
 */
export function ipfsToHttp(ipfsUri: string, gateway?: string): string {
  if (ipfsUri.startsWith("ipfs://")) {
    const cid = ipfsUri.replace("ipfs://", "");
    const gatewayUrl = gateway || ENV.IPFS_GATEWAY;
    return `${gatewayUrl}${cid}`;
  }
  return ipfsUri;
}

/**
 * Fetches JSON content from IPFS
 * @param ipfsUri - IPFS URI (ipfs://... or http://...)
 * @param gateway - Optional custom gateway URL
 * @returns Parsed JSON content
 */
export async function fetchFromIPFS<T = unknown>(ipfsUri: string, gateway?: string): Promise<T> {
  const httpUrl = ipfsToHttp(ipfsUri, gateway);

  try {
    const response = await fetch(httpUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error("Error fetching from IPFS:", error);
    throw error;
  }
}

/**
 * Fetches token metadata from IPFS
 * @param metadataUri - Metadata URI from on-chain data
 * @returns TokenMetadata object
 */
export async function fetchTokenMetadata(metadataUri: string): Promise<TokenMetadata> {
  return fetchFromIPFS<TokenMetadata>(metadataUri);
}
