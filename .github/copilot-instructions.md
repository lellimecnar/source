# Copilot Instructions for @lellimecnar/source

## Monorepo Architecture

This is a **pnpm + Turborepo** monorepo with strictly enforced workspace boundaries:

- `web/*` - Next.js 14+ App Router apps (`miller.pub`, `readon.app`)
- `mobile/*` - Expo 52 + Expo Router apps (`readon`)
- `packages/*` - Shared libraries (`ui`, `ui-nativewind`, `utils`, `config-*`)
- `card-stack/*` - Card game engine packages (`core`, `deck-standard`)

All workspace dependencies use `workspace:*` protocol, NOT file paths or versions.

## Critical Development Commands

```bash
# Run specific workspace (NEVER use cd into subdirectory)
pnpm miller.pub dev
pnpm readon.app dev
pnpm readon dev              # Android
pnpm readon dev:ios
pnpm ui dev                  # Watch mode for Tailwind

# Add new shadcn/ui component to @lellimecnar/ui
pnpm ui ui

# Test specific package
# Run unit tests via #tool:execute/runTests (preferred)

# Deep clean (removes all node_modules, .turbo, .next, .expo)
pnpm clean
```

## Package Export Patterns

### Web UI (@lellimecnar/ui)

Uses **granular exports** for tree-shaking. Never import from package root:

```typescript
// ✅ CORRECT - granular imports
import { Button } from '@lellimecnar/ui/button';
import { cn } from '@lellimecnar/ui/lib/utils';
import '@lellimecnar/ui/global.css';

// ❌ WRONG - no barrel exports
import { Button } from '@lellimecnar/ui';
```

The package exports are defined in `package.json` exports field. Check `packages/ui/package.json` before adding imports.

### Mobile UI (@lellimecnar/ui-nativewind)

Similar pattern for React Native components using NativeWind:

```typescript
import { View, Stack } from '@lellimecnar/ui-nativewind';
import '@lellimecnar/ui-nativewind/global.css';
```

## Next.js Configuration Pattern

Both Next.js apps MUST transpile the `@lellimecnar/ui` package because it uses TypeScript sources:

```javascript
// web/*/next.config.js
module.exports = {
	reactStrictMode: true,
	transpilePackages: ['@lellimecnar/ui'],
};
```

## TypeScript Mixin Pattern (Card Stack)

The `@card-stack/core` uses **ts-mixer** for composable mixins, NOT traditional class inheritance:

```typescript
import { Mix } from 'ts-mixer';

// Compose multiple behaviors using Mix
class StandardCard extends Mix(Card, Flippable, Rankable, Suitable) {
	// Implementation
}
```

When extending card-stack classes, use mixins to add capabilities rather than deep inheritance chains.

## Shared Configuration Usage

All packages inherit from centralized configs:

```json
// tsconfig.json
{
  "extends": "@lellimecnar/typescript-config/next.json"  // or base.json, react.json
}

// .eslintrc.js
module.exports = require('@lellimecnar/eslint-config/next')  // or browser, node, base

// tailwind.config.ts
import baseConfig from '@lellimecnar/tailwind-config'
export default baseConfig
```

**Never duplicate** ESLint rules, TypeScript compiler options, or Tailwind theme config that can be shared.

## Turborepo Task Dependencies

Build tasks have dependencies defined in `turbo.json`:

- `build` depends on `^build` (upstream packages build first)
- `lint` depends on `^build` (requires built packages)
- `dev` and `test:watch` are persistent tasks (never cache)

When adding new tasks, consider dependencies to avoid build order issues.

## Expo Router File Structure

The mobile app uses **file-based routing** with special naming:

```
app/
├── _layout.tsx          # Root layout (must be prefixed with _)
├── (tabs)/              # Tab group (parentheses = no route segment)
├── +html.tsx            # Web-only HTML wrapper (+ prefix)
└── modal.tsx            # Can be presented as modal
```

Routes in `()` don't create URL segments. Files prefixed with `+` are web-only.

## Testing Convention

Jest is configured per-package, NOT at monorepo root:

- Config location: `<package>/jest.config.js`
- Tests alongside source: `<package>/src/**/*.spec.ts`
- Run tests via `#tool:execute/runTests` (preferred)

Card-stack packages have comprehensive tests using Jest. Follow existing patterns when adding tests.

## UI Component Development

When adding new shadcn/ui components to `@lellimecnar/ui`:

1. Run `pnpm ui ui` (runs shadcn CLI)
2. Select component to add
3. Update `package.json` exports to expose the new component
4. Import using granular export path: `@lellimecnar/ui/component-name`

The `ui` package compiles Tailwind CSS on build (`pnpm ui build`). Changes to components require rebuilding CSS.

## Node & Package Manager

- **Node**: ^24 (enforced)
- **pnpm**: 9.12.2 (enforced via `packageManager` field)
- Never use npm or yarn commands
- Package manager enforcement prevents version mismatches
