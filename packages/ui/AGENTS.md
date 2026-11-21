This file provides guidance when working with code in the `@lellimecnar/ui` package.

## Package Overview

Web UI component library built on Radix UI primitives and Tailwind CSS, following the shadcn/ui pattern. Components are TypeScript source (not compiled); Next.js apps transpile the package (`transpilePackages: ['@lellimecnar/ui']`).

## Package Structure

```
src/
├── components/   # one file per component (button.tsx, form.tsx, ...)
├── lib/          # cn() class merging (utils.ts), colors
├── icons/        # icon re-exports
├── qrcode/       # QR code component
├── theme/        # ThemeProvider (next-themes)
└── global.css    # Tailwind entry, compiled to dist/global.css
```

## Development Commands

```bash
pnpm ui build        # compile global.css
pnpm ui dev          # watch mode
pnpm ui ui           # shadcn CLI: add a component
pnpm ui test
pnpm ui lint
pnpm ui type-check
```

## Package Exports

Exports are granular (one per component); never import from the package root.

```typescript
import { Button } from '@lellimecnar/ui/button';
import { cn } from '@lellimecnar/ui/lib/utils';
import { ThemeProvider } from '@lellimecnar/ui/theme';
import { QRCode } from '@lellimecnar/ui/qrcode';
import '@lellimecnar/ui/global.css'; // required
```

`useTheme` comes from `next-themes`, not from this package. The `./hooks` export in `package.json` points at `src/hooks/index.ts`, which does not exist; do not import from it.

## Rules

- Build components on Radix primitives, style with Tailwind CSS variables (not hardcoded colors), use `cva` for variants and `cn()` for class merging, export prop types.
- New component: add `src/components/<name>.tsx`, add its `./<name>` entry to `package.json` `exports`, or run `pnpm ui ui` for shadcn components.
- Consuming Next.js apps import `@lellimecnar/ui/global.css` in the root layout and wrap the app in `ThemeProvider` for dark mode.

## Versions and dependencies

See `package.json`.
