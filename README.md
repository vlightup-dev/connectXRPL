# XRPL Wallet Connect

`@trustauthy/xrpl-wallet-connect` is a React and TypeScript wallet-connect package for XRPL wallets.

This package is open source software.

It ships:

- XRPL wallet adapter types and shared error helpers
- direct adapters for `GemWallet`, `Xaman`, and `Crossmark`
- optional React provider and hook primitives

Consumers should render their own wallet selection UI and call adapters directly.

## Install

```bash
npm install @trustauthy/xrpl-wallet-connect
```

## Usage

```ts
import {
  createGemWalletAdapter,
  createXamanAdapter,
} from "@trustauthy/xrpl-wallet-connect/adapters";
```

## Commands

- `npm run check`
- `npm run test`
- `npm run build`

## License

MIT. See [LICENSE](./LICENSE).
