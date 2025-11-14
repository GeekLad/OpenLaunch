<div align="center">
  <img src="public/logo.svg" alt="OpenLaunch" width="400">

  # OpenLaunch - Meme Token Launchpad

  A client-side decentralized application for launching SPL tokens on Solana with DAMMv2 liquidity integration and permanent authority revocation.
</div>

## Features

- **Client-Side Deployment**: All transactions signed by user's connected wallet
- **DAMMv2 Integration**: Single-sided liquidity deployment using Meteora's Dynamic AMM
- **Security First**: Mint and freeze authorities permanently revoked
- **Fee Scheduling**: Dynamic fees with exponential decay over time
- **Timed Launch**: Schedule token launches for specific dates and times
- **IPFS Metadata**: Token metadata and images stored on IPFS (Pinata or Filebase)
- **Real-time Status**: Live progress updates during token deployment
- **Configurable Supply**: Customizable token supply and pool liquidity allocation

## Tech Stack

- **Frontend**: Next.js 16 with TypeScript, React 19
- **Styling**: Tailwind CSS + Shadcn/ui components
- **Blockchain**: Solana Web3.js, SPL Token
- **Wallet**: Solana Wallet Adapter (Phantom, Solflare, etc.)
- **Metadata**: Metaplex Token Metadata (Umi SDK)
- **AMM**: Meteora CP-AMM SDK v1.2.3
- **Storage**: IPFS (Pinata or Filebase)
- **Form Handling**: React Hook Form + Zod validation

## Quick Start

See [INSTALLATION.md](INSTALLATION.md) for detailed installation instructions.

```bash
# Clone and install
git clone <repository-url>
cd openlaunch
npm install

# Configure environment
cp .env.local.example .env.local

# Start development server
npm run dev
```

## Project Structure

```
openlaunch/
├── app/                          # Next.js app directory
│   ├── launch/page.tsx           # Token launch page
│   ├── layout.tsx                # Root layout with providers
│   ├── page.tsx                  # Landing page
│   └── globals.css               # Global styles
├── components/
│   ├── forms/
│   │   └── TokenLaunchForm.tsx   # Main token creation form
│   ├── providers/
│   │   └── SolanaProvider.tsx    # Wallet adapter provider
│   └── ui/                       # Reusable UI components
├── lib/
│   ├── solana/
│   │   ├── connection.ts         # Solana RPC connection
│   │   ├── tokenUtils.ts         # Token mint operations
│   │   ├── metadataUtils.ts      # Metadata creation (Metaplex Umi)
│   │   └── poolUtils.ts          # DAMMv2 pool integration
│   ├── services/
│   │   ├── ipfsService.ts        # IPFS upload service
│   │   └── launchService.ts      # Main token launch orchestration
│   └── utils.ts                  # Utility functions
├── types/
│   └── token.ts                  # TypeScript type definitions
├── config/
│   └── environment.ts            # Environment configuration
└── .env.local.example            # Environment variables template
```

## Usage

### Launching a Token

1. **Connect Wallet**: Click "Connect Wallet" and select your Solana wallet
2. **Fill Token Details**:
   - Token Symbol (e.g., DOGE, max 10 chars)
   - Token Name (e.g., Dogecoin, max 32 chars)
   - Upload logo image (PNG/JPG/GIF/WebP, max 1MB by default)
3. **Configure Fee Schedule** (optional):
   - Enable fee scheduler
   - Set starting and ending fee rates (0.01% - 100%)
   - Fee decay duration (default 60 minutes)
4. **Set Launch Time** (optional):
   - Enable timed launch
   - Choose launch date and time
5. **Add Social Links** (optional):
   - Website, Twitter, Telegram, Discord
6. **Launch**: Click "Launch Token" and approve transactions in your wallet

### Transaction Flow

The launch process executes the following in 3 transactions (single approval):

1. **Mint Creation**: Creates SPL token mint with 9 decimals
2. **Token Setup**: Mints supply, creates metadata, revokes authorities (combined)
3. **Pool Creation**: Creates DAMMv2 pool with single-sided liquidity and optional timed launch

## Configuration

### Key Environment Variables

```env
# Network (use devnet for testing)
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# Token Defaults
NEXT_PUBLIC_TOKEN_DECIMALS=9
NEXT_PUBLIC_TOTAL_SUPPLY=1000000000

# Pool Configuration
NEXT_PUBLIC_POOL_LIQUIDITY_PERCENTAGE=1  # 1 = 100% to pool

# Pricing (affects initial market cap)
NEXT_PUBLIC_INITIAL_PRICE=0.0000001      # 100 SOL market cap
NEXT_PUBLIC_PRICE_RANGE_MIN=0.0000001
NEXT_PUBLIC_PRICE_RANGE_MAX=0.001        # 1M SOL market cap

# Fee Schedule
NEXT_PUBLIC_FEE_DECAY_DURATION_MINUTES=60
NEXT_PUBLIC_FEE_DECAY_PERIODS=60

# Metadata (default: immutable for maximum trust)
# NEXT_PUBLIC_METADATA_MUTABLE=false

# IPFS (Server-side only, no NEXT_PUBLIC_ prefix)
# Option 1: Filebase (RECOMMENDED - 5GB free)
FILEBASE_API_KEY=your_key
# Option 2: Pinata (1GB free)
# PINATA_API_KEY=your_key
# PINATA_SECRET_KEY=your_secret
```

See [.env.local.example](.env.local.example) for complete configuration options.

### Token Parameters

- **Total Supply**: Configurable via `NEXT_PUBLIC_TOTAL_SUPPLY` (default: 1 billion)
- **Decimals**: Fixed at 9 decimals
- **Quote Token**: Fixed to SOL (Wrapped SOL: `So11111111111111111111111111111111111111112`)
- **Pool Liquidity**: Configurable percentage via `NEXT_PUBLIC_POOL_LIQUIDITY_PERCENTAGE`

### Metadata Configuration

- **Immutability**: Default is `false` (immutable) for maximum trust
- Set `NEXT_PUBLIC_METADATA_MUTABLE=true` to allow metadata updates after creation
- **Recommendation**: Keep immutable for community trust and transparency

### Fee Schedule

Fee decay uses exponential curve over configured duration:
- **Starting Fee**: Configurable (default: 50%)
- **Ending Fee**: Configurable (default: 1%)
- **Decay Duration**: Configurable (default: 60 minutes)
- **Decay Periods**: Controls frequency of fee updates (default: 60)

## DAMMv2 Integration

Fully implemented using `@meteora-ag/cp-amm-sdk` v1.2.3:

- **Single-sided liquidity**: Configurable percentage of token supply with 0 SOL
- **Dynamic fees**: Exponential decay fee scheduler
- **Timed launch**: Optional scheduled activation
- **Liquidity locking**: 100% of liquidity permanently locked
- **Fee collection**: Quote token (SOL) only

Implementation in [lib/solana/poolUtils.ts](lib/solana/poolUtils.ts:1-1):
- `createDAMMv2Pool()`: Pool creation with custom configuration
- `priceToSqrtPrice()`: Price conversion to Q64 format
- `getPoolInfo()`: Fetch pool state information
- `poolExists()`: Check if pool exists

## Security

- All transactions are client-side and signed by user's wallet
- No backend custody of private keys or funds
- Mint and freeze authorities permanently revoked after deployment
- Token metadata immutable by default (configurable)
- IPFS metadata immutable once uploaded
- IPFS credentials server-side only (never exposed to client)

## Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Lint code
npm run lint
```

## Troubleshooting

### Wallet Connection Issues
- Ensure wallet extension is installed and unlocked
- Refresh the page
- Check correct network (mainnet-beta or devnet)

### Transaction Failures
- Ensure sufficient SOL for transaction fees (~0.1 SOL)
- Check RPC connection status
- Verify all form inputs are valid

### IPFS Upload Errors
- Verify credentials in `.env.local` (without `NEXT_PUBLIC_` prefix)
- Check file size (max configured in `NEXT_PUBLIC_MAX_IMAGE_SIZE_MB`)
- App falls back to mock uploads for testing without credentials

## Resources

- [Solana Documentation](https://docs.solana.com/)
- [Meteora Documentation](https://docs.meteora.ag/)
- [Metaplex Documentation](https://docs.metaplex.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)
- [Solana Cookbook](https://solanacookbook.com/)

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## License

MIT License - see LICENSE file for details

## Support

- Open an issue on GitHub for bugs
- Join our Discord community for discussions
- Check [INSTALLATION.md](INSTALLATION.md) for setup help

---

Built for the Solana community
