# OpenLaunch - Meme Token DAMMv2 Launchpad

A client-side decentralized application for launching SPL tokens on Solana with DAMMv2 liquidity integration and permanent authority revocation.

## Features

- **Client-Side Deployment**: All transactions are signed by the user's connected wallet
- **DAMMv2 Integration**: Single-sided liquidity deployment using Meteora's Dynamic AMM
- **Security First**: Mint and freeze authorities are permanently revoked
- **Fee Scheduling**: Configure dynamic fees that decay over time
- **Timed Launch**: Schedule your token launch for a specific date and time
- **IPFS Metadata**: Token metadata and images stored on IPFS
- **Real-time Status**: Live progress updates during token deployment

## Tech Stack

- **Frontend**: Next.js 14+ with TypeScript
- **Styling**: Tailwind CSS + Shadcn/ui components
- **Blockchain**: Solana Web3.js, SPL Token
- **Wallet**: Solana Wallet Adapter
- **Metadata**: Metaplex Token Metadata
- **Storage**: IPFS (Pinata)
- **Form Handling**: React Hook Form + Zod validation

## Project Structure

```
openlaunch/
├── app/                          # Next.js app directory
│   ├── launch/                   # Token launch page
│   ├── layout.tsx               # Root layout with providers
│   ├── page.tsx                 # Landing page
│   └── globals.css              # Global styles
├── components/
│   ├── forms/
│   │   └── TokenLaunchForm.tsx  # Main token creation form
│   ├── providers/
│   │   └── SolanaProvider.tsx   # Wallet adapter provider
│   └── ui/                      # Reusable UI components
├── lib/
│   ├── solana/
│   │   ├── connection.ts        # Solana RPC connection
│   │   ├── tokenUtils.ts        # Token mint operations
│   │   ├── metadataUtils.ts     # Metadata creation
│   │   └── poolUtils.ts         # DAMMv2 pool integration
│   ├── services/
│   │   ├── ipfsService.ts       # IPFS upload service
│   │   └── launchService.ts     # Main token launch orchestration
│   └── utils.ts                 # Utility functions
├── types/
│   └── token.ts                 # TypeScript type definitions
├── config/
│   └── environment.ts           # Environment configuration
└── .env.local.example           # Environment variables template
```

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Solana wallet (Phantom, Solflare, etc.)
- SOL for transaction fees

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd openlaunch
```

2. Install dependencies:
```bash
npm install
```

3. Create environment configuration:
```bash
cp .env.local.example .env.local
```

4. Configure environment variables in `.env.local`:
```env
# Solana Configuration
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_QUOTE_TOKEN_MINT=So11111111111111111111111111111111111111112

# Token Configuration
NEXT_PUBLIC_TOKEN_DECIMALS=9
NEXT_PUBLIC_TOTAL_SUPPLY=1000000000

# Metadata Configuration
# NEXT_PUBLIC_METADATA_MUTABLE=false  # Set to 'true' to allow metadata updates (default: false)

# Pricing
NEXT_PUBLIC_INITIAL_PRICE=0.00001
NEXT_PUBLIC_PRICE_RANGE_MIN=0.000001
NEXT_PUBLIC_PRICE_RANGE_MAX=0.0001

# Fee Schedule
NEXT_PUBLIC_FEE_DECAY_DURATION_MINUTES=60

# IPFS Gateway (Public)
NEXT_PUBLIC_IPFS_GATEWAY=https://ipfs.io/ipfs/
NEXT_PUBLIC_MAX_IMAGE_SIZE_MB=1

# IPFS Upload Service (Private - Server-side only)
# Choose ONE option below:
# Option 1: Pinata
PINATA_API_KEY=your_api_key
PINATA_SECRET_KEY=your_secret_key
# Option 2: Filebase
# FILEBASE_API_KEY=your_api_key
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Launching a Token

1. **Connect Wallet**: Click "Connect Wallet" and select your Solana wallet
2. **Fill Token Details**:
   - Token Symbol (e.g., DOGE)
   - Token Name (e.g., Dogecoin)
   - Upload logo image (PNG/JPG/GIF/WebP, max 1MB by default, configurable)
3. **Configure Fee Schedule** (optional):
   - Enable fee scheduler
   - Set starting and ending fee rates
4. **Set Launch Time** (optional):
   - Enable timed launch
   - Choose launch date and time
5. **Add Social Links** (optional):
   - Website, Twitter, Telegram, Discord
6. **Launch**: Click "Launch Token" and approve transactions in your wallet

### Transaction Flow

The launch process executes the following steps in 3 transactions (single approval):

1. **Mint Creation**: Creates the SPL token mint with 9 decimals
2. **Token Setup**: Mints 100% of supply, creates metadata, and revokes authorities
3. **Pool Creation**: Creates DAMMv2 pool with single-sided liquidity and optional timed launch

## DAMMv2 Integration

The DAMMv2 pool integration is **fully implemented** using the `@meteora-ag/cp-amm-sdk`:

- **Single-sided liquidity**: 100% token supply deposited with 0 SOL
- **Dynamic fees**: Configurable fee scheduler with exponential decay
- **Timed launch**: Optional scheduled activation at a specific timestamp
- **Liquidity locking**: 100% of liquidity permanently locked
- **Fee collection**: Collects fees in quote token (SOL) only

Key implementation in [lib/solana/poolUtils.ts](lib/solana/poolUtils.ts):
   - `createDAMMv2Pool()`: Creates pool with custom configuration
   - `priceToSqrtPrice()`: Converts human-readable price to Q64 format
   - `getPoolInfo()`: Fetches pool state information

## Configuration

### Token Parameters

All token parameters are configured via environment variables:

- **TOTAL_SUPPLY**: Default 1,000,000,000 tokens
- **TOKEN_DECIMALS**: Fixed at 9 decimals
- **QUOTE_TOKEN_MINT**: Fixed to SOL (Wrapped SOL)

### Metadata Configuration

- **METADATA_MUTABLE**: Controls whether token metadata can be updated after creation
  - Default: `false` (metadata is immutable)
  - Set to `true` to allow metadata updates
  - **Security Note**: Immutable metadata (default) provides maximum trust and transparency
  - Mutable metadata allows updates but may reduce community trust

### Fee Schedule

- **Starting Fee Rate**: Default 50%
- **Ending Fee Rate**: Default 1%
- **Decay Duration**: Default 60 minutes

### Pricing

- **Initial Price**: 0.00001 SOL
- **Price Range Min**: 0.000001 SOL
- **Price Range Max**: 0.0001 SOL

## Security Considerations

- All transactions are client-side and signed by the user's wallet
- No backend custody of private keys or funds
- Mint and freeze authorities are permanently revoked after deployment
- Token metadata is immutable by default (configurable via `NEXT_PUBLIC_METADATA_MUTABLE`)
- IPFS metadata is immutable once uploaded
- Smart contract interactions should be audited before mainnet deployment

## Development

### Build for Production

```bash
npm run build
```

### Run Production Server

```bash
npm run start
```

### Lint Code

```bash
npm run lint
```

## Troubleshooting

### Wallet Connection Issues

- Ensure your wallet extension is installed and unlocked
- Try refreshing the page
- Check that you're on the correct network (mainnet-beta or devnet)

### Transaction Failures

- Ensure you have sufficient SOL for transaction fees
- Check RPC connection status
- Verify all form inputs are valid

### IPFS Upload Errors

- Verify IPFS service credentials in `.env.local` (PINATA_API_KEY/PINATA_SECRET_KEY or FILEBASE_API_KEY)
- Note: API keys are now server-side only (no NEXT_PUBLIC_ prefix) for security
- Check file size (configurable via NEXT_PUBLIC_MAX_IMAGE_SIZE_MB, default 1MB)
- Fallback to mock upload for testing without credentials

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## License

MIT License - see LICENSE file for details

## Resources

- [Solana Documentation](https://docs.solana.com/)
- [Meteora Documentation](https://docs.meteora.ag/)
- [Metaplex Documentation](https://docs.metaplex.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)

## Support

For issues and questions:
- Open an issue on GitHub
- Join our Discord community
- Check existing documentation

---

Built with 🚀 for the Solana community
