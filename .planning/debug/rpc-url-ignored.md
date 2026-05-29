# Debug: RPC_URL Environment Variable Ignored by Client

## Problem

Setting `RPC_URL=http://127.0.0.1:8899` in `.env.local` has no effect on the client-side wallet connection. The app continues to use `https://api.mainnet-beta.solana.com/`.

## Root Cause

1. **Server-only secret**: `RPC_URL` is defined in `config/secrets.ts` which reads `process.env.RPC_URL`. This is a server-side-only variable.

2. **Client hardcoding**: The `SolanaProvider` component (`components/providers/SolanaProvider.tsx`) imports `DEFAULT_CLIENT_RPC_URL` from `config/public.ts`, which is a hardcoded constant: `https://api.mainnet-beta.solana.com`.

3. **No bridge**: There is no mechanism to pass a custom RPC URL from the server environment to the browser bundle. Next.js only exposes `NEXT_PUBLIC_*` prefixed env vars to the client.

4. **Static export**: The `.env.local.example` explicitly documents that `RPC_URL` is "kept server-side only" and that "the browser falls back to the public endpoint automatically."

## Impact

- Users running local validators (surfnet, test-validator) cannot connect their wallet to the local RPC.
- The wallet adapter always connects to mainnet-beta, even when the user intends to test on a local cluster.
- Server-side code (`lib/solana/connection.ts`) DOES respect `RPC_URL`, creating a mismatch: server connects to local RPC, client connects to mainnet.

## Files Involved

| File | Role | Issue |
|------|------|-------|
| `config/secrets.ts` | Server config | `RPC_URL` is server-only; not exposed to client |
| `config/public.ts` | Client config | `DEFAULT_CLIENT_RPC_URL` is hardcoded with no override |
| `components/providers/SolanaProvider.tsx` | Wallet provider | Uses `DEFAULT_CLIENT_RPC_URL` directly; no env var fallback |
| `.env.local.example` | Documentation | Documents `RPC_URL` as server-only with no client alternative |

## Fix Required

1. Add `NEXT_PUBLIC_RPC_URL` support to `config/public.ts` (or a new `config/client.ts`).
2. Update `SolanaProvider.tsx` to use `process.env.NEXT_PUBLIC_RPC_URL || DEFAULT_CLIENT_RPC_URL`.
3. Update `.env.local.example` to document `NEXT_PUBLIC_RPC_URL`.
4. Keep `RPC_URL` for server-side connections (no change needed there).

## References

- Next.js env var docs: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables#bundling-environment-variables-for-the-browser
- `.env.local.example` line 4-7: server-side comment
- `config/public.ts` line 18: hardcoded default
- `components/providers/SolanaProvider.tsx` line 29: `const rpcUrl = DEFAULT_CLIENT_RPC_URL;`
