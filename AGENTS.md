# AGENTS.md - Developer Guide & AI Instructions

This file serves as the primary entry point for AI agents and developers working on the `@lellimecnar/source` monorepo. It consolidates critical information about the project structure, workflows, and commands.

## 1. Project Overview

This is a **pnpm + Turborepo** monorepo containing web applications, mobile applications, shared UI libraries, and a card game engine.

## 📚 Documentation

- **[Developer Guide (this file)](./AGENTS.md):** Primary entry point for developers and AI agents.
- **[Contributing](./CONTRIBUTING.md):** Guidelines for contributing to the project.
- **[Security](./SECURITY.md):** Security policy and secret management.
- **[Changelog](./CHANGELOG.md):** Version history.
- **[Code of Conduct](./CODE_OF_CONDUCT.md):** Community standards.

### Blueprints

- **[Architecture](./Project_Architecture_Blueprint.md):** High-level system design.
- **[Folder Structure](./Project_Folders_Structure_Blueprint.md):** Detailed directory hierarchy.
- **[Tech Stack](./Technology_Stack_Blueprint.md):** List of technologies used.
- **[Workflows](./Project_Workflow_Documentation.md):** Common development scenarios.

### API Reference

- **[UI Components](./docs/api/ui-components.md):** Props and usage for `@lellimecnar/ui`.
- **[Card Stack](./docs/api/card-stack.md):** Core classes and mixins for the game engine.
- **[Utilities](./docs/api/utils.md):** Shared utility functions.

### Architecture Decision Records (ADRs)

- **[ADR-0001: Use Turborepo](./docs/adr/0001-use-turborepo.md)**
- **[ADR-0002: Mixin Pattern for Cards](./docs/adr/0002-mixin-pattern-for-cards.md)**

## 2. Monorepo Structure

The repository is organized into the following workspaces:

- **`web/*`**: Next.js 14+ App Router applications.
  - `miller.pub`: Personal portfolio/website.
  - `readon.app`: Reading application web interface.
- **`mobile/*`**: Expo/React Native applications.
  - `readon`: Mobile reading app using Expo Router.
- **`packages/*`**: Shared libraries and configurations.
  - `ui`: Web UI component library (React, Radix UI, Tailwind, shadcn/ui).
  - `ui-nativewind`: Mobile UI component library (NativeWind).
  - `utils`: Shared utilities (date-fns, lodash).
  - `config-*`: Shared configs (eslint, jest, prettier, tailwind, typescript).
- **`card-stack/*`**: Domain logic packages.
  - `core`: Core card game engine using TypeScript mixins.
  - `deck-standard`: Standard 52-card deck implementation.

### Documentation Map

- **[README.md](./README.md)**: Project overview and quick start.
- **[CONTRIBUTING.md](./CONTRIBUTING.md)**: Contribution guidelines.
- **[SECURITY.md](./SECURITY.md)**: Security policy.
- **[CHANGELOG.md](./CHANGELOG.md)**: Version history.
- **[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)**: Community standards.
- **[docs/adr](./docs/adr)**: Architecture Decision Records.
- **[docs/api](./docs/api)**: API Documentation.

## 3. Tech Stack Summary

- **Package Manager**: pnpm (v9.12.2)
- **Build System**: Turborepo
- **Web Framework**: Next.js 14 (App Router)
- **Mobile Framework**: Expo 52 (Expo Router)
- **Styling**: Tailwind CSS (Web) / NativeWind (Mobile)
- **Language**: TypeScript 5.5
- **Testing**: Jest

## 4. Setup & Installation

**Prerequisites:**

- Node.js ^20
- pnpm ^9 (Enforced via `packageManager` in `package.json`)

**Installation:**

```bash
pnpm install
```

## 5. Development Commands

### Root Level

Run these commands from the repository root:

```bash
# Start all development servers
pnpm dev

# Build all packages and apps
pnpm build

# Lint all workspaces
pnpm lint

# Run all tests
pnpm test

# Type-check all workspaces
pnpm type-check

# Deep clean (removes node_modules, .turbo, .next, .expo)
pnpm clean
```

### Workspace Specific

Use `pnpm --filter <workspace>` or the specific scripts defined in root `package.json`:

**Web Apps:**

```bash
# miller.pub
pnpm miller.pub dev
pnpm miller.pub build

# readon.app
pnpm readon.app dev
pnpm readon.app build
```

**Mobile App (readon):**

```bash
pnpm readon dev              # Start Metro bundler (Android)
pnpm readon dev:ios          # Start for iOS
pnpm readon dev:web          # Start for Web
```

**Packages:**

```bash
# UI Package (Watch mode for Tailwind)
pnpm ui dev

# Add shadcn/ui component
pnpm ui ui
```

**Card Stack (Testing):**

```bash
pnpm --filter @card-stack/core test
pnpm --filter @card-stack/core test:watch
```

## 6. Architecture & Patterns

### Package Exports

- **`@lellimecnar/ui`**: Uses granular exports for tree-shaking.

  ```typescript
  // ?Correct
  import { Button } from '@lellimecnar/ui/button';

  // ❌ Incorre
  import { Button } from '@lellimecnar/ui';
  ```

### TypeScript Mixins (Card Stack)

- The `@card-stack/core` package uses `ts-mixer` for composition over inheritance.
- Classes like `StandardCard` mix behaviors (`Flippable`, `Rankable`, `Suitable`).

### Next.js Configuration

- Web apps must transpile the UI package in `next.config.js`:
  ```javascript
  transpilePackages: ['@lellimecnar/ui'];
  ```

### Mobile Routing

- Uses **Expo Router** with file-based routing in `app/`.
- `_layout.tsx` defines the layout structure.
- `(tabs)` group defines tab navigation.

## 7. Testing Strategy

- **Unit Tests**: Jest is configured per-package.
- **Running Tests**:
  - Root: `pnpm test` (runs all)
  - Package: `pnpm --filter <package-name> test`
- **Test Location**: Co-located with source files (e.g., `src/utils.spec.ts`).

## 8. Pull Request Guidelines

1.  **Scope**: Keep changes focused on a single task or feature.
2.  **Tests**: Ensure all tests pass (`pnpm test`) before submitting.
3.  **Linting**: Run `pnpm lint` to verify code style.
4.  **Type Check**: Run `pnpm type-check` to ensure no TypeScript errors.
5.  **Documentation**: Update relevant blueprints or `AGENTS.md` if architectural changes are made.

## 9. Troubleshooting

**Issue: Build failures or weird caching issues.**

- **Fix**: Run `pnpm clean` to remove all artifacts and `node_modules`, then reinstall with `pnpm install`.

**Issue: Tailwind styles not applying in UI package.**

- **Fix**: Ensure `pnpm ui build` has been run or `pnpm ui dev` is running to generate the CSS.

**Issue: "Module not found" for workspace packages.**

- **Fix**: Verify `pnpm-workspace.yaml` includes the package path and that `package.json` name matches the import.
