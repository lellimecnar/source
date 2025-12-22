# Documentation Improvements - Comprehensive Research Report

**Date**: December 21, 2025  
**Repository**: @lellimecnar/source  
**Purpose**: Gather comprehensive context for generating documentation improvements

---

## Executive Summary

This research covers the @lellimecnar/source monorepo, a **pnpm + Turborepo** TypeScript monorepo containing:
- 2 Next.js web apps (miller.pub, readon.app)
- 1 Expo mobile app (readon)
- 10 shared packages (UI libraries, configs, utils)
- 2 card-stack domain packages (core game engine)

**Key Findings:**
- ✅ Excellent architecture documentation exists (AGENTS.md, blueprints)
- ❌ Missing: CONTRIBUTING.md, SECURITY.md, CHANGELOG.md, CODE_OF_CONDUCT.md
- ✅ Strong technical patterns established (mixins, granular exports, workspace protocol)
- ⚠️ Commit messages are inconsistent (not following Conventional Commits)
- ✅ Well-organized monorepo structure with clear boundaries

---

## 1. Project-Wide Analysis

### 1.1 Project Type Verification
**Confirmed**: pnpm + Turborepo monorepo

**Evidence:**
- `pnpm-workspace.yaml` defines 4 workspace patterns
- `turbo.json` orchestrates build tasks with dependency management
- `package.json` enforces `pnpm@9.12.2` via `packageManager` field

### 1.2 Technology Stack Versions

From root `package.json` and workspace analysis:

| Technology   | Version  | Source                       |
| ------------ | -------- | ---------------------------- |
| Node.js      | ^20      | package.json engines         |
| pnpm         | 9.12.2   | packageManager field         |
| TypeScript   | ~5.5     | devDependencies              |
| Turborepo    | ^2.6.1   | devDependencies              |
| Next.js      | ^15.2.3  | devDependencies + overrides  |
| React        | ^18.3.1  | overrides                    |
| Expo         | ~52.0.14 | mobile/readon/package.json   |
| React Native | 0.76.3   | mobile/readon/package.json   |
| Expo Router  | ~4.0.11  | mobile/readon/package.json   |
| Jest         | ^29      | devDependencies              |
| ESLint       | ^8.57.1  | devDependencies              |
| Prettier     | ^3.6.2   | devDependencies              |
| Tailwind CSS | ^3.4.17  | packages/ui/package.json     |
| NativeWind   | ^4.2.1   | mobile/readon/package.json   |
| ts-mixer     | ^6.0.4   | card-stack/core/package.json |

### 1.3 Folder Structure & Organization

**Workspace Pattern** (from `pnpm-workspace.yaml`):
```yaml
packages:
  - "web/*"
  - "mobile/*"
  - "packages/*"
  - "card-stack/*"
```

**Applications:**
- `web/miller.pub/` - Personal portfolio site (Next.js)
- `web/readon.app/` - Reading app web interface (Next.js)
- `mobile/readon/` - Reading app mobile (Expo + Expo Router)

**Packages (10 total):**
- `packages/ui/` - Web UI components (shadcn/ui style)
- `packages/ui-nativewind/` - Mobile UI components
- `packages/utils/` - Shared utilities (date-fns, lodash)
- `packages/config-babel/` - Babel configuration
- `packages/config-eslint/` - ESLint configurations (base, browser, next, node)
- `packages/config-jest/` - Jest test configurations
- `packages/config-prettier/` - Prettier formatting config
- `packages/config-tailwind/` - Tailwind CSS base config
- `packages/config-typescript/` - TypeScript configs (base, next, react)
- `packages/expo-with-modify-gradle/` - Expo gradle modification plugin

**Domain Logic:**
- `card-stack/core/` - Card game engine with mixin composition
- `card-stack/deck-standard/` - Standard 52-card deck implementation

### 1.4 Naming Conventions

**Files:**
- Components: `PascalCase.tsx` (Button.tsx, CardDeck.tsx)
- Utilities: `camelCase.ts` (utils.ts, useTheme.ts)
- Tests: `*.spec.ts` (player.spec.ts, card-deck.spec.ts)
- Next.js/Expo Special: `page.tsx`, `layout.tsx`, `_layout.tsx`, `route.ts`

**Directories:**
- General: `kebab-case` (card-stack, ui-nativewind, config-eslint)
- Route Groups: `(group-name)` (mobile/readon/app/(tabs)/)
- Private Folders: `_folder` prefix

**Packages:**
- Scoped: `@lellimecnar/*` for shared packages
- Domain: `@card-stack/*` for game engine
- Protocol: `workspace:*` for all internal dependencies

**Variables/Functions:**
- Variables: `camelCase`
- Functions: `camelCase`
- Types/Interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`

### 1.5 Build/Test/Run Commands

**Root Level Commands** (from root `package.json`):
```json
{
  "miller.pub": "pnpm --filter miller.pub",
  "readon": "pnpm --filter readon",
  "readon.app": "pnpm --filter readon.app",
  "build": "turbo build",
  "dev": "turbo dev",
  "lint": "turbo lint",
  "test": "turbo test",
  "test:watch": "turbo test:watch",
  "type-check": "turbo type-check",
  "clean": "turbo clean; git clean -xdf node_modules .turbo .next .expo",
  "format": "turbo lint -- --fix --fix-type=directive,problem,suggestion,layout",
  "ui": "pnpm --filter @lellimecnar/ui"
}
```

**Workspace-Specific Examples:**

*Web (Next.js):*
```bash
pnpm miller.pub dev
pnpm miller.pub build
pnpm miller.pub start
pnpm miller.pub lint
pnpm miller.pub type-check
```

*Mobile (Expo):*
```bash
pnpm readon dev              # Android
pnpm readon dev:ios          # iOS
pnpm readon dev:web          # Web
pnpm readon start
pnpm readon lint
pnpm readon android          # Run on Android device
pnpm readon ios              # Run on iOS device
```

*UI Package:*
```bash
pnpm ui dev                  # Watch mode for Tailwind
pnpm ui build                # Build Tailwind CSS
pnpm ui ui                   # Add shadcn/ui component
```

*Card Stack:*
```bash
pnpm --filter @card-stack/core test
pnpm --filter @card-stack/core test:watch
```

### 1.6 Workspace Configuration

**From `turbo.json`:**
```json
{
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
    }
  }
}
```

**Key Insights:**
- `^build` means "build upstream dependencies first"
- `lint` depends on `^build` (requires built packages)
- `dev` and `test:watch` are persistent tasks (never cached)

---

## 2. Existing Documentation Analysis

### 2.1 Current Documentation Files

**✅ Existing:**
1. **AGENTS.md** (200 lines) - Primary developer/AI instructions
   - Project overview
   - Monorepo structure
   - Tech stack summary
   - Development commands
   - Architecture patterns
   - Testing strategy
   - Pull request guidelines
   - Troubleshooting

2. **Project_Architecture_Blueprint.md** (300+ lines)
   - Architecture detection
   - High-level component interaction (Mermaid diagrams)
   - Architectural layers
   - Data architecture
   - Cross-cutting concerns
   - Technology-specific patterns
   - Mixin implementation examples

3. **Project_Folders_Structure_Blueprint.md** (300+ lines)
   - Structural overview
   - Directory visualization
   - Key directory analysis
   - File placement patterns
   - Naming conventions
   - Navigation and workflow

4. **Technology_Stack_Blueprint.md** (300+ lines)
   - Technology identification
   - Core stack analysis
   - Implementation patterns
   - Usage examples
   - Technology relationship diagrams
   - Decision context

5. **Project_Workflow_Documentation.md** (200+ lines)
   - Frontend page rendering workflow
   - Domain logic execution workflow
   - UI component usage workflow
   - Implementation guidelines

6. **README.md** (117 lines) - General project overview
   - Technology stack
   - Project architecture
   - Getting started
   - Project structure
   - Key features
   - Development workflow

7. **llms.txt** - Machine-readable documentation index

**❌ Missing (Critical):**
1. **CONTRIBUTING.md** - No contributor guidelines
2. **SECURITY.md** - No security policy
3. **CHANGELOG.md** - No version history tracking
4. **CODE_OF_CONDUCT.md** - No community guidelines

**❌ Missing (Optional but Recommended):**
- **LICENSE** - No explicit license file (packages have "MIT" in package.json)
- **PULL_REQUEST_TEMPLATE.md** - No PR template
- **ISSUE_TEMPLATES/** - No issue templates
- **.github/FUNDING.yml** - No funding/sponsorship info
- **docs/** directory - No additional documentation structure
- **ADR/** (Architecture Decision Records) - No formal decision tracking

### 2.2 Package-Level Documentation

**Pattern Found:** Most packages have minimal READMEs

*Examples:*
- `web/miller.pub/README.md`: Only contains "## miller.pub"
- Other packages: Similar minimal or missing READMEs

**Needed:**
- Individual package READMEs explaining purpose, API, usage
- Installation instructions for each package
- Examples and API documentation

### 2.3 Documentation Structure Patterns

**Current Pattern:**
- Root-level blueprints provide comprehensive technical documentation
- AGENTS.md serves as primary entry point
- Package-level documentation is minimal/absent

**Strengths:**
- Excellent high-level architecture documentation
- Clear separation of concerns (Architecture, Folders, Tech Stack, Workflows)
- Machine-readable llms.txt for AI tooling

**Gaps:**
- No contribution workflow documentation
- No security reporting process
- No changelog/release notes
- No community guidelines
- Minimal package-specific documentation

---

## 3. Code Patterns Library

### 3.1 UI Component Patterns (packages/ui)

**Structure:**
- **Export Strategy**: Granular exports for tree-shaking
  ```json
  "exports": {
    "./button": "./src/components/button.tsx",
    "./checkbox": "./src/components/checkbox.tsx",
    "./lib/utils": "./src/lib/utils.ts"
  }
  ```

**Component Pattern (shadcn/ui style):**
```typescript
// Example: Button component
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '../lib/utils';

const buttonVariants = cva(
  'base-styles...',
  {
    variants: {
      variant: { default: '...', destructive: '...' },
      size: { default: '...', sm: '...', lg: '...' }
    },
    defaultVariants: { variant: 'default', size: 'default' }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

**Key Patterns:**
- ✅ Radix UI primitives for accessibility
- ✅ `class-variance-authority` (cva) for variant management
- ✅ `cn()` utility (clsx + tailwind-merge) for class merging
- ✅ Forward refs for composition
- ✅ Polymorphic components with `asChild` prop
- ✅ TypeScript strict typing with VariantProps

**Current Components:**
- button.tsx
- checkbox.tsx
- form.tsx
- input.tsx
- label.tsx
- navigation-menu.tsx
- page.tsx
- radio-group.tsx
- select.tsx
- switch.tsx
- textarea.tsx
- toggle.tsx

### 3.2 Mixin Pattern (card-stack/core)

**Pattern:** TypeScript Mixins using `ts-mixer`

```typescript
// Example: CardDeck using mixins
import { mix } from '../utils';
import { CardSet } from '../card-set';
import { Indexable } from '../shared/indexable';

export interface CardDeck<C extends Card> extends CardSet<C>, Indexable {}

@mix(CardSet, Indexable)
export class CardDeck<C extends Card> {
  static HexByte = HexByte.DeckIndex;
  
  init(..._args: unknown[]): void {
    // Initialization logic
  }
}
```

**Key Characteristics:**
- ✅ Composition over inheritance
- ✅ Interface merging for TypeScript support
- ✅ Decorator-based mixin application
- ✅ Multiple behavior composition (Flippable, Rankable, Suitable)

### 3.3 Configuration Patterns

**ESLint Config (`packages/config-eslint/base.js`):**
```javascript
module.exports = {
  extends: [
    '@vercel/style-guide/eslint/_base',
    '@vercel/style-guide/eslint/typescript',
    'plugin:tailwindcss/recommended',
    'turbo',
  ],
  plugins: ['prettier'],
  rules: {
    'no-console': ['error', { allow: ['warn', 'error'] }],
    '@typescript-eslint/no-unsafe-declaration-merging': 'warn',
    // ... more rules
  }
}
```

**Exports Pattern:**
```json
"exports": {
  ".": "./base.js",
  "./browser": "./browser.js",
  "./next": "./next.js",
  "./node": "./node.js"
}
```

**TypeScript Config (`packages/config-typescript/base.json`):**
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": ["@vercel/style-guide/typescript/node20"],
  "compilerOptions": {
    "strict": true,
    "target": "ESNext",
    "lib": ["ESNext", "DOM", "Decorators"],
    "checkJs": true,
    "allowJs": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "noEmit": true
  }
}
```

**Tailwind Config (`packages/config-tailwind/tailwind.config.ts`):**
```typescript
import twTypography from '@tailwindcss/typography';
import { type Config } from 'tailwindcss';
import twAnimate from 'tailwindcss-animate';
import twOpenType from 'tailwindcss-opentype';

const config: Omit<Config, 'content'> = {
  darkMode: ['class'],
  theme: {
    extend: {
      container: { center: true, padding: '2rem' },
      colors: {
        border: 'hsl(var(--border))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // ... CSS variable-based theme
      }
    }
  },
  plugins: [twTypography, twAnimate, twOpenType]
};
```

### 3.4 Commit Message Analysis

**Recent Commits (from git log):**
```
6c68f01 plan out improvements
63557e7 add/update agent files
0c501e2 add repo-sepecific cursor rules
11e2a13 upgrade dependencies
4f7844e add individual AGENTS.md files for each package, and at the root
74dc16e Update Foster Source
e38918f responsive styles
8fe5724 add options form
feaa15e fix lint
7a669cb fix lint/types
```

**Pattern Analysis:**
- ❌ No Conventional Commits format
- ❌ Inconsistent capitalization
- ❌ No type prefixes (feat:, fix:, docs:)
- ❌ No scope indicators
- ✅ Generally descriptive but informal

**Recommended Pattern (Conventional Commits):**
```
feat(ui): add button component with variants
fix(card-stack): correct deck shuffling logic
docs: update AGENTS.md with new architecture patterns
chore(deps): upgrade Next.js to 15.2.3
refactor(ui): extract common button styles to cva
```

### 3.5 Error Handling Patterns

**Not extensively documented in existing code, but inferred:**
- TypeScript strict mode enabled (null checks, type safety)
- ESLint rules enforce error handling best practices
- No global error boundary patterns documented

### 3.6 Testing Patterns

**From `card-stack/core/src/player/player.spec.ts`:**
```typescript
import { isIndexable, isPlayer, Mix, Player } from '..';

describe('player', () => {
  class TestPlayer extends Mix(Player) {}

  it('is Player', () => {
    const player = new TestPlayer();
    expect(isPlayer(player)).toBe(true);
  });

  it('is Indexable', () => {
    const player = new TestPlayer();
    expect(isIndexable(player)).toBe(true);
  });
});
```

**Patterns:**
- ✅ Co-located tests (`*.spec.ts` alongside source)
- ✅ Jest as test runner
- ✅ Describe/it structure
- ✅ Type guard testing for mixin composition
- ✅ Simple, focused unit tests

**Jest Config Pattern:**
```javascript
// card-stack/core/jest.config.js
module.exports = {
  preset: '@lellimecnar/jest-config',
};
```

**Test Commands:**
```json
"scripts": {
  "test": "jest",
  "test:watch": "jest --watch"
}
```

---

## 4. Technology & Framework Details

### 4.1 TypeScript Configuration

**Base Config Pattern** (`packages/config-typescript/base.json`):
- Extends `@vercel/style-guide/typescript/node20`
- Strict mode enabled
- ESNext target
- Decorators support
- JSON module resolution

**Usage in Packages:**
```json
// Example: card-stack/core/tsconfig.json
{
  "extends": "@lellimecnar/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

### 4.2 ESLint Configuration

**Hierarchy:**
- `base.js` - Core rules for all projects
- `browser.js` - Browser-specific rules
- `next.js` - Next.js specific rules
- `node.js` - Node.js specific rules

**Base extends:**
- `@vercel/style-guide/eslint/_base`
- `@vercel/style-guide/eslint/typescript`
- `plugin:tailwindcss/recommended`
- `turbo`

**Custom Rules:**
- Console statements: Only warn/error allowed
- TypeScript safety: Many unsafe operations set to `warn`
- Import ordering enforced
- Prettier integration

### 4.3 Tailwind Configuration

**Shared Base:**
- CSS variable-based theming (`hsl(var(--primary))`)
- Extended container utilities
- Dark mode: class-based
- Plugins: typography, animate, opentype

**Consumption:**
```typescript
// web/miller.pub/tailwind.config.ts
import baseConfig from '@lellimecnar/tailwind-config';

export default {
  ...baseConfig,
  content: ['./src/**/*.{ts,tsx}']
};
```

### 4.4 Next.js Configuration Patterns

**From `web/miller.pub/next.config.js`:**
```javascript
module.exports = {
  reactStrictMode: true,
  transpilePackages: ['@lellimecnar/ui'],
};
```

**Key Pattern:**
- ✅ `transpilePackages` required for local workspace TypeScript packages
- ✅ Enables consuming `@lellimecnar/ui` source directly without build step

### 4.5 Expo Configuration

**From `mobile/readon/app.config.ts`:**
```typescript
export default (): ExpoConfig => ({
  name: 'Read On',
  slug: 'readon',
  version: '1.0.0',
  scheme: 'readon',
  newArchEnabled: true,
  plugins: ['expo-router'],
  experiments: {
    typedRoutes: true,
  }
});
```

**Key Features:**
- ✅ New React Native architecture enabled
- ✅ Expo Router for file-based routing
- ✅ Typed routes experimental feature
- ✅ Universal platform support (iOS, Android, Web)

### 4.6 NativeWind Usage

**Pattern:**
- Same Tailwind classes work in React Native
- `className` prop on React Native components
- Shared design tokens with web

---

## 5. Build & Dependency System

### 5.1 Turborepo Task Dependencies

**Dependency Graph:**
```
build:
  ↓ depends on
^build (upstream packages build first)

lint:
  ↓ depends on
^build (requires built packages)

test:
  ↓ no dependencies

dev:
  ↓ no dependencies (persistent)
```

### 5.2 Workspace Protocol Usage

**Pattern:** ALL internal dependencies use `workspace:*`

**Examples:**
```json
// web/miller.pub/package.json
{
  "dependencies": {
    "@lellimecnar/ui": "workspace:*"
  },
  "devDependencies": {
    "@lellimecnar/eslint-config": "workspace:*",
    "@lellimecnar/tailwind-config": "workspace:*"
  }
}
```

**Never Use:**
- ❌ File paths: `"@lellimecnar/ui": "file:../../packages/ui"`
- ❌ Version numbers: `"@lellimecnar/ui": "0.0.0"`

### 5.3 Package Exports Patterns

**Granular Exports (`packages/ui/package.json`):**
```json
{
  "exports": {
    "./global.css": "./dist/global.css",
    "./lib/utils": "./src/lib/utils.ts",
    "./button": "./src/components/button.tsx",
    "./checkbox": "./src/components/checkbox.tsx"
  }
}
```

**Benefits:**
- ✅ Tree-shaking friendly
- ✅ Prevents accidental internal imports
- ✅ Explicit public API surface

**Usage:**
```typescript
// ✅ CORRECT
import { Button } from '@lellimecnar/ui/button';
import { cn } from '@lellimecnar/ui/lib/utils';

// ❌ WRONG (not exported)
import { Button } from '@lellimecnar/ui';
```

---

## 6. Official Documentation Research

### 6.1 Conventional Commits (v1.0.0)

**Format:**
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat:` - New feature (MINOR version)
- `fix:` - Bug fix (PATCH version)
- `docs:` - Documentation only
- `style:` - Code style (formatting, no logic change)
- `refactor:` - Code refactoring
- `perf:` - Performance improvement
- `test:` - Adding/updating tests
- `build:` - Build system changes
- `ci:` - CI configuration changes
- `chore:` - Other changes (dependencies, etc.)
- `revert:` - Revert a previous commit

**Breaking Changes:**
- Use `!` after type: `feat!:` or `feat(api)!:`
- OR use footer: `BREAKING CHANGE: description`

**Examples:**
```
feat(ui): add button component with size variants
fix(card-deck): correct shuffle algorithm for empty decks
docs: update CONTRIBUTING.md with commit guidelines
chore(deps): upgrade Next.js to 15.2.3
refactor(ui)!: change button API to use variants prop

BREAKING CHANGE: Button component now requires variant prop
```

### 6.2 Keep a Changelog (v1.1.0)

**Format:**
```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- New features coming in next release

## [1.0.0] - 2024-01-15
### Added
- Initial release

### Changed
- Changes in existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Now removed features

### Fixed
- Bug fixes

### Security
- Security fixes
```

**Principles:**
- ✅ Human-readable, not git log dumps
- ✅ Newest version first
- ✅ Release dates in ISO 8601 format (YYYY-MM-DD)
- ✅ Group by change type
- ✅ Link to versions/diffs

**Types of Changes:**
- `Added` - New features
- `Changed` - Changes in existing functionality
- `Deprecated` - Soon-to-be removed features
- `Removed` - Now removed features
- `Fixed` - Bug fixes
- `Security` - Vulnerability fixes

### 6.3 Contributor Covenant (v2.1)

**Latest Version:** 2.1 (but 3.0 exists)

**Sections:**
1. **Our Pledge** - Commitment to harassment-free community
2. **Our Standards** - Expected behavior examples
3. **Enforcement Responsibilities** - Leaders' role
4. **Scope** - Where code applies
5. **Enforcement** - Reporting process
6. **Enforcement Guidelines** - 4-level response system
   - Correction (warning)
   - Warning (no interaction period)
   - Temporary Ban
   - Permanent Ban
7. **Attribution** - Credit to Contributor Covenant

**Customization Required:**
- `[INSERT CONTACT METHOD]` - Replace with actual contact email

### 6.4 MADR (Markdown Any Decision Records)

**Pattern:** Not currently used in the project

**Structure (for future use):**
```markdown
# [Number]. [Title]

Date: YYYY-MM-DD

## Status

[Proposed | Accepted | Deprecated | Superseded]

## Context

What is the issue that we're seeing that is motivating this decision?

## Decision

What is the change that we're proposing and/or doing?

## Consequences

What becomes easier or more difficult to do because of this change?
```

### 6.5 TypeDoc for TypeScript

**Not currently implemented**

**Would be useful for:**
- Generating API documentation for `@card-stack/core`
- Documenting `@lellimecnar/ui` component props
- Creating developer reference docs

---

## 7. Gaps & Missing Information

### 7.1 Critical Missing Documentation

1. **CONTRIBUTING.md**
   - No contributor guidelines
   - No development setup instructions
   - No code review process
   - No commit message standards
   - No branch naming conventions

2. **SECURITY.md**
   - No security vulnerability reporting process
   - No supported versions table
   - No security best practices

3. **CHANGELOG.md**
   - No version history
   - No release notes
   - No upgrade guides

4. **CODE_OF_CONDUCT.md**
   - No community guidelines
   - No enforcement policy

### 7.2 Package Documentation Gaps

**All packages lack:**
- Individual README.md with:
  - Purpose/description
  - Installation instructions
  - API documentation
  - Usage examples
  - Configuration options

**Specific needs:**
- `@lellimecnar/ui` - Component API docs
- `@card-stack/core` - Game engine API
- Config packages - Configuration options

### 7.3 Process Documentation Gaps

**Missing:**
- Release process
- Versioning strategy
- Deprecation policy
- Migration guides
- Performance benchmarks
- Accessibility guidelines
- Browser/platform support matrix

### 7.4 Developer Experience Gaps

**Could be improved:**
- First-time contributor quick start
- Troubleshooting guide (beyond current section)
- FAQ section
- Video tutorials or screencasts
- Architecture decision records (ADRs)

---

## 8. Recommendations for Documentation Structure

### 8.1 Priority 1 (Critical - Create First)

1. **CONTRIBUTING.md**
   - Development setup
   - Commit message format (Conventional Commits)
   - PR process
   - Code style guidelines
   - Testing requirements

2. **CODE_OF_CONDUCT.md**
   - Use Contributor Covenant 2.1
   - Add contact method for reports

3. **CHANGELOG.md**
   - Follow Keep a Changelog format
   - Start with current version
   - Add Unreleased section

4. **SECURITY.md**
   - Vulnerability reporting process
   - Supported versions
   - Security best practices

### 8.2 Priority 2 (Important - Create Next)

5. **Package READMEs**
   - Template for all packages
   - Consistent structure
   - API documentation

6. **Pull Request Template**
   - Checklist for contributors
   - Link to CONTRIBUTING.md

7. **Issue Templates**
   - Bug report template
   - Feature request template
   - Question template

### 8.3 Priority 3 (Nice to Have)

8. **docs/ Directory**
   - Architecture Decision Records (ADRs)
   - In-depth guides
   - API reference
   - Migration guides

9. **Enhanced README sections**
   - Badges (build status, coverage)
   - Demo links
   - Screenshots

10. **Community Files**
    - SUPPORT.md
    - GOVERNANCE.md
    - FUNDING.yml

### 8.4 Suggested Documentation Structure

```
@lellimecnar/source/
├── README.md                           # ✅ Exists, needs enhancement
├── CONTRIBUTING.md                     # ❌ Create
├── CODE_OF_CONDUCT.md                 # ❌ Create
├── CHANGELOG.md                        # ❌ Create
├── SECURITY.md                         # ❌ Create
├── LICENSE                             # ❌ Create (MIT)
├── AGENTS.md                           # ✅ Exists, excellent
├── Project_Architecture_Blueprint.md   # ✅ Exists, excellent
├── Project_Folders_Structure_Blueprint.md # ✅ Exists, excellent
├── Technology_Stack_Blueprint.md       # ✅ Exists, excellent
├── Project_Workflow_Documentation.md   # ✅ Exists, excellent
├── llms.txt                            # ✅ Exists
│
├── .github/
│   ├── PULL_REQUEST_TEMPLATE.md      # ❌ Create
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md             # ❌ Create
│   │   ├── feature_request.md        # ❌ Create
│   │   └── question.md               # ❌ Create
│   └── workflows/                     # (CI/CD - separate task)
│
├── docs/                               # ❌ Create directory
│   ├── adr/                           # Architecture Decision Records
│   │   ├── 0001-use-mixin-pattern.md
│   │   ├── 0002-granular-exports.md
│   │   └── template.md
│   ├── guides/
│   │   ├── getting-started.md
│   │   ├── adding-ui-component.md
│   │   └── troubleshooting.md
│   └── api/
│       ├── card-stack-core.md
│       └── ui-components.md
│
└── packages/*/README.md                # ❌ Create for each package
```

---

## 9. Code Examples for Documentation

### 9.1 Common Usage Patterns

**Adding a new workspace package:**
```bash
# 1. Create package directory
mkdir -p packages/new-package/src

# 2. Create package.json
cat > packages/new-package/package.json << EOF
{
  "name": "@lellimecnar/new-package",
  "version": "0.0.0",
  "exports": {
    ".": "./src/index.ts"
  },
  "devDependencies": {
    "@lellimecnar/typescript-config": "workspace:*"
  }
}
EOF

# 3. Create tsconfig.json
cat > packages/new-package/tsconfig.json << EOF
{
  "extends": "@lellimecnar/typescript-config/base.json",
  "include": ["src/**/*"]
}
EOF

# 4. Install dependencies
pnpm install
```

**Adding shadcn/ui component:**
```bash
# Interactive CLI
pnpm ui ui

# Example: Add dialog component
# Select 'dialog' from list
# Component is added to packages/ui/src/components/dialog.tsx
# Update packages/ui/package.json exports
```

**Running tests for specific package:**
```bash
# Run once
pnpm --filter @card-stack/core test

# Watch mode
pnpm --filter @card-stack/core test:watch

# All packages
pnpm test
```

### 9.2 Styling Patterns

**Web (Tailwind CSS):**
```tsx
// Using cn() utility for conditional classes
<div className={cn(
  "base-class",
  condition && "conditional-class",
  variant === 'primary' && "primary-class"
)} />

// Using cva for component variants
const variants = cva("base", {
  variants: {
    size: { sm: "...", lg: "..." }
  }
});
```

**Mobile (NativeWind):**
```tsx
import { View, Text } from '@lellimecnar/ui-nativewind';

<View className="flex-1 items-center justify-center bg-white">
  <Text className="text-lg font-bold">Hello World</Text>
</View>
```

---

## 10. Summary & Next Steps

### 10.1 What We Have

**✅ Strengths:**
- Excellent architecture documentation (blueprints)
- Comprehensive AGENTS.md for developers/AI
- Well-organized monorepo structure
- Clear code patterns (mixins, exports, configs)
- Consistent technology choices
- Strong TypeScript configuration

**❌ Gaps:**
- Missing community documentation (CONTRIBUTING, CODE_OF_CONDUCT)
- No security policy
- No changelog/release notes
- Inconsistent commit messages
- Minimal package-level documentation
- No PR/issue templates

### 10.2 Recommended Action Plan

**Phase 1: Critical Community Files**
1. Create CONTRIBUTING.md with commit guidelines
2. Create CODE_OF_CONDUCT.md (Contributor Covenant)
3. Create SECURITY.md with reporting process
4. Create CHANGELOG.md with current state

**Phase 2: Developer Experience**
5. Create PR template
6. Create issue templates (bug, feature, question)
7. Add LICENSE file
8. Enhance root README with badges

**Phase 3: Package Documentation**
9. Create README template for packages
10. Document each package's API
11. Add usage examples

**Phase 4: Advanced Documentation**
12. Set up docs/ directory
13. Add Architecture Decision Records
14. Create in-depth guides
15. Generate API docs with TypeDoc

### 10.3 Documentation Best Practices to Follow

**From research:**
- ✅ Use Conventional Commits for all changes
- ✅ Keep a Changelog format for CHANGELOG.md
- ✅ Contributor Covenant for CODE_OF_CONDUCT.md
- ✅ Clear security reporting in SECURITY.md
- ✅ Comprehensive CONTRIBUTING.md
- ✅ Package READMEs with installation, usage, API
- ✅ Code examples in documentation
- ✅ Mermaid diagrams for architecture (already doing)
- ✅ Link between related documentation files

---

## Appendix A: File Locations Reference

**Architecture Documentation:**
- `/AGENTS.md`
- `/Project_Architecture_Blueprint.md`
- `/Project_Folders_Structure_Blueprint.md`
- `/Technology_Stack_Blueprint.md`
- `/Project_Workflow_Documentation.md`
- `/README.md`

**Configuration:**
- `/package.json` - Root package
- `/pnpm-workspace.yaml` - Workspace definition
- `/turbo.json` - Build orchestration
- `/tsconfig.json` - Root TypeScript config
- `/.github/copilot-instructions.md` - AI instructions

**Shared Configs:**
- `/packages/config-eslint/` - ESLint configurations
- `/packages/config-typescript/` - TypeScript configurations
- `/packages/config-tailwind/` - Tailwind base config
- `/packages/config-jest/` - Jest test configurations
- `/packages/config-prettier/` - Prettier formatting
- `/packages/config-babel/` - Babel configuration

**Web Apps:**
- `/web/miller.pub/` - Portfolio site
- `/web/readon.app/` - Reading app web

**Mobile Apps:**
- `/mobile/readon/` - Reading app mobile

**UI Libraries:**
- `/packages/ui/` - Web components
- `/packages/ui-nativewind/` - Mobile components

**Domain Logic:**
- `/card-stack/core/` - Game engine
- `/card-stack/deck-standard/` - Standard deck

---

## Appendix B: Technology Decision Rationale

**From existing documentation:**

1. **Monorepo (Turborepo + pnpm)**: Manage multiple apps and shared packages efficiently, ensuring code reuse and consistent tooling.

2. **Next.js & Expo**: Unified React development experience across web and mobile, sharing knowledge and potentially code.

3. **Tailwind CSS & NativeWind**: Consistent styling API across platforms.

4. **shadcn/ui**: Accessibility, customization (copy-paste architecture), and modern design.

5. **ts-mixer**: Flexible composition of card behaviors, avoiding deep inheritance hierarchies.

6. **workspace:* protocol**: Ensure latest local version is always used.

7. **Granular exports**: Enable tree-shaking and prevent accidental internal imports.

---

*End of Research Report*
