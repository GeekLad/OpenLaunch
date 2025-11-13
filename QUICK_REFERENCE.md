# Quick Reference Guide

## 🚀 Common Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint

# Dependencies
npm install             # Install all dependencies
npm install <package>   # Add new package
```

## 📁 Key Files Reference

### Configuration
```
.env.local              # Environment variables (DO NOT COMMIT)
.env.local.example      # Template for environment setup
next.config.ts          # Next.js configuration
tsconfig.json           # TypeScript configuration
tailwind.config.ts      # Tailwind CSS configuration
```

### Core Application
```
app/
├── layout.tsx          # Root layout (wraps all pages)
├── page.tsx            # Homepage (/)
└── launch/page.tsx     # Launch page (/launch)
```

### Components
```
components/
├── forms/
│   └── TokenLaunchForm.tsx     # Main form for token creation
├── providers/
│   └── SolanaProvider.tsx      # Wallet adapter provider
└── ui/                         # Reusable UI components
    ├── button.tsx
    ├── input.tsx
    ├── card.tsx
    └── label.tsx
```

### Solana Logic
```
lib/solana/
├── connection.ts       # RPC connection utilities
├── tokenUtils.ts       # SPL Token operations
├── metadataUtils.ts    # Metadata creation
└── poolUtils.ts        # ✅ DAMMv2 integration (Complete)
```

### Services
```
lib/services/
├── ipfsService.ts      # IPFS/Pinata uploads
└── launchService.ts    # Token launch orchestration
```

### Types
```
types/
└── token.ts            # TypeScript type definitions
```

## 🔧 Environment Variables Quick Reference

```env
# Essential
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# Token Config
NEXT_PUBLIC_TOKEN_DECIMALS=9
NEXT_PUBLIC_TOTAL_SUPPLY=1000000000

# Quote Token (SOL)
NEXT_PUBLIC_QUOTE_TOKEN_MINT=So11111111111111111111111111111111111111112

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
PINATA_API_KEY=
PINATA_SECRET_KEY=
# Or use Filebase instead:
# FILEBASE_API_KEY=
```

## 📝 Code Snippets

### Import Solana Connection
```typescript
import { getConnection } from "@/lib/solana/connection";

const connection = getConnection();
```

### Use Wallet
```typescript
import { useWallet } from "@solana/wallet-adapter-react";

const { publicKey, signTransaction } = useWallet();
```

### Create Token Mint
```typescript
import { Keypair } from "@solana/web3.js";
import { createMint } from "@/lib/solana/tokenUtils";

const mintKeypair = Keypair.generate();
const mintResult = await createMint(
  connection,
  walletPublicKey,
  mintKeypair,
  9 // decimals
);
```

### Upload to IPFS
```typescript
import { uploadFileToIPFS } from "@/lib/services/ipfsService";

const result = await uploadFileToIPFS(file);
console.log(`IPFS URI: ${result.uri}`);
```

## 🐛 Common Issues & Fixes

### Issue: Module not found
```bash
# Fix: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue: Wallet not connecting
```typescript
// Check if wallet is installed
if (!window.solana) {
  console.error("Wallet not installed");
}

// Check if wallet is connected
if (!publicKey) {
  console.error("Wallet not connected");
}
```

### Issue: Transaction failing
```typescript
// Check balance
const balance = await connection.getBalance(publicKey);
console.log(`Balance: ${balance / 1e9} SOL`);

// Check transaction
console.log("Transaction:", transaction);
```

### Issue: RPC errors
```bash
# Try different RPC endpoint
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
# or
NEXT_PUBLIC_RPC_URL=https://your-premium-rpc.com
```

## 📚 Useful Solana Utilities

### Convert Lamports to SOL
```typescript
const sol = lamports / 1e9;
```

### Convert SOL to Lamports
```typescript
const lamports = sol * 1e9;
```

### Get Token Account
```typescript
import { getAssociatedTokenAddress } from "@solana/spl-token";

const tokenAccount = await getAssociatedTokenAddress(
  mintAddress,
  ownerPublicKey
);
```

### Check Transaction Status
```typescript
const status = await connection.getSignatureStatus(signature);
console.log(status);
```

## 🔗 Quick Links

### Development
- Local: http://localhost:3000
- Launch Page: http://localhost:3000/launch

### Solana Explorers
- Devnet: https://solscan.io/?cluster=devnet
- Mainnet: https://solscan.io/

### Faucets
- Devnet SOL: https://faucet.solana.com/

### Documentation
- Solana: https://docs.solana.com/
- Next.js: https://nextjs.org/docs
- Meteora: https://docs.meteora.ag/

## 🎯 Launch Checklist

### Before Launch
- [ ] Wallet connected
- [ ] Sufficient SOL for fees (~0.05 SOL)
- [ ] Token details filled
- [ ] Logo uploaded (within size limit, default 1MB)
- [ ] All form validations passing

### During Launch
- [ ] Monitor transaction signatures
- [ ] Check progress bar
- [ ] Watch console for errors

### After Launch
- [ ] Verify mint address
- [ ] Check authorities revoked
- [ ] Confirm metadata on-chain
- [ ] View token in wallet

## 💰 Cost Estimation

### Devnet (Free)
- All transactions free
- Use faucet for SOL

### Mainnet (Approximate)
- Mint creation: ~0.002 SOL
- Token account: ~0.002 SOL
- Metadata: ~0.01 SOL
- Pool creation: ~0.05 SOL
- **Total: ~0.06-0.1 SOL**

## 🔐 Security Checklist

- [ ] Never commit `.env.local`
- [ ] Always revoke authorities
- [ ] Verify all transactions before signing
- [ ] Test on devnet first
- [ ] Use premium RPC for production
- [ ] Validate all user inputs
- [ ] Check file types/sizes

## 📊 Monitoring

### Check Server Status
```bash
# View logs
npm run dev

# Check process
ps aux | grep next
```

### Check Network Status
```bash
# Ping RPC
curl https://api.devnet.solana.com -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1, "method":"getHealth"}'
```

## 🎨 Styling Quick Reference

### Tailwind Classes
```tsx
// Layout
<div className="container mx-auto px-4">

// Buttons
<button className="bg-primary text-primary-foreground hover:bg-primary/90">

// Cards
<div className="rounded-lg border bg-card p-6">

// Inputs
<input className="flex h-10 w-full rounded-md border border-input px-3 py-2">
```

### Custom Colors
```css
--primary: hsl(221.2 83.2% 53.3%)
--secondary: hsl(210 40% 96.1%)
--destructive: hsl(0 84.2% 60.2%)
--muted: hsl(210 40% 96.1%)
--accent: hsl(210 40% 96.1%)
```

## 🚨 Emergency Commands

### Stop All Processes
```bash
pkill -f next
```

### Clear Next.js Cache
```bash
rm -rf .next
```

### Reset Project
```bash
rm -rf node_modules .next package-lock.json
npm install
```

---

**Need more help?** Check the full documentation files:
- [README.md](README.md) - Full documentation
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Setup instructions
- [IMPLEMENTATION_NOTES.md](IMPLEMENTATION_NOTES.md) - Technical details
