# XRPL Wallet Connect

## Project Overview

`@trustauthy/connectxrpl` — TypeScript library for connecting XRPL wallets. Monorepo with packages for core logic, React bindings, and wallet adapters (GemWallet, Xaman, Crossmark).

## Structure

```
packages/
  core/        # Core wallet connection logic
  react/       # React hooks and components
  adapters/
    gemwallet/
    xaman/
    crossmark/
src/           # Root re-exports (index.ts, react.ts, adapters.ts)
```

## Commands

```bash
npm run check   # vp check (oxlint)
npm run test    # vp test (vitest)
npm run build   # tsc -p tsconfig.build.json
```

## Key Details

- **Package name**: `@trustauthy/connectxrpl`
- **Toolchain**: TypeScript + Vite + Vitest + oxlint (via vite-plus)
- **Releases**: semantic-release (master = stable, next = prerelease)
- **Node**: >=18
- **All wallet adapter dependencies are optional peer deps**

## Branches

- `master` — stable releases
- `next` — prerelease channel
