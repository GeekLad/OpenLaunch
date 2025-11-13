# Quick Setup Guide

This guide will help you get the OpenLaunch Launchpad up and running in minutes.

## Prerequisites

Before you begin, ensure you have:

- ✅ Node.js 18 or higher installed
- ✅ npm or yarn package manager
- ✅ A Solana wallet (Phantom, Solflare, etc.)
- ✅ Git installed (for cloning the repository)

## Step 1: Clone and Install

```bash
# Navigate to your projects directory
cd ~/projects

# Clone the repository
git clone <your-repo-url> openlaunch
cd openlaunch

# Install dependencies
npm install
```

## Step 2: Environment Setup

Create your environment configuration:

```bash
# Copy the example environment file
cp .env.local.example .env.local
```

Edit `.env.local` with your preferred settings:

### For Devnet Testing (Recommended First)

```env
# Solana Configuration
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# Keep other settings as default
```

### For Mainnet Production

```env
# Solana Configuration
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta

# Keep other settings as default
```

### Optional: IPFS Configuration

Configure the maximum image size (default is 1MB):

```env
# Maximum image file size in MB (public, client-side)
NEXT_PUBLIC_MAX_IMAGE_SIZE_MB=1
```

If you have IPFS service credentials (server-side only, kept private):

**Option 1: Pinata (1GB Free)**
```env
PINATA_API_KEY=your_api_key_here
PINATA_SECRET_KEY=your_secret_key_here
```

**Option 2: Filebase (5GB Free, recommended)**
```env
FILEBASE_API_KEY=your_api_key_here
```

**Important:** API keys are now server-side only (without NEXT_PUBLIC_ prefix) for security. They are never exposed to the client browser.

Don't have API keys? No problem! The app will use mock uploads for testing.

### Optional: Metadata Configuration

Control whether token metadata can be updated after creation:

```env
# Set to 'true' to allow metadata updates after token creation (default: false)
# WARNING: Mutable metadata may reduce community trust
# For maximum security and immutability, keep this false or unset
NEXT_PUBLIC_METADATA_MUTABLE=false
```

**Recommendation:** Keep metadata immutable (false) for maximum trust and transparency.

## Step 3: Start Development Server

```bash
npm run dev
```

Open your browser to [http://localhost:3000](http://localhost:3000)

## Step 4: Connect Your Wallet

1. Click "Connect Wallet" in the top right
2. Select your wallet (Phantom, Solflare, etc.)
3. Approve the connection

## Step 5: Launch Your First Token

1. Navigate to the "Launch Token" page
2. Fill in the form:
   - **Token Symbol**: e.g., "TEST"
   - **Token Name**: e.g., "Test Token"
   - **Logo**: Upload a PNG/JPG/GIF/WebP image (max 1MB by default)
3. Configure optional settings:
   - Fee Schedule
   - Launch Time
   - Social Links
4. Click "Launch Token"
5. Approve transactions in your wallet

## Troubleshooting

### Issue: "Cannot find module" errors

**Solution**: Reinstall dependencies
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: Wallet not connecting

**Solution**:
- Ensure your wallet extension is installed and unlocked
- Try refreshing the page
- Clear browser cache

### Issue: Transaction failures

**Solution**:
- Ensure you have sufficient SOL for transaction fees
- Check you're on the correct network (devnet/mainnet)
- Verify RPC endpoint is working

### Issue: IPFS upload errors

**Solution**:
- The app will fall back to mock uploads if credentials are missing
- Get free Pinata credentials at [pinata.cloud](https://www.pinata.cloud/)
- Or get free Filebase credentials at [filebase.com](https://filebase.com/)
- Remember: API keys must be added to `.env.local` WITHOUT the `NEXT_PUBLIC_` prefix for security

## Next Steps

### For Development

1. **Customize Configuration**
   - Adjust token parameters in `.env.local`
   - Change default supply and decimals
   - Configure metadata mutability (default: immutable)

3. **Test on Devnet**
   - Get devnet SOL from [Solana Faucet](https://faucet.solana.com/)
   - Launch test tokens
   - Verify all transactions

### For Production

1. **Configure Premium RPC**
   - Sign up for Helius, QuickNode, or Triton
   - Update `NEXT_PUBLIC_RPC_URL` in `.env.local`

2. **Set Up IPFS Storage**
   - Create Pinata or Filebase account
   - Add API credentials to `.env.local` (without NEXT_PUBLIC_ prefix for security)

3. **Deploy to Vercel**
   ```bash
   # Install Vercel CLI
   npm install -g vercel

   # Deploy
   vercel --prod
   ```

4. **Add Custom Domain**
   - Configure domain in Vercel dashboard
   - Update DNS settings

## Development Workflow

### Making Changes

```bash
# Create a new branch
git checkout -b feature/my-feature

# Make your changes
# ...

# Test locally
npm run dev

# Build to check for errors
npm run build

# Commit and push
git add .
git commit -m "Add my feature"
git push origin feature/my-feature
```

### Code Quality

```bash
# Run linter
npm run lint

# Format code (if you add Prettier)
npm run format
```

## File Structure Reference

```
openlaunch/
├── app/                      # Next.js pages
│   ├── launch/              # Token launch page
│   └── page.tsx             # Landing page
├── components/
│   ├── forms/               # Form components
│   ├── providers/           # Context providers
│   └── ui/                  # Reusable UI components
├── lib/
│   ├── solana/              # Solana integration
│   └── services/            # Business logic
├── types/                   # TypeScript types
├── config/                  # Configuration
└── .env.local               # Environment variables
```

## Common Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linter
npm run lint

# Install new dependency
npm install <package-name>
```

## Getting Help

- 📖 Read the [README.md](README.md) for detailed information
- 📝 Check [IMPLEMENTATION_NOTES.md](IMPLEMENTATION_NOTES.md) for technical details
- 🐛 Open an issue on GitHub for bugs
- 💬 Join our Discord for community support

## Learning Resources

### Solana Development
- [Solana Cookbook](https://solanacookbook.com/)
- [Solana Documentation](https://docs.solana.com/)
- [SPL Token Guide](https://spl.solana.com/token)

### Next.js & React
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Web3 Concepts
- [Wallet Adapter Guide](https://github.com/solana-labs/wallet-adapter)
- [Metaplex Documentation](https://docs.metaplex.com/)
- [Meteora Documentation](https://docs.meteora.ag/)

## Success Checklist

- [ ] Node.js installed
- [ ] Repository cloned
- [ ] Dependencies installed
- [ ] Environment configured
- [ ] Development server running
- [ ] Wallet connected
- [ ] Test token launched on devnet

## What's Next?

Once you've completed the setup:

1. Explore the codebase
2. Read the implementation notes
3. Complete DAMMv2 integration
4. Test thoroughly on devnet
5. Deploy to production

---

**Need help?** Open an issue or join our community!

**Ready to launch?** Head to [http://localhost:3000/launch](http://localhost:3000/launch)
