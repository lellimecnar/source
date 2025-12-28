This file provides guidance when working with code in the `@lellimecnar/vitest-config` package.

## Package Overview

`@lellimecnar/vitest-config` is a shared Vitest configuration package.

- Provides a base Node config (`@lellimecnar/vitest-config`).
- Provides browser configs (`@lellimecnar/vitest-config/browser` and `.../browser-jsdom`).
- Provides composable Next.js mocks and presets.

## Development Commands

```bash
pnpm --filter @lellimecnar/vitest-config type-check
pnpm --filter @lellimecnar/vitest-config lint
```
