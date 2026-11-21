This file provides guidance when working with code in the `@lellimecnar/eslint-config` package.

## Package Overview

Shared ESLint config (private) extending Vercel's style guide with TypeScript, React, Tailwind, Prettier and Turborepo rules.

## Entry points

`.` / `./base` (`base.js`), `./browser`, `./next`, `./node`; the last three extend base. Use in a consumer's `.eslintrc.js`:

```javascript
module.exports = require('@lellimecnar/eslint-config/next');
```

## Rules

- `only-warn` makes all rules warnings, and several TypeScript strict rules are relaxed.
- Prettier runs as an ESLint rule using `@lellimecnar/prettier-config`.
- A new preset is a new `.js` file extending base plus a `package.json` `exports` entry.

## Development Commands

```bash
pnpm --filter @lellimecnar/eslint-config lint
pnpm --filter @lellimecnar/eslint-config type-check
```

## Versions and dependencies

See `package.json`.
