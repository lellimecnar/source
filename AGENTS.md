This file provides guidance when working with code in this repository.

## Monorepo Structure

This is a **pnpm + Turborepo** monorepo with the following workspace organization:

- `web/*` - Next.js web applications
  - `miller.pub` - Personal portfolio/website using Next.js App Router
  - `readon.app` - Reading app web interface using Next.js App Router
- `mobile/*` - Mobile applications
  - `readon` - Expo/React Native mobile app using Expo Router
- `packages/*` - Shared packages and configurations
  - `ui` - Web UI component library (React, Radix UI, Tailwind, shadcn/ui)
  - `ui-nativewind` - React Native UI component library (NativeWind)
  - `utils` - Shared utilities (date-fns, lodash)
  - `config-*` - Shared configurations (eslint, jest, prettier, tailwind, typescript, babel)
- `card-stack/*` - Card game engine packages
  - `core` - Core card game logic and abstractions
  - `deck-standard` - Standard 52-card deck implementation

## Development Commands

### Root-level Commands
```bash
# Run all dev servers across workspaces
pnpm dev

# Build all packages and apps
pnpm build

# Lint all packages
pnpm lint

# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type-check all packages
pnpm type-check

# Format code (auto-fix lint issues)
pnpm format

# Deep clean (removes all node_modules, .turbo, .next, .expo)
pnpm clean
```

### Working with Specific Workspaces
```bash
# miller.pub workspace
pnpm miller.pub dev
pnpm miller.pub build

# readon.app workspace
pnpm readon.app dev
pnpm readon.app build

# readon mobile workspace
pnpm readon dev              # Android dev
pnpm readon dev:ios          # iOS dev
pnpm readon dev:web          # Web dev

# UI package
pnpm ui dev                  # Watch mode for Tailwind CSS
pnpm ui ui                   # Run shadcn CLI for adding components
```

### Testing
```bash
# Run all tests
pnpm test

# Run tests for card-stack packages
pnpm --filter @card-stack/core test
pnpm --filter @card-stack/core test:watch
```

## Tech Stack

### Web Applications (Next.js)
- **Framework**: Next.js 14+ with App Router
- **Styling**: Tailwind CSS
- **UI Components**: Custom component library (`@lellimecnar/ui`) built on Radix UI and shadcn/ui
- **TypeScript**: Version 5.5
- **Config**: Both apps transpile `@lellimecnar/ui` package (see `next.config.js`)

### Mobile Application (Expo)
- **Framework**: Expo 52 with Expo Router
- **Navigation**: Expo Router with file-based routing
- **Styling**: NativeWind (Tailwind for React Native)
- **UI Components**: Custom NativeWind component library (`@lellimecnar/ui-nativewind`)
- **React Native**: Version 0.76.3

### Shared Packages
- **@lellimecnar/ui**: Web component library with modular exports (buttons, forms, inputs, etc.)
  - Built with Radix UI primitives
  - Styled with Tailwind CSS
  - Uses shadcn/ui pattern
  - Build command compiles Tailwind CSS
- **@lellimecnar/ui-nativewind**: React Native component library
- **@lellimecnar/utils**: Shared utilities with date-fns and lodash
- **@card-stack/core**: Card game engine core with TypeScript mixins (ts-mixer)
- **@card-stack/standard-deck**: Standard 52-card deck implementation

## Architecture Notes

### Workspace Dependencies
- Next.js apps depend on `@lellimecnar/ui` (web components)
- Expo app depends on `@lellimecnar/ui-nativewind` (mobile components)
- All workspaces use shared config packages (`config-eslint`, `config-typescript`, etc.)
- Card-stack packages are independent and use Jest for testing

### Package Exports
The `@lellimecnar/ui` package uses granular exports to allow tree-shaking:
```typescript
import { Button } from '@lellimecnar/ui/button'
import { useTheme } from '@lellimecnar/ui/hooks'
import '@lellimecnar/ui/global.css'
```

### Turborepo Pipeline
- `build` tasks depend on upstream `^build` completion
- `lint` tasks depend on upstream builds
- `dev` and `test:watch` are persistent tasks (non-cacheable)
- Build outputs: `dist/**`, `.next/**` (excluding `.next/cache`)

### Mobile App Structure
- Uses Expo Router file-based routing
- App entry point: `expo-router/entry`
- Layout structure: `app/_layout.tsx`, `app/(tabs)/`, modal routes
- Development scripts target different platforms (Android, iOS, Web)

## Key Configuration Files
- `turbo.json` - Turborepo task pipeline configuration
- `pnpm-workspace.yaml` - Workspace package definitions
- `.env` - Contains `TURBO_TOKEN` for remote caching
- `components.json` - shadcn/ui configuration in `packages/ui`

## Node & Package Manager Requirements
- **Node**: ^20
- **pnpm**: ^9 (specifically 9.12.2)
- Package manager is enforced via `packageManager` field
