# @fanpass/web

Next.js frontend for FanPass — Landing, Verify Ticket, Marketplace, Wallet. See the repo root
[`README.md`](../../README.md) and [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) for the full picture.

```bash
npm run dev --workspace=apps/web
```

Copy `.env.local.example` to `.env.local` and fill in `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` (free at
cloud.walletconnect.com) if you want the WalletConnect QR flow — injected wallets (MetaMask) work without it.
