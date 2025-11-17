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

### Option 1: Docker (Recommended)

See [docker/README.md](docker/README.md) for detailed Docker deployment instructions.

```bash
# Clone and deploy with Docker
git clone https://github.com/GeekLad/OpenLaunch.git
cd OpenLaunch

# Copy and configure environment
cp docker/.env.example docker/.env

# Edit docker/.env with your IPFS credentials and other settings
cd docker

# Build/launch with Docker
docker-compose up -d
```

### Option 2: Manual Installation

See [INSTALLATION.md](INSTALLATION.md) for detailed manual installation instructions.

```bash
# Clone and install
git clone https://github.com/GeekLad/OpenLaunch.git
cd OpenLaunch
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
│   │   ├── init/                 # Application initialization endpoint
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
│   ├── init.ts                  # Application initialization
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
│   │   │   └── meta/            # Migration metadata
│   │   └── schema/               # Database table definitions
│   ├── meteora/                  # Meteora DAMMv2 integration
│   ├── services/                 # Business logic services
│   ├── solana/                   # Solana blockchain utilities
│   ├── utils/                    # Utility functions
│   ├── validation/                # Startup validation
│   ├── init.ts                   # Library initialization
│   └── utils.ts                 # General utilities
├── scripts/                      # Standalone scripts
│   └── fee-updater.mjs           # Fee updater cron service
├── types/                        # TypeScript type definitions
├── config/                       # Environment configuration
├── docker/                       # Docker deployment files
│   ├── Dockerfile               # Multi-stage Docker build
│   ├── docker-compose.yml       # Docker Compose configuration
│   ├── .env.example             # Docker environment template
│   └── README.md                # Docker deployment guide
├── .dockerignore                 # Docker build exclusions
├── .env.local.example            # Environment variables template
├── drizzle.config.ts             # Drizzle ORM configuration
├── next.config.ts                # Next.js configuration
├── package.json                  # Node.js dependencies
├── postcss.config.mjs            # PostCSS configuration
├── tailwind.config.ts            # Tailwind CSS configuration
└── tsconfig.json                 # TypeScript configuration
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

### Startup Validation

The application includes comprehensive startup validation to ensure all services are properly configured:

- **Database Validation**: Checks database connectivity and schema
- **IPFS Validation**: Verifies IPFS service credentials and connectivity
- **Configuration Validation**: Ensures all required environment variables are set
- **Error Reporting**: Clear error messages with setup instructions

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

### Local Development

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

### Docker Development

```bash
# Build and run with Docker Compose
cd docker
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild after changes
docker-compose up -d --build

# Development with hot reload (advanced)
docker run -d \
  --name openlaunch-dev \
  -p 3000:3000 \
  -v $(pwd):/app \
  -v /app/node_modules \
  -v /app/.next \
  --env-file .env \
  openlaunch:latest \
  npm run dev
```

## Troubleshooting

### Docker Issues
- **Build Failures**: Ensure Node.js 24.10.0+ and Docker are up to date
- **IPFS Configuration**: Set IPFS credentials in `docker/.env` (not `.env.local`)
- **Database Permissions**: Ensure `./data` directory is writable by container
- **Port Conflicts**: Change port mapping if 3000 is in use

### Wallet Connection Issues
- Ensure wallet extension is installed and unlocked
- Refresh page
- Check correct network (mainnet-beta or devnet)

### Transaction Failures
- Ensure sufficient SOL for transaction fees (~0.1 SOL)
- Check RPC connection status
- Verify all form inputs are valid

### IPFS Upload Errors
- Verify credentials in `.env.local` (without `NEXT_PUBLIC_` prefix) for manual setup
- For Docker, use `docker/.env` file
- Check file size (max configured in `NEXT_PUBLIC_MAX_IMAGE_SIZE_MB`)
- App falls back to mock uploads for testing without credentials

### Startup Validation Errors
- **Database Issues**: Run `npm run db:migrate` to create database schema
- **IPFS Issues**: Configure at least one IPFS service (Pinata or Filebase)
- **Environment Issues**: Check all required environment variables are set

## Deployment

### Docker Deployment

For production deployment, Docker is recommended:

- **Quick Start**: `cd docker && docker-compose up -d`
- **Configuration**: Copy `docker/.env.example` to `docker/.env` and configure IPFS credentials
- **Data Persistence**: Database stored in `./data` directory
- **Health Checks**: Built-in health monitoring via `/api/init`
- **Multi-stage Build**: Optimized production image with minimal size
- **Standalone Output**: Next.js standalone mode for efficient deployment

See [docker/README.md](docker/README.md) for complete Docker deployment guide.

### Manual Deployment

For manual deployment without Docker:

1. Build the application: `npm run build`
2. Set production environment variables
3. Run: `npm start`
4. Set up reverse proxy (nginx/Apache) for SSL
5. Configure process manager (PM2/systemd)

## Resources

- [Solana Documentation](https://docs.solana.com/)
- [Meteora Documentation](https://docs.meteora.ag/)
- [Metaplex Documentation](https://docs.metaplex.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)
- [Solana Cookbook](https://solanacookbook.com/)
- [Docker Documentation](https://docs.docker.com/)

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
