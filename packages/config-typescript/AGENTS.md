This file provides guidance when working with code in the `@lellimecnar/typescript-config` package.

## Package Overview

Shared TypeScript compiler presets for the monorepo, extending Vercel's style guide (`@vercel/style-guide/typescript/node20`). Private workspace package (`"private": true`); not published.

## Entry points

- `base.json`: Node.js/general (strict, ESNext, `allowJs` + `checkJs`, no emit)
- `next.json`: Next.js apps (extends base)
- `react.json`: React packages (extends base)

```json
{ "extends": "@lellimecnar/typescript-config/next.json" }
```

## Rules

- Type-checking uses tsgo: consuming packages define `"type-check": "tsgo --noEmit"` (not `tsc`).
- Configs are JSON, not JavaScript. A new preset is a new `.json` file that extends `./base.json`, plus an entry in `package.json` `exports`.

## Development Commands

```bash
pnpm --filter @lellimecnar/typescript-config lint
```

## Versions and dependencies

See `package.json`.
