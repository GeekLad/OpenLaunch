<div align="center">
  <img src="public/logo.svg" alt="OpenLaunch" width="400">

  # OpenLaunch - Meme Token Launchpad

  A client-side decentralized application for launching SPL tokens on Solana with DAMMv2 liquidity integration and permanent authority revocation.
</div>

## Features

- **Client-Side Deployment**: All transactions signed by user's connected wallet
- **DAMMv2 Integration**: Single-sided liquidity deployment using Meteora's Dynamic AMM
- **Security First**: Mint and freeze authorities permanently revoked
- **Fee Scheduling**: Dynamic fees with exponential decay over time with automated updates
- **Timed Launch**: Schedule token launches for specific dates and times
- **IPFS Metadata**: Token metadata and images stored on IPFS (Pinata or Filebase)
- **Real-time Status**: Live progress updates during token deployment
- **Token Database**: Complete token launch history with search and filtering
- **Token Explorer**: Browse launched tokens with pagination and sorting
- **Fee Tracking**: Automated fee collection and statistics tracking
- **Configurable Supply**: Customizable token supply and pool liquidity allocation

## Tech Stack

- **Frontend**: Next.js 16 with TypeScript, React 19
- **Styling**: Tailwind CSS + Shadcn/ui components
- **Database**: Drizzle ORM with SQLite (database-agnostic design)
- **Blockchain**: Solana Web3.js, SPL Token
- **Wallet**: Solana Wallet Adapter (Phantom, Solflare, etc.)
- **Metadata**: Metaplex Token Metadata (Umi SDK)
- **AMM**: Meteora CP-AMM SDK v1.2.3
- **Storage**: IPFS (Pinata or Filebase)
- **Form Handling**: React Hook Form + Zod validation
- **Background Jobs**: Node-cron for fee updates

## Quick Start

See [INSTALLATION.md](INSTALLATION.md) for detailed installation instructions.

```bash
# Clone and install
git clone <repository-url>
cd openlaunch
npm install

# Configure environment
cp .env.local.example .env.local

# Set up database
npm run db:migrate

# Start development server
npm run dev
```

## Project Structure

```
openlaunch/
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── ipfs/                 # IPFS upload endpoints
│   │   │   ├── upload-file/      # Image upload to IPFS
│   │   │   └── upload-metadata/  # Metadata JSON upload
│   │   └── tokens/               # Token CRUD operations
│   │       ├── create/           # Create token record
│   │       ├── list/             # List tokens with pagination
│   │       ├── update-fees/      # Update fee statistics
│   │       └── [mintAddress]/    # Get token details
│   ├── launch/page.tsx           # Token launch page
│   ├── tokens/                   # Token explorer pages
│   │   ├── page.tsx              # Token listing with pagination
│   │   └── [mintAddress]/        # Individual token details
│   ├── layout.tsx                # Root layout with providers
│   ├── page.tsx                  # Landing page
│   └── globals.css               # Global styles
├── components/
│   ├── forms/
│   │   └── TokenLaunchForm.tsx   # Main token creation form
│   ├── layout/                   # Header, Footer components
│   ├── providers/                # Solana and Theme providers
│   ├── token-detail/             # Token detail page components
│   ├── tokens/                   # Token card components
│   ├── ui/                       # Reusable UI components
│   └── wallet/                   # Wallet connection components
├── lib/
│   ├── cron/                     # Background job scheduling
│   ├── db/                       # Database layer (Drizzle ORM)
│   │   ├── migrations/           # Database migration files
│   │   └── schema/               # Database table definitions
│   ├── meteora/                  # Meteora DAMMv2 integration
│   ├── services/                 # Business logic services
│   ├── solana/                   # Solana blockchain utilities
│   └── utils/                    # Utility functions
├── scripts/                      # Standalone scripts
│   └── fee-updater.mjs           # Fee updater cron service
├── types/                        # TypeScript type definitions
├── config/                       # Environment configuration
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
5. **Advanced Options** (optional):
   - Bring Your Own CA: Use a custom private key for vanity addresses
6. **Add Social Links** (optional):
   - Website, Twitter, Telegram, Discord
7. **Launch**: Click "Launch Token" and approve transactions in your wallet

### Token Explorer

Browse and search launched tokens:

- **Token Listing**: View all launched tokens with pagination
- **Search**: Full-text search across name, symbol, description, and addresses
- **Filtering**: Filter by status (All, Live, Upcoming)
- **Sorting**: Sort by launch date or fee earnings
- **Token Details**: View comprehensive token information including:
  - Transaction history with Solscan links
  - Pool information with Meteora integration
  - Launch status and countdown timers
  - External links to DexScreener, BirdEye, etc.

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
NEXT_PUBLIC_INITIAL_PRICE=0.00001       # 100 SOL market cap
NEXT_PUBLIC_PRICE_RANGE_MIN=0.000001
NEXT_PUBLIC_PRICE_RANGE_MAX=0.0001      # 1M SOL market cap

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

## API Routes

The application includes a complete REST API for token management:

### Token Operations
- `GET /api/tokens/list` - List tokens with pagination, sorting, and filtering
- `GET /api/tokens/[mintAddress]` - Get individual token details
- `POST /api/tokens/create` - Create new token record (used after launch)
- `POST /api/tokens/update-fees` - Update token fee statistics

### IPFS Operations
- `POST /api/ipfs/upload-file` - Upload images to IPFS
- `POST /api/ipfs/upload-metadata` - Upload metadata JSON to IPFS

### Database Features
- Full-text search across token metadata
- Pagination and sorting (by date or fees)
- Status filtering (all, live, upcoming)
- Fee tracking and historical data
- Automated background updates via cron jobs

## Background Services

### Fee Updater Service

Automated fee collection and statistics tracking system:

- **Standalone Script**: `scripts/fee-updater.mjs` can run independently
- **Cron Integration**: Automatically starts in production with `NODE_ENV=production`
- **Age-based Polling**: Update frequency adapts based on token age
- **Error Tracking**: Built-in error handling and retry logic
- **Database Integration**: Updates fee statistics and pool history

```bash
# Run standalone fee updater
node scripts/fee-updater.mjs

# Enable cron in development
ENABLE_CRON=true npm run dev
```

## Security

- All transactions are client-side and signed by user's wallet
- No backend custody of private keys or funds
- Mint and freeze authorities permanently revoked after deployment
- Token metadata immutable by default (configurable)
- IPFS metadata immutable once uploaded
- IPFS credentials server-side only (never exposed to client)
- Database uses SQLite with WAL mode for better concurrency
- All sensitive environment variables are server-side only

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

# Database operations
npm run db:generate    # Generate migrations from schema changes
npm run db:migrate     # Apply pending migrations
npm run db:seed        # Populate database with sample data
npm run db:test        # Verify database operations
npm run db:studio      # Open visual database browser

# Fee updater service (standalone)
node scripts/fee-updater.mjs
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
- Join our [Discord community](https://discord.gg/XF83PypJDh)
- Check [INSTALLATION.md](INSTALLATION.md) for setup help

---

Built for the Solana community
