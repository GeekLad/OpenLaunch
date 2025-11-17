import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { TokenMetadata } from "@/types/token";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { createMetadataAccountV3 } from "@metaplex-foundation/mpl-token-metadata";
import {
    publicKey as umiPublicKey,
    createNoopSigner,
} from "@metaplex-foundation/umi";
import { toWeb3JsInstruction } from "@metaplex-foundation/umi-web3js-adapters";
import { ENV } from "@/config/environment";

// Metaplex Token Metadata Program ID
export const METADATA_PROGRAM_ID = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
);

/**
 * Derives the metadata account address for a given mint
 * @param mint - The mint public key
 * @returns The metadata account public key
 */
export function getMetadataAccount(mint: PublicKey): PublicKey {
    const [metadataAccount] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("metadata"),
            METADATA_PROGRAM_ID.toBuffer(),
            mint.toBuffer(),
        ],
        METADATA_PROGRAM_ID,
    );
    return metadataAccount;
}

export interface CreateMetadataParams {
    connection: Connection;
    mint: PublicKey;
    mintAuthority: PublicKey;
    payer: PublicKey;
    updateAuthority: PublicKey;
    metadata: TokenMetadata;
    uri: string;
}

/**
 * Creates a metadata account for a token mint using Metaplex Token Metadata Program
 * @param params - CreateMetadataParams
 * @returns Transaction to create metadata account
 */
export async function createMetadataAccount(
    params: CreateMetadataParams,
): Promise<Transaction> {
    const {
        connection,
        mint,
        mintAuthority,
        payer,
        updateAuthority,
        metadata,
        uri,
    } = params;

    // Create a UMI instance with the same RPC endpoint as the connection
    const umi = createUmi(connection.rpcEndpoint);

    // Convert web3.js PublicKeys to UMI PublicKeys
    const mintPubkey = umiPublicKey(mint.toBase58());
    const mintAuthorityPubkey = umiPublicKey(mintAuthority.toBase58());
    const payerPubkey = umiPublicKey(payer.toBase58());
    const updateAuthorityPubkey = umiPublicKey(updateAuthority.toBase58());

    // Derive the metadata account PDA
    const metadataAccount = getMetadataAccount(mint);
    const metadataPubkey = umiPublicKey(metadataAccount.toBase58());

    // Create the metadata instruction using UMI
    const createMetadataInstruction = createMetadataAccountV3(umi, {
        metadata: metadataPubkey,
        mint: mintPubkey,
        mintAuthority: createNoopSigner(mintAuthorityPubkey),
        payer: createNoopSigner(payerPubkey),
        updateAuthority: updateAuthorityPubkey,
        data: {
            name: metadata.name,
            symbol: metadata.symbol,
            uri: uri,
            sellerFeeBasisPoints: 0, // 0% royalty for meme tokens
            creators: null,
            collection: null,
            uses: null,
        },
        isMutable: ENV.METADATA_MUTABLE, // Controlled by NEXT_PUBLIC_METADATA_MUTABLE env variable
        collectionDetails: null,
    });

    // Convert UMI instruction to web3.js instruction
    const web3JsInstruction = toWeb3JsInstruction(
        createMetadataInstruction.getInstructions()[0],
    );

    const transaction = new Transaction().add(web3JsInstruction);
    return transaction;
}

/**
 * Formats token metadata to JSON for IPFS upload
 * @param metadata - TokenMetadata object
 * @returns JSON string of metadata
 */
export function formatMetadataJson(metadata: TokenMetadata): string {
    return JSON.stringify(metadata, null, 2);
}

/**
 * Validates metadata structure
 * @param metadata - TokenMetadata to validate
 * @returns true if valid, throws error otherwise
 */
export function validateMetadata(metadata: TokenMetadata): boolean {
    if (!metadata.name || metadata.name.length === 0) {
        throw new Error("Metadata name is required");
    }

    if (!metadata.symbol || metadata.symbol.length === 0) {
        throw new Error("Metadata symbol is required");
    }

    if (!metadata.image || metadata.image.length === 0) {
        throw new Error("Metadata image is required");
    }

    if (metadata.name.length > 32) {
        throw new Error("Metadata name must be 32 characters or less");
    }

    if (metadata.symbol.length > 10) {
        throw new Error("Metadata symbol must be 10 characters or less");
    }

    return true;
}

/**
 * Gets metadata account information
 * @param connection - Solana connection
 * @param mint - The mint address
 * @returns Metadata account data
 */
export async function getMetadata(connection: Connection, mint: PublicKey) {
    const metadataAccount = getMetadataAccount(mint);

    try {
        const accountInfo = await connection.getAccountInfo(metadataAccount);

        if (!accountInfo) {
            throw new Error("Metadata account not found");
        }

        return {
            address: metadataAccount,
            data: accountInfo.data,
        };
    } catch (error) {
        console.error("Error fetching metadata:", error);
        throw error;
    }
}

/**
 * Checks if metadata account exists for a mint
 * @param connection - Solana connection
 * @param mint - The mint address
 * @returns true if metadata exists, false otherwise
 */
export async function metadataExists(
    connection: Connection,
    mint: PublicKey,
): Promise<boolean> {
    const metadataAccount = getMetadataAccount(mint);

    try {
        const accountInfo = await connection.getAccountInfo(metadataAccount);
        return accountInfo !== null;
    } catch {
        return false;
    }
}

/**
 * Revokes metadata update authority permanently by setting isMutable to false
 * This makes the metadata immutable - it can never be changed again
 * @param mint - The mint address
 * @param currentUpdateAuthority - The current update authority
 * @returns Transaction to revoke update authority
 */
export async function revokeMetadataAuthority(
    mint: PublicKey,
    currentUpdateAuthority: PublicKey,
): Promise<Transaction> {
    const umi = createUmi("https://api.mainnet-beta.solana.com"); // Placeholder, will use actual connection

    // Convert web3.js PublicKeys to UMI PublicKeys
    const mintPubkey = umiPublicKey(mint.toBase58());
    const authorityPubkey = umiPublicKey(currentUpdateAuthority.toBase58());

    // Create a noop signer for the authority (we're just building instructions, not signing yet)
    const authoritySigner = createNoopSigner(authorityPubkey);
    umi.use({
        install: (umi) => {
            umi.payer = authoritySigner;
        },
    });

    // Import the updateV1 function from Metaplex
    const { updateV1 } = await import(
        "@metaplex-foundation/mpl-token-metadata"
    );

    // Create instruction to make metadata immutable
    // Setting isMutable to false prevents any future updates
    const updateInstruction = updateV1(umi, {
        mint: mintPubkey,
        authority: authoritySigner,
        isMutable: false, // This makes the metadata permanently immutable
    });

    // Convert UMI instruction to web3.js instruction
    const web3JsInstruction = toWeb3JsInstruction(
        updateInstruction.getInstructions()[0],
    );

    const transaction = new Transaction().add(web3JsInstruction);
    return transaction;
}

/**
 * Builds token metadata object from form inputs
 * @param name - Token name
 * @param symbol - Token symbol
 * @param imageUri - IPFS URI of the token logo
 * @param description - Token description
 * @param socials - Optional social media links
 * @returns TokenMetadata object
 */
export function buildMetadata(
    name: string,
    symbol: string,
    imageUri: string,
    description?: string,
    socials?: {
        website?: string;
        twitter?: string;
        telegram?: string;
        discord?: string;
        launchpad?: string;
    },
): TokenMetadata {
    const metadata: TokenMetadata = {
        name,
        symbol,
        image: imageUri,
        description:
            description ||
            `${name} is a meme token launched on Solana via ${ENV.APP_NAME}`,
    };

    // Add external URL if website is provided
    if (socials?.website) {
        metadata.external_url = socials.website;
    }

    // Add social links as attributes
    const attributes: Array<{ trait_type: string; value: string }> = [];

    if (socials?.twitter) {
        attributes.push({ trait_type: "Twitter", value: socials.twitter });
    }

    if (socials?.telegram) {
        attributes.push({ trait_type: "Telegram", value: socials.telegram });
    }

    if (socials?.discord) {
        attributes.push({ trait_type: "Discord", value: socials.discord });
    }

    if (socials?.launchpad) {
        attributes.push({ trait_type: "Launchpad", value: socials.launchpad });
    }

    if (attributes.length > 0) {
        metadata.attributes = attributes;
    }

    // Add properties
    metadata.properties = {
        files: [
            {
                uri: imageUri,
                type: "image/png",
            },
        ],
        category: "image",
    };

    return metadata;
}
