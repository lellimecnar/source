# CI/CD Implementation Research Report
**Date:** December 21, 2025  
**Project:** @lellimecnar/source (pnpm + Turborepo monorepo)  
**Purpose:** Comprehensive analysis for implementing GitHub Actions CI/CD pipeline

---

## Executive Summary

This monorepo requires a GitHub Actions CI/CD pipeline that validates code quality across 4 applications and 12 shared packages. The project uses modern tooling (pnpm 9.12.2, Turborepo 2.6.1, Node.js ^20) with existing test, lint, build, and type-check infrastructure already in place. The recommended approach is to create parallel CI jobs leveraging Turborepo's caching and pnpm's efficient dependency management.

**Key Findings:**
- ✅ All necessary scripts already exist (`test`, `lint`, `build`, `type-check`)
- ✅ Turborepo task definitions properly configured in `turbo.json`
- ✅ Testing infrastructure using Jest is established (2 packages have tests)
- ✅ TypeScript and ESLint configs are centralized and shared
- ⚠️ No existing GitHub Actions workflows (greenfield CI/CD setup)
- ⚠️ No Changesets or versioning automation configured
- ⚠️ Lighthouse CI not yet configured for performance monitoring

---

## 1. Project Analysis

### 1.1 Root Configuration

**File: `/package.json`**
```json
{
  "name": "@lellimecnar/source",
  "private": true,
  "packageManager": "pnpm@9.12.2",
  "engines": {
    "node": "^20",
    "pnpm": "^9"
  }
}
```

**Available Scripts (Root Level):**
- `pnpm build` → `turbo build`
- `pnpm dev` → `turbo dev`
- `pnpm lint` → `turbo lint`
- `pnpm test` → `turbo test`
- `pnpm test:watch` → `turbo test:watch`
- `pnpm type-check` → `turbo type-check`
- `pnpm clean` → `turbo clean; git clean -xdf node_modules .turbo .next .expo`
- `pnpm format` → `turbo lint -- --fix --fix-type=directive,problem,suggestion,layout`

**Workspace-Specific Shortcuts:**
- `pnpm miller.pub` → Runs commands in miller.pub workspace
- `pnpm readon.app` → Runs commands in readon.app workspace
- `pnpm readon` → Runs commands in readon mobile workspace
- `pnpm ui` → Runs commands in @lellimecnar/ui workspace

### 1.2 Workspace Structure

**File: `/pnpm-workspace.yaml`**
```yaml
packages:
  - "web/*"      # Next.js applications
  - "mobile/*"   # Expo applications
  - "packages/*" # Shared libraries and configs
  - "card-stack/*" # Domain logic packages
```

### 1.3 Turborepo Configuration

**File: `/turbo.json`**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "test": {
      "outputs": ["coverage/**"],
      "dependsOn": []
    },
    "test:watch": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "clean": {
      "cache": false
    },
    "ui": {
      "cache": false
    }
  }
}
```

**Key Observations:**
- `build` task requires upstream packages to build first (`^build`)
- `lint` task depends on packages being built first
- `test` task is independent and can run in parallel
- Proper cache configuration with outputs defined
- `.env*` files are considered as inputs for builds

---

## 2. Technology Stack

### 2.1 Core Dependencies

| Technology     | Version  | Purpose                                             |
| -------------- | -------- | --------------------------------------------------- |
| **Node.js**    | ^20      | Runtime (enforced)                                  |
| **pnpm**       | 9.12.2   | Package manager (enforced via packageManager field) |
| **Turborepo**  | 2.6.1    | Build system                                        |
| **TypeScript** | ~5.5     | Language                                            |
| **Jest**       | ^29      | Testing framework                                   |
| **ESLint**     | ^8       | Linting                                             |
| **Prettier**   | ^3.6.2   | Code formatting                                     |
| **Next.js**    | ^15.2.3  | Web framework                                       |
| **Expo**       | ~52.0.14 | Mobile framework                                    |
| **React**      | ^18.3.1  | UI library                                          |

### 2.2 Shared Configuration Packages

All packages inherit from centralized configs:

| Package                          | Purpose                     | Consumed By     |
| -------------------------------- | --------------------------- | --------------- |
| `@lellimecnar/typescript-config` | TypeScript compiler options | All TS packages |
| `@lellimecnar/eslint-config`     | ESLint rules                | All packages    |
| `@lellimecnar/prettier-config`   | Code formatting             | All packages    |
| `@lellimecnar/jest-config`       | Jest test configuration     | Test packages   |
| `@lellimecnar/tailwind-config`   | Design tokens & theme       | Web & mobile UI |
| `@lellimecnar/babel-preset`      | Babel transformation        | Expo app        |

---

## 3. Workspace Inventory

### 3.1 Applications (4 total)

#### Web Applications (2)

**1. miller.pub** (`web/miller.pub`)
- **Type:** Next.js 15 (App Router)
- **Scripts:**
  - `dev`: `next dev`
  - `build`: `next build`
  - `start`: `next start`
  - `lint`: `eslint .`
  - `type-check`: `tsc --noEmit`
- **Dependencies:** `@lellimecnar/ui`, `next`, `react`, `react-dom`
- **Build Output:** `.next/**` (automatically handled by Turborepo)
- **CI Requirements:** Build, lint, type-check (no tests currently)

**2. readon.app** (`web/readon.app`)
- **Type:** Next.js 15 (App Router)
- **Scripts:** Identical to miller.pub
- **Dependencies:** Same as miller.pub
- **CI Requirements:** Build, lint, type-check (no tests currently)

**Next.js Configuration Pattern:**
Both apps transpile the UI package:
```javascript
// web/*/next.config.js
module.exports = {
  reactStrictMode: true,
  transpilePackages: ['@lellimecnar/ui'],
};
```

#### Mobile Applications (1)

**3. readon** (`mobile/readon`)
- **Type:** Expo 52 + Expo Router
- **Scripts:**
  - `start`: `expo start`
  - `dev`: `expo start --android --clear`
  - `dev:ios`: `expo start --ios --clear`
  - `dev:web`: `expo start --web --clear`
  - `lint`: `eslint .`
  - `test`: `jest --watchAll`
  - `android`: `expo run:android`
  - `ios`: `expo run:ios`
- **Dependencies:** `@lellimecnar/ui-nativewind`, `expo`, `react-native`
- **Testing:** Jest with `jest-expo` preset
- **CI Requirements:** Lint only (build requires native tooling, test in watch mode)
- **Note:** Mobile builds typically require dedicated runners with Xcode/Android SDK

### 3.2 Shared Libraries (12 total)

#### UI Packages (2)

**4. @lellimecnar/ui** (`packages/ui`)
- **Type:** React component library (Web)
- **Exports:** Granular exports (components, utils, icons, theme)
- **Scripts:**
  - `build`: `tailwindcss -i ./src/global.css -o ./dist/global.css`
  - `dev`: Same as build with `--watch`
  - `lint`: `eslint .`
  - `type-check`: `tsc --noEmit`
  - `ui`: `pnpm -s dlx shadcn@latest` (component generator)
- **Build Output:** `dist/global.css`
- **CI Requirements:** Build, lint, type-check
- **Important:** Must be built before consuming apps build

**5. @lellimecnar/ui-nativewind** (`packages/ui-nativewind`)
- **Type:** React Native component library (Mobile)
- **Exports:** Components using NativeWind
- **Scripts:** Similar to web UI (build, dev, lint, type-check)
- **Dependencies:** Depends on `@lellimecnar/ui`
- **CI Requirements:** Build, lint, type-check

#### Domain Packages (2)

**6. @card-stack/core** (`card-stack/core`)
- **Type:** Card game engine (pure TypeScript)
- **Pattern:** Mixin composition via `ts-mixer`
- **Scripts:**
  - `lint`: `eslint .`
  - `test`: `jest`
  - `test:watch`: `jest --watch`
- **Tests:** ✅ 58 spec files (comprehensive coverage)
- **CI Requirements:** Lint, test
- **Note:** No build step (source consumed directly)

**7. @card-stack/standard-deck** (`card-stack/deck-standard`)
- **Type:** Standard 52-card deck implementation
- **Scripts:** lint, test, test:watch
- **Dependencies:** Depends on `@card-stack/core`
- **Tests:** ✅ 1 spec file
- **CI Requirements:** Lint, test

#### Utility Packages (1)

**8. @lellimecnar/utils** (`packages/utils`)
- **Type:** Shared utilities (date-fns, lodash)
- **Scripts:** `lint`: `eslint .`
- **CI Requirements:** Lint only
- **Note:** No build, no tests currently

#### Configuration Packages (7)

**9. @lellimecnar/eslint-config** (`packages/config-eslint`)
- **Exports:** `base.js`, `browser.js`, `next.js`, `node.js`
- **Scripts:** `lint`
- **CI Requirements:** Lint only

**10. @lellimecnar/typescript-config** (`packages/config-typescript`)
- **Exports:** `base.json`, `next.json`, `react.json`
- **Scripts:** `lint`
- **CI Requirements:** Lint only

**11. @lellimecnar/jest-config** (`packages/config-jest`)
- **Exports:** `jest-preset.js`, `browser/jest-preset.js`
- **Scripts:** `lint`
- **CI Requirements:** Lint only

**12. @lellimecnar/tailwind-config** (`packages/config-tailwind`)
- **Exports:** `tailwind.config.ts`
- **Scripts:** `lint`
- **CI Requirements:** Lint only

**13. @lellimecnar/prettier-config** (`packages/config-prettier`)
- **Exports:** `prettier-preset.js`
- **Scripts:** None
- **CI Requirements:** None (passive config)

**14. @lellimecnar/babel-preset** (`packages/config-babel`)
- **Exports:** `babel.config.js`
- **Scripts:** None
- **CI Requirements:** None (passive config)

**15. @lellimecnar/expo-with-modify-gradle** (`packages/expo-with-modify-gradle`)
- **Type:** Expo config plugin
- **Scripts:** `lint`
- **CI Requirements:** Lint only

---

## 4. Code Patterns

### 4.1 How Tests Are Run

**Root Level:**
```bash
pnpm test          # Runs Turborepo: turbo test
pnpm test:watch    # Runs Turborepo: turbo test:watch (persistent)
```

**Packages with Tests:**
1. `@card-stack/core` - 58 test files
2. `@card-stack/deck-standard` - 1 test file

**Test Configuration:**
```javascript
// card-stack/*/jest.config.js
module.exports = {
  preset: '@lellimecnar/jest-config',
};
```

**Jest Preset:**
```javascript
// packages/config-jest/jest-preset.js
module.exports = {
  roots: ['<rootDir>'],
  transform: { '^.+\\.tsx?$': 'ts-jest' },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  modulePathIgnorePatterns: ['<rootDir>/test/__fixtures__', '<rootDir>/node_modules', '<rootDir>/dist'],
  preset: 'ts-jest',
};
```

**CI Command:** `pnpm test` (runs all workspace tests via Turborepo)

### 4.2 How Linting Is Done

**Root Level:**
```bash
pnpm lint    # Runs Turborepo: turbo lint
pnpm format  # Runs Turborepo: turbo lint -- --fix
```

**All 16 packages have a `lint` script:**
```json
{
  "scripts": {
    "lint": "eslint ."
  }
}
```

**ESLint Config Inheritance:**
- Web apps: Extend `@lellimecnar/eslint-config/next`
- Mobile app: Extend `@lellimecnar/eslint-config/browser`
- Packages: Extend `@lellimecnar/eslint-config/base` or `@lellimecnar/eslint-config/node`

**CI Command:** `pnpm lint`

### 4.3 How Builds Are Executed

**Root Level:**
```bash
pnpm build   # Runs Turborepo: turbo build
```

**Packages with Build Steps:**
1. `miller.pub` - `next build`
2. `readon.app` - `next build`
3. `@lellimecnar/ui` - `tailwindcss -i ./src/global.css -o ./dist/global.css`
4. `@lellimecnar/ui-nativewind` - Same as ui

**Build Dependencies (from turbo.json):**
- `lint` task depends on `^build` (upstream packages must build first)
- `build` outputs are cached in `.turbo/` directory

**CI Command:** `pnpm build`

### 4.4 How Type-Checking Is Done

**Root Level:**
```bash
pnpm type-check   # Runs Turborepo: turbo type-check
```

**Packages with type-check:**
1. `miller.pub` - `tsc --noEmit`
2. `readon.app` - `tsc --noEmit`
3. `@lellimecnar/ui` - `tsc --noEmit`
4. `@lellimecnar/ui-nativewind` - `tsc --noEmit`

**TypeScript Config Inheritance:**
```json
// Example: web/miller.pub/tsconfig.json
{
  "extends": "@lellimecnar/typescript-config/next.json"
}
```

**CI Command:** `pnpm type-check`

### 4.5 Existing GitHub Workflows

**Status:** ❌ None exist

No `.github/workflows/` directory found. This is a greenfield CI/CD setup.

### 4.6 Current Dependency Structure

**Dependency Graph (Simplified):**
```
┌─ web/miller.pub
│  └─ @lellimecnar/ui
│     └─ @lellimecnar/tailwind-config
│        └─ @lellimecnar/typescript-config
│
┌─ web/readon.app
│  └─ @lellimecnar/ui
│
┌─ mobile/readon
│  └─ @lellimecnar/ui-nativewind
│     └─ @lellimecnar/ui
│     └─ @lellimecnar/tailwind-config
│
┌─ @card-stack/standard-deck
│  └─ @card-stack/core
│     └─ @lellimecnar/utils
```

**All packages use:** `workspace:*` protocol for internal dependencies

---

## 5. File Paths & Structure

### 5.1 Complete Workspace List

```
/Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/
├── web/
│   ├── miller.pub/           # Next.js app (portfolio)
│   └── readon.app/           # Next.js app (reading app)
├── mobile/
│   └── readon/               # Expo app (reading app mobile)
├── packages/
│   ├── ui/                   # Web component library
│   ├── ui-nativewind/        # Mobile component library
│   ├── utils/                # Shared utilities
│   ├── config-eslint/        # ESLint configs
│   ├── config-typescript/    # TypeScript configs
│   ├── config-jest/          # Jest configs
│   ├── config-tailwind/      # Tailwind configs
│   ├── config-prettier/      # Prettier config
│   ├── config-babel/         # Babel preset
│   └── expo-with-modify-gradle/  # Expo plugin
└── card-stack/
    ├── core/                 # Card game engine (58 tests)
    └── deck-standard/        # Standard deck (1 test)
```

### 5.2 Packages with Tests

1. **@card-stack/core** (`card-stack/core/src/**/*.spec.ts`)
   - 58 test files covering:
     - Player system (player.spec.ts, scoreable.spec.ts, handable.spec.ts)
     - Card deck (card-deck.spec.ts)
     - Card sets (card-set.spec.ts, groupable.spec.ts, etc.)
     - Shared mixins (indexable.spec.ts, deckable.spec.ts, etc.)
     - Utilities (utils.spec.ts)

2. **@card-stack/standard-deck** (`card-stack/deck-standard/src/standard-deck.spec.ts`)
   - 1 test file for standard 52-card deck implementation

**Total Test Files:** 59

### 5.3 Packages Needing Building

1. **miller.pub** - Outputs: `.next/**` (Next.js production build)
2. **readon.app** - Outputs: `.next/**` (Next.js production build)
3. **@lellimecnar/ui** - Outputs: `dist/global.css` (compiled Tailwind CSS)
4. **@lellimecnar/ui-nativewind** - Outputs: `dist/global.css` (compiled Tailwind CSS)

**Total Build Targets:** 4

**Note:** All other packages are consumed as TypeScript source (`"exports": "./src/index.ts"`)

### 5.4 Exact Paths for Web Apps

- **miller.pub:** `/Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/web/miller.pub`
- **readon.app:** `/Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/web/readon.app`

---

## 6. Official Documentation Research

### 6.1 GitHub Actions for pnpm Monorepos

**Source:** [pnpm.io - Continuous Integration](https://pnpm.io/continuous-integration)

**Recommended Setup:**
```yaml
name: CI
on: push
jobs:
  build:
    runs-on: ubuntu-22.04
    strategy:
      matrix:
        node-version: [20]
    steps:
      - uses: actions/checkout@v4
      
      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9  # Use pnpm 9.x
      
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'pnpm'  # Enable pnpm caching
      
      - name: Install dependencies
        run: pnpm install
```

**Key Points:**
- Use `pnpm/action-setup@v4` to install pnpm
- Enable caching with `cache: 'pnpm'` in `actions/setup-node`
- Specify pnpm version (9 for this project)
- Cache key is based on `pnpm-lock.yaml`

### 6.2 Turborepo CI/CD Patterns

**Source:** [Turborepo - GitHub Actions Guide](https://turbo.build/repo/docs/guides/ci-vendors/github-actions)

**Recommended Workflow:**
```yaml
name: CI
on:
  push:
    branches: ["main"]
  pull_request:
    types: [opened, synchronize]

jobs:
  build:
    name: Build and Test
    timeout-minutes: 15
    runs-on: ubuntu-latest
    # env:  # Uncomment for Vercel Remote Caching
    #   TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
    #   TURBO_TEAM: ${{ vars.TURBO_TEAM }}

    steps:
      - name: Check out code
        uses: actions/checkout@v4
        with:
          fetch-depth: 2  # For diff detection

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - name: Setup Node.js environment
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build
        run: pnpm build

      - name: Test
        run: pnpm test
```

**Cache Turborepo Artifacts:**
```yaml
- name: Cache turbo build setup
  uses: actions/cache@v4
  with:
    path: .turbo
    key: ${{ runner.os }}-turbo-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-turbo-
```

**Key Points:**
- Use `fetch-depth: 2` for change detection
- Turborepo automatically detects CI environment
- Remote caching via Vercel (optional)
- Local caching via `.turbo/` directory
- Use `--affected` flag to run only changed packages

**Affected Tasks:**
```bash
pnpm turbo run build test --affected
```

### 6.3 Lighthouse CI for Next.js

**Source:** [treosh/lighthouse-ci-action](https://github.com/treosh/lighthouse-ci-action)

**Basic Setup:**
```yaml
name: Lighthouse CI
on: pull_request
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      
      - name: Audit URLs using Lighthouse
        uses: treosh/lighthouse-ci-action@v12
        with:
          urls: |
            http://localhost:3000/
            http://localhost:3000/blog
          configPath: ./lighthouserc.json
          uploadArtifacts: true
          temporaryPublicStorage: true
```

**lighthouserc.json Example:**
```json
{
  "ci": {
    "collect": {
      "numberOfRuns": 1,
      "settings": {
        "chromeFlags": "--disable-gpu --no-sandbox"
      }
    },
    "assert": {
      "assertions": {
        "first-contentful-paint": ["error", { "minScore": 0.6 }],
        "interactive": ["error", { "minScore": 0.6 }],
        "speed-index": ["error", { "minScore": 0.6 }]
      }
    }
  }
}
```

**Key Points:**
- Run Lighthouse against local or deployed URLs
- Use `configPath` for custom assertions
- Upload artifacts for detailed reports
- Integrate with PR comments for visibility

### 6.4 Changesets for Monorepo Versioning

**Source:** [Changesets GitHub](https://github.com/changesets/changesets)

**Installation:**
```bash
pnpm add -Dw @changesets/cli
pnpm changeset init
```

**GitHub Action:**
```yaml
name: Release
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      
      - run: pnpm install
      
      - name: Create Release Pull Request
        uses: changesets/action@v1
        with:
          publish: pnpm changeset publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Key Points:**
- Automates versioning and changelog generation
- Creates release PRs automatically
- Supports monorepo package versioning
- Integrates with npm publishing (if public)

---

## 7. Recommended Implementation Strategy

### 7.1 Caching Strategies

**1. pnpm Cache (via actions/setup-node)**
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'pnpm'
```
- Caches `~/.pnpm-store/` directory
- Key based on `pnpm-lock.yaml` hash
- Restores dependencies in ~30 seconds vs 2-3 minutes

**2. Turborepo Local Cache**
```yaml
- uses: actions/cache@v4
  with:
    path: .turbo
    key: ${{ runner.os }}-turbo-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-turbo-
```
- Caches build artifacts in `.turbo/` directory
- Enables incremental builds
- Shares cache across workflows

**3. Next.js Cache (Optional)**
```yaml
- uses: actions/cache@v4
  with:
    path: |
      web/miller.pub/.next/cache
      web/readon.app/.next/cache
    key: ${{ runner.os }}-nextjs-${{ hashFiles('**/pnpm-lock.yaml') }}-${{ hashFiles('web/**/*.js', 'web/**/*.jsx', 'web/**/*.ts', 'web/**/*.tsx') }}
    restore-keys: |
      ${{ runner.os }}-nextjs-${{ hashFiles('**/pnpm-lock.yaml') }}-
```
- Caches Next.js build cache
- Speeds up subsequent builds
- Note: Turborepo already handles this via `.turbo/`

**4. Vercel Remote Caching (Optional)**
```yaml
env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```
- Share cache across team/machines
- Faster than GitHub Actions cache
- Requires Vercel account (free tier available)

**Recommended:** Use pnpm cache + Turborepo local cache. Remote caching is optional.

### 7.2 Parallelization Strategy

**Option 1: Single Job with Sequential Steps**
```yaml
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - setup
      - pnpm install
      - pnpm type-check  # Fast (~30s)
      - pnpm lint        # Medium (~1min)
      - pnpm test        # Medium (~1min)
      - pnpm build       # Slow (~3min)
```
**Pros:** Simple, minimal setup overhead  
**Cons:** Slower total time (sequential execution)  
**Total Time:** ~6 minutes

**Option 2: Parallel Jobs (Recommended)**
```yaml
jobs:
  install:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - setup
      - pnpm install
      - cache node_modules

  type-check:
    needs: install
    runs-on: ubuntu-latest
    steps:
      - restore cache
      - pnpm type-check

  lint:
    needs: install
    runs-on: ubuntu-latest
    steps:
      - restore cache
      - pnpm lint

  test:
    needs: install
    runs-on: ubuntu-latest
    steps:
      - restore cache
      - pnpm test

  build:
    needs: install
    runs-on: ubuntu-latest
    steps:
      - restore cache
      - pnpm build
```
**Pros:** Faster (parallel execution), clear failure isolation  
**Cons:** More complex setup, more GitHub Actions minutes  
**Total Time:** ~3 minutes (longest job)

**Option 3: Hybrid (Best Balance)**
```yaml
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - setup
      - pnpm type-check
      - pnpm lint

  test:
    runs-on: ubuntu-latest
    steps:
      - setup
      - pnpm test
      - upload coverage

  build:
    runs-on: ubuntu-latest
    steps:
      - setup
      - pnpm build
```
**Pros:** Good balance, reasonable complexity  
**Cons:** Slight duplication of setup  
**Total Time:** ~3 minutes

**Recommendation:** Use Option 3 (Hybrid) for this project.

### 7.3 Exact Script Names for CI

Based on root `package.json`:

```yaml
# CI Workflow Commands (use these exactly)
- run: pnpm type-check    # Runs turbo type-check
- run: pnpm lint          # Runs turbo lint
- run: pnpm test          # Runs turbo test
- run: pnpm build         # Runs turbo build

# Optional Commands
- run: pnpm format        # Runs turbo lint --fix
- run: pnpm clean         # Deep clean (not for CI)
```

**Important:** Always use `pnpm` commands, NOT `npm` or `yarn`.

### 7.4 Version Requirements

```yaml
# Exact versions to use in CI
- node-version: 20         # Major version only (tracks latest 20.x)
- pnpm-version: 9          # Major version only (tracks latest 9.x)

# Or use exact versions
- node-version: 20.11.0
- pnpm-version: 9.12.2
```

**Recommendation:** Use major versions to automatically get patch updates.

### 7.5 Existing Patterns to Follow

**1. Workspace Protocol:**
```json
{
  "dependencies": {
    "@lellimecnar/ui": "workspace:*"
  }
}
```
Always use `workspace:*` for internal dependencies.

**2. Script Naming:**
- `dev` - Development server
- `build` - Production build
- `start` - Production server
- `lint` - ESLint check
- `test` - Jest tests
- `type-check` - TypeScript compilation check

**3. TypeScript Source Consumption:**
Most packages export TypeScript source directly:
```json
{
  "exports": {
    ".": "./src/index.ts"
  }
}
```
This means consumers must handle TypeScript compilation (Next.js does this via `transpilePackages`).

**4. Granular Exports:**
The `@lellimecnar/ui` package uses granular exports:
```typescript
// Import specific components
import { Button } from '@lellimecnar/ui/button';
import { cn } from '@lellimecnar/ui/lib/utils';
import '@lellimecnar/ui/global.css';
```
Never import from package root.

---

## 8. CI/CD Pipeline Architecture

### 8.1 Recommended Workflow Structure

```
.github/
└── workflows/
    ├── ci.yml              # Main CI: quality + test + build
    ├── lighthouse.yml      # Performance audits (PRs only)
    ├── release.yml         # Changesets release (main only)
    └── security.yml        # Security audits (scheduled)
```

### 8.2 CI Workflow (ci.yml)

**Triggers:**
- Push to `main`, `master`, `develop`
- Pull requests (opened, synchronize, reopened)

**Jobs:**
1. **quality** (parallel)
   - Type-check
   - Lint
2. **test** (parallel)
   - Run Jest tests
   - Upload coverage
3. **build** (parallel)
   - Build all packages and apps
   - Cache artifacts

**Estimated Time:** 3-4 minutes

### 8.3 Lighthouse Workflow (lighthouse.yml)

**Triggers:**
- Pull requests only

**Jobs:**
1. **audit-miller-pub**
   - Build and serve miller.pub
   - Run Lighthouse CI
   - Comment on PR
2. **audit-readon-app**
   - Build and serve readon.app
   - Run Lighthouse CI
   - Comment on PR

**Estimated Time:** 2-3 minutes per app

### 8.4 Release Workflow (release.yml)

**Triggers:**
- Push to `main` branch only

**Jobs:**
1. **release**
   - Check for changesets
   - Create release PR or publish
   - Generate changelog

**Estimated Time:** 1-2 minutes

### 8.5 Security Workflow (security.yml)

**Triggers:**
- Scheduled (weekly)
- Manual trigger

**Jobs:**
1. **audit**
   - Run `pnpm audit`
   - Check for vulnerabilities
   - Create issue if found

**Estimated Time:** 30 seconds

---

## 9. Recommendations

### 9.1 Immediate Actions

1. ✅ **Create `.github/workflows/ci.yml`**
   - Use hybrid parallel approach (quality + test + build)
   - Enable pnpm cache
   - Enable Turborepo cache
   - Specify Node.js 20 and pnpm 9

2. ✅ **Configure Branch Protection**
   - Require `ci/quality` to pass
   - Require `ci/test` to pass
   - Require `ci/build` to pass
   - Require branches to be up to date

3. ✅ **Add Lighthouse CI for Next.js apps**
   - Create `lighthouserc.json` in root
   - Configure reasonable thresholds
   - Set as informational (not blocking)

4. ⚠️ **Consider Changesets** (if versioning needed)
   - Install `@changesets/cli`
   - Initialize with `pnpm changeset init`
   - Create release workflow

### 9.2 Optional Enhancements

1. **Codecov Integration**
   ```yaml
   - uses: codecov/codecov-action@v3
     with:
       files: ./coverage/lcov.info
   ```

2. **Renovate Bot** (better than Dependabot for monorepos)
   ```json
   {
     "extends": ["config:base", ":preserveSemverRanges"],
     "packageRules": [
       {
         "groupName": "React",
         "matchPackagePatterns": ["^react", "^@types/react"]
       }
     ]
   }
   ```

3. **Preview Deployments**
   - Vercel for Next.js apps (automatic)
   - Expo Preview for mobile (manual trigger)

4. **E2E Testing**
   - Playwright for web apps
   - Detox for mobile app

### 9.3 Performance Optimization

1. **Use `--affected` flag:**
   ```bash
   pnpm turbo run build test --affected
   ```
   Only runs tasks for changed packages.

2. **Conditional jobs:**
   ```yaml
   if: contains(github.event.head_commit.message, '[skip ci]') == false
   ```

3. **Matrix strategy for Node versions (if needed):**
   ```yaml
   strategy:
     matrix:
       node-version: [18, 20]
   ```

### 9.4 Security Considerations

1. **Secrets:**
   - `GITHUB_TOKEN` - Auto-provided
   - `TURBO_TOKEN` - For remote caching (optional)
   - `CONTEXT7_API_KEY` - If used in CI (currently not needed)

2. **Permissions:**
   ```yaml
   permissions:
     contents: read
     pull-requests: write  # For PR comments
   ```

3. **Audit schedule:**
   ```yaml
   schedule:
     - cron: '0 0 * * 1'  # Weekly on Monday
   ```

---

## 10. Constraints & Limitations

### 10.1 Known Constraints

1. **Mobile Builds:**
   - `mobile/readon` cannot be built in standard CI (requires Xcode/Android SDK)
   - Solution: Only run lint/type-check, skip build
   - Alternative: Use Expo EAS Build (paid service)

2. **UI Package Build Dependency:**
   - `@lellimecnar/ui` must build before consuming apps
   - Solution: Turborepo handles this via `dependsOn: ["^build"]`

3. **Test Coverage:**
   - Only 2 packages have tests (card-stack packages)
   - Solution: CI will only run tests where they exist
   - Future: Add tests for other packages

4. **No TypeScript Build Step:**
   - Most packages export raw TypeScript (`./src/index.ts`)
   - Solution: Consuming apps handle compilation
   - CI type-check validates but doesn't emit

### 10.2 CI Minutes Estimate

**Per CI Run:**
- Setup (checkout, install pnpm, install deps): ~2 min
- Type-check: ~30 sec
- Lint: ~1 min
- Test: ~1 min
- Build: ~3 min

**Total (parallel):** ~4 min per workflow run

**Monthly Estimate (assuming 100 PRs):**
- 100 PRs × 4 min = 400 min
- Plus main branch pushes: ~50 min
- **Total:** ~450 min/month (~7.5 hours)

**GitHub Free Tier:** 2,000 minutes/month (more than sufficient)

---

## 11. Next Steps

### Phase 1: Basic CI (1-2 hours)
1. Create `.github/workflows/ci.yml`
2. Test on feature branch
3. Merge to main
4. Configure branch protection

### Phase 2: Lighthouse CI (30 min)
1. Create `lighthouserc.json`
2. Create `.github/workflows/lighthouse.yml`
3. Test on PR with web app changes

### Phase 3: Security & Releases (1 hour)
1. Create `.github/workflows/security.yml`
2. Install Changesets (if needed)
3. Create `.github/workflows/release.yml`

### Phase 4: Refinement (ongoing)
1. Monitor CI performance
2. Adjust caching strategies
3. Add E2E tests (future)
4. Optimize workflow times

---

## 12. Reference Links

- [pnpm CI Documentation](https://pnpm.io/continuous-integration)
- [Turborepo GitHub Actions Guide](https://turbo.build/repo/docs/guides/ci-vendors/github-actions)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Lighthouse CI Action](https://github.com/treosh/lighthouse-ci-action)
- [Changesets Documentation](https://github.com/changesets/changesets)
- [pnpm/action-setup](https://github.com/pnpm/action-setup)
- [actions/setup-node](https://github.com/actions/setup-node)
- [actions/cache](https://github.com/actions/cache)

---

## Appendix A: Complete Package Manifest

| Package                              | Path                             | Type         | Scripts                             | Tests  | Build | Priority |
| ------------------------------------ | -------------------------------- | ------------ | ----------------------------------- | ------ | ----- | -------- |
| miller.pub                           | web/miller.pub                   | Next.js      | dev, build, start, lint, type-check | ❌      | ✅     | High     |
| readon.app                           | web/readon.app                   | Next.js      | dev, build, start, lint, type-check | ❌      | ✅     | High     |
| readon                               | mobile/readon                    | Expo         | dev, lint, test                     | ⚠️      | ❌     | Medium   |
| @lellimecnar/ui                      | packages/ui                      | React        | build, dev, lint, type-check, ui    | ❌      | ✅     | High     |
| @lellimecnar/ui-nativewind           | packages/ui-nativewind           | React Native | build, dev, lint, type-check        | ❌      | ✅     | Medium   |
| @card-stack/core                     | card-stack/core                  | TypeScript   | lint, test, test:watch              | ✅ (58) | ❌     | High     |
| @card-stack/standard-deck            | card-stack/deck-standard         | TypeScript   | lint, test, test:watch              | ✅ (1)  | ❌     | Medium   |
| @lellimecnar/utils                   | packages/utils                   | TypeScript   | lint                                | ❌      | ❌     | Low      |
| @lellimecnar/eslint-config           | packages/config-eslint           | Config       | lint                                | ❌      | ❌     | Low      |
| @lellimecnar/typescript-config       | packages/config-typescript       | Config       | lint                                | ❌      | ❌     | Low      |
| @lellimecnar/jest-config             | packages/config-jest             | Config       | lint                                | ❌      | ❌     | Low      |
| @lellimecnar/tailwind-config         | packages/config-tailwind         | Config       | lint                                | ❌      | ❌     | Low      |
| @lellimecnar/prettier-config         | packages/config-prettier         | Config       | -                                   | ❌      | ❌     | Low      |
| @lellimecnar/babel-preset            | packages/config-babel            | Config       | -                                   | ❌      | ❌     | Low      |
| @lellimecnar/expo-with-modify-gradle | packages/expo-with-modify-gradle | Plugin       | lint                                | ❌      | ❌     | Low      |

**Legend:**
- ✅ Yes
- ❌ No
- ⚠️ Watch mode only

---

## Appendix B: Sample CI Workflow

```yaml
name: CI

on:
  push:
    branches: [main, master, develop]
  pull_request:
    types: [opened, synchronize, reopened]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:
    name: Quality Checks
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Cache Turborepo
        uses: actions/cache@v4
        with:
          path: .turbo
          key: ${{ runner.os }}-turbo-${{ github.sha }}
          restore-keys: |
            ${{ runner.os }}-turbo-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm type-check

      - name: Lint
        run: pnpm lint

  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test

      # Optional: Upload coverage
      # - name: Upload coverage
      #   uses: codecov/codecov-action@v3
      #   with:
      #     files: ./coverage/lcov.info

  build:
    name: Build
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Cache Turborepo
        uses: actions/cache@v4
        with:
          path: .turbo
          key: ${{ runner.os }}-turbo-${{ github.sha }}
          restore-keys: |
            ${{ runner.os }}-turbo-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      # Optional: Upload build artifacts
      # - name: Upload artifacts
      #   uses: actions/upload-artifact@v3
      #   with:
      #     name: build-artifacts
      #     path: |
      #       web/miller.pub/.next
      #       web/readon.app/.next
```

---

**End of Research Report**
