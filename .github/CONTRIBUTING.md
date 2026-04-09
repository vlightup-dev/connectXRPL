# Contributing

## Setup

```bash
git clone https://github.com/trustauthy/connectXRPL.git
cd connectXRPL
npm install
```

## Development

```bash
npm run check   # lint + format
npm test        # run tests
npm run build   # compile TypeScript
```

All three must pass before submitting a PR.

## Adding a wallet adapter

1. Create `packages/adapters/<wallet-name>/src/index.ts` implementing `WalletAdapter` from `packages/core/src/types.ts`
2. Add tests in `src/test/adapters/<wallet-name>.test.ts`
3. Export from `src/adapters.ts`

## Submitting changes

- Open an issue first for non-trivial changes
- Keep PRs focused — one concern per PR
- Add or update tests for any changed behavior
- Run `npm run check --fix` before pushing to auto-fix formatting

## Reporting bugs

Use the bug report issue template. Include the wallet name, browser, and extension version if relevant.
