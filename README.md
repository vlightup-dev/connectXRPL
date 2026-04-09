# connectXRPL

`@trustauthy/connectxrpl` is a React and TypeScript wallet-connect package for XRPL wallets.

This package is open source software.

It ships:

- XRPL wallet adapter types and shared error helpers
- direct adapters for `GemWallet`, `Xaman`, and `Crossmark`
- optional React provider and hook primitives

Consumers should render their own wallet selection UI and call adapters directly.

## Install

```bash
npm install @trustauthy/connectxrpl
```

## Usage

```ts
import { createGemWalletAdapter, createXamanAdapter } from "@trustauthy/connectxrpl/adapters";
```

### Xaman Setup

The Xaman adapter uses the official `xumm` JS/TS SDK for browser sign-in and sign requests.
The SDK manages the browser session/JWT for the signed-in Xaman user.

Before using `createXamanAdapter(...)`, you need to:

1. Create an app in the Xaman Developer Console.
2. Copy the Xaman API key into your frontend config.
3. Configure your web app origin and return URL in the Xaman Developer Console.
4. Pass the same return URL into `createXamanAdapter(...)` if you want signed payloads to
   return the browser to a known route after approval.

Example:

```ts
import { createXamanAdapter } from "@trustauthy/connectxrpl/adapters";

const xamanAdapter = createXamanAdapter({
  apiKey: process.env.NEXT_PUBLIC_XAMAN_API_KEY,
  redirectUrl: process.env.NEXT_PUBLIC_XAMAN_REDIRECT_URL,
});
```

Notes:

- Do not ship a Xaman API secret in frontend code. The client-side adapter should only use the
  public API key.
- The return URL should point back to the same web app that will resume wallet selection and
  signing after Xaman returns from the Xaman app or browser flow.
- Transaction signing uses the SDK payload flow and fetches the signed transaction blob from the
  resolved payload response.
- If you need backend-generated or long-lived user-bound sign request management, follow Xaman's
  backend/API flow instead of exposing extra credentials in the browser.

## Commands

- `npm run check`
- `npm run test`
- `npm run build`

## License

MIT. See [LICENSE](./LICENSE).
