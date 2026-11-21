This file provides guidance when working with code in the `@lellimecnar/prettier-config` package.

## Package Overview

Shared Prettier config (private), extending `@vercel/style-guide/prettier`.

## Entry point

`prettier-preset.js`. Use it with `"prettier": "@lellimecnar/prettier-config"` in a consumer's `package.json`.

## Rules

- Indentation is tabs (`useTabs: true`); everything else is inherited from the Vercel style guide.
- Consumers may override settings by spreading the preset and adding their own.

## Development Commands

```bash
pnpm --filter @lellimecnar/prettier-config lint
pnpm --filter @lellimecnar/prettier-config type-check
```

## Versions and dependencies

See `package.json`.
