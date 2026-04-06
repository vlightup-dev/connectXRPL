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

### Xaman Setup

The Xaman adapter uses the browser PKCE flow from `xumm-oauth2-pkce`, with the JWT/session
remembered in `localStorage`.

Before using `createXamanAdapter(...)`, you need to:

1. Create an app in the Xaman Developer Console.
2. Copy the Xaman API key into your frontend config.
3. Configure a redirect URL in your app, such as `https://your-app.example.com/`.
4. Add that same redirect URL to the Xaman Developer Console as an allowed Return URL.

Example:

```ts
import { createXamanAdapter } from "@trustauthy/xrpl-wallet-connect/adapters";

const xamanAdapter = createXamanAdapter({
  apiKey: process.env.NEXT_PUBLIC_XAMAN_API_KEY,
  redirectUrl: process.env.NEXT_PUBLIC_XAMAN_REDIRECT_URL,
});
```

Notes:

- Do not ship a Xaman API secret in frontend code. The client-side adapter should only use the
  public API key.
- The redirect URL should point back to the same web app that will resume wallet selection and
  signing after Xaman returns.
- If you need backend-generated or long-lived user-bound sign request management, follow Xaman's
  backend/API flow instead of exposing extra credentials in the browser.

## Commands

- `npm run check`
- `npm run test`
- `npm run build`

## License

MIT. See [LICENSE](./LICENSE).
