# Project Folder Structure Blueprint

## 1. Structural Overview

This project is a **TypeScript Monorepo** managed with **pnpm** and **Turborepo**. It follows a modular architecture that separates applications (web and mobile) from shared logic and UI libraries.

### Organizational Principles

- **Workspace-Based**: The codebase is divided into distinct workspaces (`web`, `mobile`, `packages`) defined in `pnpm-workspace.yaml`.
- **Shared Configuration**: Configuration for tools like ESLint, TypeScript, Tailwind, and Jest is centralized in `packages/config-*` to ensure consistency across all projects.
- **Component-Driven UI**: UI components are centralized in `@lellimecnar/ui` (Web) and `@lellimecnar/ui-nativewind` (Mobile) rather than being duplicated in apps.
- **Domain Isolation**: Core business logic (like the card game engine) is isolated in `packages/card-stack/` packages, keeping it framework-agnostic and testable.
- **App Router Pattern**: Both Web (Next.js) and Mobile (Expo) use file-system based routing in an `app/` directory.

### Monorepo Organization

- **`web/`**: Contains Next.js 14+ applications using the App Router.
- **`mobile/`**: Contains Expo/React Native applications using Expo Router.
- **`packages/`**: Contains shared infrastructure, UI libraries, and configurations.
- **`packages/card-stack/`**: Contains domain-specific packages for the card game engine.

## 2. Directory Visualization

```
.
├── packages/card-stack/        # Domain-specific logic packages
│   ├── core/                   # Core game engine logic
│   │   ├── src/                # Source code
│   │   │   ├── card/           # Card entity definitions
│   │   │   ├── card-deck/      # Deck management logic
│   │   │   ├── card-set/       # Set management logic
│   │   │   └── player/         # Player entity definitions
│   │   ├── jest.config.js      # Package-specific test config
│   │   └── package.json        # Package manifest
│   └── deck-standard/          # Standard 52-card deck implementation
├── packages/jsonpath/          # RFC-compliant JSONPath suite
│   ├── jsonpath/               # Unified facade
│   ├── evaluator/              # RFC 9535 interpreter
│   ├── parser/                 # Pratt parser
│   ├── lexer/                  # Tokenizer
│   ├── pointer/                # RFC 6901 Pointer
│   ├── patch/                  # RFC 6902 Patch
│   ├── merge-patch/            # RFC 7386 Merge Patch
│   ├── compiler/               # Functional wrapper
│   ├── functions/              # Filter functions
│   └── core/                   # Shared types and AST
├── mobile/                     # Mobile applications
│   └── readon/                 # Expo/React Native app
│       ├── app/                # Expo Router pages
│       │   ├── (tabs)/         # Tab navigation group
│       │   └── _layout.tsx     # Root layout
│       ├── components/         # App-specific components
│       └── nativewind-env.d.ts # NativeWind types
├── packages/                   # Shared libraries and configs
│   ├── config-babel/           # Shared Babel config
│   ├── config-eslint/          # Shared ESLint config
│   ├── config-jest/            # Shared Jest config
│   ├── config-prettier/        # Shared Prettier config
│   ├── config-tailwind/        # Shared Tailwind config
│   ├── config-typescript/      # Shared TypeScript config
│   ├── ui/                     # Web UI Component Library (shadcn/ui)
│   │   └── src/
│   │       ├── components/     # Reusable UI components
│   │       ├── lib/            # UI utilities (cn, etc.)
│   │       └── theme/          # Theme definitions
│   ├── ui-nativewind/          # Mobile UI Component Library
│   └── utils/                  # Shared utility functions
├── web/                        # Web applications
│   ├── miller.pub/             # Personal site (Next.js)
│   │   ├── src/
│   │   │   ├── app/            # App Router pages
│   │   │   └── components/     # App-specific components
│   │   └── next.config.js      # Next.js config
│   └── readon.app/             # Reading app (Next.js)
├── AGENTS.md                   # AI Agent instructions
├── package.json                # Root package.json
├── pnpm-workspace.yaml         # Workspace definitions
└── turbo.json                  # Turborepo pipeline config
```

## 3. Key Directory Analysis

### Web Projects (`web/*`)

Next.js applications using the App Router.

- **`src/app/`**: Contains routes, layouts, and page components. Follows Next.js conventions (`page.tsx`, `layout.tsx`, `route.ts`).
- **`src/components/`**: Contains components specific to the application that are not generic enough for the shared UI library.
- **`src/config/`**: Application-specific configuration files.

### Mobile Projects (`mobile/*`)

Expo applications using Expo Router.

- **`app/`**: File-based routing directory.
  - **`(tabs)/`**: Group for tab-based navigation routes.
  - **`_layout.tsx`**: Defines the layout structure for routes.
  - **`+html.tsx`**: Web-only HTML entry point.
- **`components/`**: App-specific React Native components.

### Shared UI (`packages/ui`)

A shared UI library based on shadcn/ui.

- **`src/components/`**: Individual UI components (Button, Input, etc.).
- **`src/lib/`**: Utilities like `utils.ts` for class merging (`cn`).
- **`src/theme/`**: Theme configuration and variables.

### Domain Logic (`packages/card-stack/*`)

Pure TypeScript packages for business logic.

- **`src/`**: Source code organized by domain entity (Card, Deck, Player).
- **`src/index.ts`**: Public API export.
- **`src/**/\*.spec.ts`\*\*: Co-located unit tests.

### JSONPath Suite (`packages/jsonpath/*`)

RFC-compliant data manipulation libraries.

- **`jsonpath/`**: The main entry point providing a unified API for querying and patching.
- **`evaluator/`, `parser/`, `lexer/`**: Core components of the JSONPath engine.
- **`pointer/`, `patch/`, `merge-patch/`**: Implementations of related RFCs for data addressing and modification.
- **`compiler/`**: Provides JIT-like compilation of JSONPath expressions into reusable functions.

### Configuration Packages (`packages/config-*`)

- **`config-eslint/`**: Exports ESLint configurations (base, next, react).
- **`config-typescript/`**: Exports `tsconfig` bases (base, next, react).
- **`config-tailwind/`**: Exports shared Tailwind configuration.

## 4. File Placement Patterns

- **Configuration Files**:
  - **Root**: `turbo.json`, `pnpm-workspace.yaml` for monorepo orchestration.
  - **Package Root**: `package.json`, `tsconfig.json`, `jest.config.js` for package-specific settings.
  - **Next.js**: `next.config.js`, `tailwind.config.ts` in the app root.
  - **Expo**: `app.config.ts`, `metro.config.js` in the app root.

- **Source Code**:
  - **Apps**: `src/` (Web) or root (Mobile) for source files.
  - **Packages**: `src/` directory.

- **Styles**:
  - **Global**: `global.css` in `app/` or `src/app/`.
  - **Tailwind**: Configured via `tailwind.config.ts` in each package/app, extending `packages/config-tailwind`.

- **Tests**:
  - **Unit Tests**: Co-located with source files (e.g., `utils.spec.ts` next to `utils.ts`).
  - **Configuration**: `jest.config.js` in each package, extending `packages/config-jest`.

## 5. Naming and Organization Conventions

- **File Naming**:
  - **Components**: `PascalCase.tsx` (e.g., `Button.tsx`).
  - **Utilities/Hooks**: `camelCase.ts` (e.g., `useTheme.ts`, `utils.ts`).
  - **Next.js/Expo Special Files**: Specific conventions (`page.tsx`, `layout.tsx`, `_layout.tsx`).
  - **Tests**: `*.spec.ts` or `*.test.ts`.

- **Folder Naming**:
  - **General**: `kebab-case` (e.g., `card-stack`, `ui-nativewind`).
  - **Route Groups**: `(group-name)` (e.g., `(tabs)`).
  - **Private Folders**: `_folder` (e.g., `_components` inside app).

- **Imports**:
  - **Internal Packages**: `@lellimecnar/<package-name>` (e.g., `@lellimecnar/ui`).
  - **Card Stack**: `@card-stack/<package-name>` (e.g., `@card-stack/core`).
  - **JSONPath**: `@jsonpath/<package-name>` (e.g., `@jsonpath/jsonpath`).
  - **Granular Imports**: Prefer importing specific components/files from packages (e.g., `@lellimecnar/ui/button`) to support tree-shaking.

## 6. Navigation and Development Workflow

- **Entry Points**:
  - **Web**: `web/*/src/app/page.tsx`
  - **Mobile**: `mobile/*/app/index.tsx`
  - **Packages**: `packages/*/src/index.ts` (or specific exports defined in `package.json`)

- **Common Tasks**:
  - **Add UI Component**: Run `pnpm ui ui` in the root to add a shadcn/ui component to `@lellimecnar/ui`.
  - **Run Dev Server**: `pnpm dev` (runs all), or `pnpm <workspace-name> dev` (e.g., `pnpm miller.pub dev`).
  - **Testing**: Use `#tool:execute/runTests` (preferred) and target relevant `*.spec.*` files.

- **Dependencies**:
  - Apps depend on `packages/ui` and `packages/utils`.
  - `packages/ui` depends on `packages/config-tailwind`.
  - All packages depend on `packages/config-*` for dev tooling.

## 7. Build and Output Organization

- **Build System**: Turborepo handles task orchestration and caching.
- **Output**:
  - **Next.js**: `.next/` folder in app directory.
  - **Packages**: Transpiled output (if applicable) or direct source usage (internal packages often consumed as source via `transpilePackages` in Next.js).
  - **Cache**: `.turbo/` folder stores remote cache artifacts.

## 8. Technology-Specific Organization

### Next.js (Web)

- **`next.config.js`**: Configures `transpilePackages` to include local workspace packages like `@lellimecnar/ui`.
- **`src/app`**: Uses the App Router for all routing.

### Expo (Mobile)

- **`app.config.ts`**: Dynamic Expo configuration.
- **`nativewind-env.d.ts`**: Type definitions for NativeWind.
- **`metro.config.js`**: Configured to resolve workspace packages.

### TypeScript

- **`tsconfig.json`**: Extends base configs from `packages/config-typescript`.
- **`references`**: Used in `tsconfig.json` for composite projects (if enabled) or simple `extends` pattern.

## 9. Extension and Evolution

- **Adding a New App**: Create a new folder in `web/` or `mobile/`, initialize with the respective framework CLI, and extend shared configs.
- **Adding a New Package**: Create a folder in `packages/`, add `package.json`, and configure `tsconfig.json` to extend shared config.
- **Extending UI**: Add new components to `packages/ui/src/components` and export them.

## 10. Structure Templates

### New Package Template

```
packages/new-package/
├── package.json          # Define name @lellimecnar/new-package
├── tsconfig.json         # Extends @lellimecnar/typescript-config/base.json
├── src/
│   ├── index.ts          # Main export
│   └── lib/              # Logic
└── jest.config.js        # Extends @lellimecnar/jest-config/preset
```

### New UI Component Template (Manual)

```
packages/ui/src/components/new-component.tsx
packages/ui/src/components/new-component.spec.ts (optional)
```

_Note: Prefer using `pnpm ui ui` to generate components._

## 11. Structure Enforcement

- **Linting**: ESLint rules in `packages/config-eslint` enforce code style and import patterns.
- **Type Checking**: `pnpm type-check` runs `tsc` across all workspaces to ensure type safety.
- **Formatting**: Prettier config in `packages/config-prettier` ensures consistent formatting.
- **Dependency Management**: `pnpm` enforces strict workspace dependencies.

---

_Last Updated: December 21, 2025_
