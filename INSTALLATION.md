# Installation Guide

Complete step-by-step guide to set up and run OpenLaunch.

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** installed ([Download](https://nodejs.org/))
- **npm** package manager (comes with Node.js)
- **A Solana wallet** (Phantom, Solflare, etc.)
- **SOL for transaction fees** (~0.1 SOL for devnet testing or mainnet launch)
- **Git** installed ([Download](https://git-scm.com/))

## Step 1: Clone the Repository

```bash
# Navigate to your projects directory
cd ~/projects

# Clone the repository
git clone <your-repo-url> openlaunch

# Navigate into the project
cd openlaunch
```

## Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js 16
- React 19
- Drizzle ORM with SQLite
- Solana Web3.js
- Meteora CP-AMM SDK
- Metaplex Token Metadata
- Node-cron for background jobs
- And all other dependencies

## Step 3: Environment Configuration

### Create Environment File

```bash
cp .env.local.example .env.local
```

### Configure for Devnet (Recommended First)

Edit `.env.local` with these settings:

```env
# Application Name
NEXT_PUBLIC_APP_NAME=OpenLaunch

# Solana Network - DEVNET for testing
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# Quote Token (SOL - same for devnet and mainnet)
NEXT_PUBLIC_QUOTE_TOKEN_MINT=So11111111111111111111111111111111111111112

# Token Configuration
NEXT_PUBLIC_TOKEN_DECIMALS=9
NEXT_PUBLIC_TOTAL_SUPPLY=1000000000

# Pool Configuration - 100% of supply to pool
NEXT_PUBLIC_POOL_LIQUIDITY_PERCENTAGE=1

# Pricing (100 SOL starting market cap)
NEXT_PUBLIC_INITIAL_PRICE=0.00001
NEXT_PUBLIC_PRICE_RANGE_MIN=0.000001
NEXT_PUBLIC_PRICE_RANGE_MAX=0.0001

# Fee Schedule
NEXT_PUBLIC_FEE_DECAY_DURATION_MINUTES=60
NEXT_PUBLIC_FEE_DECAY_PERIODS=60

# Maximum image file size in MB
NEXT_PUBLIC_MAX_IMAGE_SIZE_MB=1

# Metadata - keep immutable for maximum trust
# NEXT_PUBLIC_METADATA_MUTABLE=false

# Launchpad URL - Optional (will be added to token metadata)
# NEXT_PUBLIC_LAUNCHPAD_URL=https://your-launchpad.com

# IPFS - Optional for testing (will use mock if not set)
# Get free API key from https://filebase.com (5GB free)
# FILEBASE_API_KEY=your_filebase_api_key

# OR use Pinata (1GB free): https://pinata.cloud
# PINATA_API_KEY=your_pinata_api_key
# PINATA_SECRET_KEY=your_pinata_secret_key
```

### Configure for Mainnet (Production)

When ready for production, update these values:

```env
# Solana Network - MAINNET
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
```

**Recommended**: Use a premium RPC provider for production:
- [Helius](https://www.helius.dev/)
- [QuickNode](https://www.quicknode.com/)
- [Triton](https://triton.one/)

## Step 4: IPFS Configuration (Optional)

For production, you'll need IPFS credentials. Choose one:

### Option 1: Filebase (Recommended - 5GB Free)

1. Sign up at [filebase.com](https://filebase.com/)
2. Get API key from [console.filebase.com/keys](https://console.filebase.com/keys)
3. Add to `.env.local`:

```env
FILEBASE_API_KEY=your_filebase_api_key
```

### Option 2: Pinata (1GB Free)

1. Sign up at [pinata.cloud](https://www.pinata.cloud/)
2. Get API credentials from dashboard
3. Add to `.env.local`:

```env
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key
```

**Note**: IPFS credentials are server-side only (no `NEXT_PUBLIC_` prefix) for security. For testing without credentials, the app will use mock uploads.

## Step 5: Set Up Database

```bash
# Run database migrations
npm run db:migrate

# (Optional) Seed with sample data for testing
npm run db:seed
```

## Step 6: Start Development Server

```bash
npm run dev
```

The application will start at [http://localhost:3000](http://localhost:3000)

## Step 7: Get Test SOL (Devnet Only)

1. Visit [Solana Faucet](https://faucet.solana.com/)
2. Enter your wallet address
3. Request devnet SOL (you'll get 1-2 SOL per request)

## Step 8: Connect Your Wallet

1. Open [http://localhost:3000](http://localhost:3000) in your browser
2. Click "Connect Wallet" in the top right
3. Select your wallet (Phantom, Solflare, etc.)
4. Approve the connection
5. **Important**: Ensure your wallet is set to the correct network (devnet or mainnet-beta)

## Step 9: Launch Your First Token

1. Navigate to the "Launch" page
2. Fill in token details:
   - Symbol (e.g., "TEST")
   - Name (e.g., "Test Token")
   - Upload logo (PNG/JPG/GIF/WebP, max 1MB)
3. Configure optional settings:
   - Fee schedule (dynamic fees over time)
   - Launch time (scheduled activation)
   - Social links (website, Twitter, etc.)
4. Click "Launch Token"
5. Approve the transaction in your wallet
6. Wait for confirmation (watch the progress indicator)

## Verification

After successful launch, you should see:
- ✅ Token mint address
- ✅ Pool address
- ✅ Transaction signatures
- ✅ Links to view on Solana Explorer

### Verify on Solana Explorer

For devnet:
```
https://solscan.io/token/[YOUR_MINT_ADDRESS]?cluster=devnet
```

For mainnet:
```
https://solscan.io/token/[YOUR_MINT_ADDRESS]
```

## Troubleshooting

### Module Not Found Errors

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Wallet Not Connecting

- Ensure wallet extension is installed and unlocked
- Check you're on the correct network in your wallet
- Try refreshing the page
- Clear browser cache

### Transaction Failures

- Check you have sufficient SOL for fees (~0.1 SOL)
- Verify RPC endpoint is responding
- Check all form inputs are valid
- Look at browser console for detailed errors

### RPC Rate Limiting

If you see RPC errors:
- Use a different RPC endpoint
- Sign up for a premium RPC provider (free tiers available)
- Add rate limiting/retry logic

### IPFS Upload Errors

- Verify credentials in `.env.local`
- Check file size is within limit
- For testing, app will use mock uploads if no credentials
- Ensure credentials don't have `NEXT_PUBLIC_` prefix

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build
```

## Production Deployment

### Using Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel --prod
```

3. Add environment variables in Vercel dashboard

### Using Custom Server

1. Build the application:
```bash
npm run build
```

2. Start production server:
```bash
npm run start
```

3. Use PM2 for process management:
```bash
npm install -g pm2
pm2 start npm --name "openlaunch" -- start
pm2 save
pm2 startup
```

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_APP_NAME` | No | OpenLaunch | Application name |
| `NEXT_PUBLIC_RPC_URL` | Yes | - | Solana RPC endpoint |
| `NEXT_PUBLIC_SOLANA_NETWORK` | Yes | - | Network (devnet/mainnet-beta) |
| `NEXT_PUBLIC_QUOTE_TOKEN_MINT` | Yes | SOL | Quote token mint address |
| `NEXT_PUBLIC_TOKEN_DECIMALS` | No | 9 | Token decimals |
| `NEXT_PUBLIC_TOTAL_SUPPLY` | No | 1000000000 | Default token supply |
| `NEXT_PUBLIC_POOL_LIQUIDITY_PERCENTAGE` | No | 1 | Pool liquidity (0-1) |
| `NEXT_PUBLIC_INITIAL_PRICE` | No | 0.00001 | Initial token price |
| `NEXT_PUBLIC_PRICE_RANGE_MIN` | No | 0.000001 | Minimum price |
| `NEXT_PUBLIC_PRICE_RANGE_MAX` | No | 0.0001 | Maximum price |
| `NEXT_PUBLIC_FEE_DECAY_DURATION_MINUTES` | No | 60 | Fee decay duration |
| `NEXT_PUBLIC_FEE_DECAY_PERIODS` | No | 60 | Fee decay periods |
| `NEXT_PUBLIC_MAX_IMAGE_SIZE_MB` | No | 1 | Max logo size |
| `NEXT_PUBLIC_METADATA_MUTABLE` | No | false | Allow metadata updates |
| `NEXT_PUBLIC_LAUNCHPAD_URL` | No | - | Launchpad URL for token metadata |
| `FILEBASE_API_KEY` | No | - | Filebase API key (server-side) |
| `PINATA_API_KEY` | No | - | Pinata API key (server-side) |
| `PINATA_SECRET_KEY` | No | - | Pinata secret (server-side) |

## Next Steps

After successful installation:

1. **Test on Devnet**: Launch several test tokens to understand the flow
2. **Review Code**: Explore the codebase structure
3. **Customize**: Adjust environment variables for your needs
4. **Security Review**: Audit code before mainnet deployment
5. **Production**: Deploy to mainnet with premium RPC

## Common Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production
npm run start                  # Start production server
npm run lint                   # Run linter

# Database Operations
npm run db:generate            # Generate migrations
npm run db:migrate             # Apply migrations
npm run db:seed                # Seed sample data
npm run db:test                # Test database ops
npm run db:studio              # Visual database browser

# Background Services
node scripts/fee-updater.mjs   # Run fee updater standalone

# Dependencies
npm install                    # Install dependencies
npm install <package>          # Add new package
npm update                     # Update dependencies

# Cleanup
rm -rf .next                   # Clear Next.js cache
rm -rf node_modules            # Remove dependencies
```

## Getting Help

- 📖 [README.md](README.md) - Main documentation
- 🐛 [GitHub Issues](https://github.com/your-repo/issues) - Bug reports
- 💬 Discord: https://discord.gg/XF83PypJDh - Community support
- 📚 [Resources](README.md#resources) - External documentation

## Success Checklist

- [ ] Node.js 18+ installed
- [ ] Repository cloned
- [ ] Dependencies installed (`npm install`)
- [ ] Environment configured (`.env.local`)
- [ ] Development server running (`npm run dev`)
- [ ] Wallet installed and unlocked
- [ ] Connected to correct network
- [ ] Test SOL acquired (devnet)
- [ ] First token launched successfully
- [ ] Verified on Solana Explorer

---

**Ready to launch?** Visit [http://localhost:3000/launch](http://localhost:3000/launch)

**Need help?** Join our Discord at https://discord.gg/XF83PypJDh or open an issue.
