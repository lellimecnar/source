This file provides guidance when working with code in the `@lellimecnar/utils` package.

## Package Overview

Shared utilities built from `lodash` and `date-fns`. Built with Vite; consumers import `dist/`.

## Entry points

- `src/index.ts` re-exports `./lodash` only.
- `src/lodash.ts`: lodash helpers plus custom ones (e.g. `pascalCase`); import lodash functions individually (`lodash/chunk`) for tree-shaking.
- `src/dates.ts`: sets the `date-fns` default locale to `enUS` and re-exports `date-fns`. It is not re-exported from `index.ts`.

## Rules

- Prefer re-exporting established library functions over custom implementations.
- A new utility goes in the matching file and is exported from `src/index.ts` (via `./lodash` or a new `export * from './<file>'`).

## Development Commands

```bash
pnpm --filter @lellimecnar/utils build
pnpm --filter @lellimecnar/utils lint
pnpm --filter @lellimecnar/utils type-check
```

## Versions and dependencies

See `package.json`.
