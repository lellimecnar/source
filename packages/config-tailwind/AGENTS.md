This file provides guidance when working with code in the `@lellimecnar/tailwind-config` package.

## Package Overview

Shared Tailwind CSS config (private): theme extension, plugins (typography, animate, opentype) and CSS-variable-based colors (HSL, `--radius`, `--font-sans`) for dark-mode theming.

## Entry point

`.` exports `tailwind.config.ts`, typed as `Omit<Config, 'content'>`.

## Rules

- Consumers set their own `content` paths and define the CSS variables (`--background`, `--primary`, ...) in their global CSS. `packages/ui/src/global.css` is the reference.
- Extend it in a consumer: `{ ...sharedConfig, content: [...] }` in that package's `tailwind.config.ts`.
- A new theme color is a new CSS variable in the consumer's global CSS plus a mapping in `tailwind.config.ts`.

## Development Commands

```bash
pnpm --filter @lellimecnar/tailwind-config lint
pnpm --filter @lellimecnar/tailwind-config type-check
```

## Versions and dependencies

See `package.json`.
