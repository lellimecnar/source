# Build System Improvements Implementation

## Goal
Standardize build tasks, add missing type-check scripts across all packages, and optimize Turborepo configuration for consistent validation and caching behavior.

## Prerequisites
Make sure you are currently on the `chore/build-system-improvements` branch before beginning implementation.
If not, move to the correct branch. If the branch does not exist, create it from master.

```bash
# Check current branch
git branch --show-current

# If not on correct branch, create and switch
git checkout -b chore/build-system-improvements
```

---

## Step-by-Step Instructions

### Step 1: Add type-check Task to Turborepo

The root `package.json` already has a `"type-check": "turbo type-check"` script, but the `turbo.json` configuration is missing the task definition. This step fixes that disconnect.

- [x] Open `turbo.json` in the root directory
- [x] Add the `type-check` task configuration
- [x] Copy and paste the code below into `turbo.json`:

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
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": []
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

#### Step 1 Verification Checklist
- [x] File is valid JSON (no syntax errors)
- [x] `type-check` task is present in the tasks object
- [x] Task depends on `^build` (upstream builds complete first)
- [x] Task has `outputs: []` (validation produces no artifacts)
- [x] Run `pnpm type-check` from root (will check packages that already have the script)
- [x] Verify no errors about missing task definition

#### Step 1 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

```bash
git add turbo.json
git commit -m "feat(turbo): add type-check task configuration"
```

---

### Step 2: Add type-check to Card Stack Packages

Add TypeScript validation scripts to both card-stack packages.

- [x] Open `card-stack/core/package.json`
- [x] Add the type-check script to the scripts section
- [x] Copy and paste the updated scripts object below into `card-stack/core/package.json`:

```json
{
  "name": "@card-stack/core",
  "version": "0.1.0",
  "description": "Core card game engine using TypeScript mixins",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "lint": "eslint .",
    "test": "jest",
    "test:watch": "jest --watch",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "ts-mixer": "^6.0.4"
  },
  "devDependencies": {
    "@card-stack/deck-standard": "workspace:*",
    "@lellimecnar/eslint-config": "workspace:*",
    "@lellimecnar/jest-config": "workspace:*",
    "@lellimecnar/typescript-config": "workspace:*",
    "@types/jest": "^29.5.14",
    "eslint": "^8.57.1",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.5",
    "typescript": "~5.5"
  }
}
```

- [x] Open `card-stack/deck-standard/package.json`
- [x] Add the type-check script to the scripts section
- [x] Copy and paste the updated scripts object below into `card-stack/deck-standard/package.json`:

```json
{
  "name": "@card-stack/deck-standard",
  "version": "0.1.0",
  "description": "Standard 52-card deck implementation",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "lint": "eslint .",
    "test": "jest",
    "test:watch": "jest --watch",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@card-stack/core": "workspace:*"
  },
  "devDependencies": {
    "@lellimecnar/eslint-config": "workspace:*",
    "@lellimecnar/jest-config": "workspace:*",
    "@lellimecnar/typescript-config": "workspace:*",
    "@types/jest": "^29.5.14",
    "eslint": "^8.57.1",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.5",
    "typescript": "~5.5"
  }
}
```

#### Step 2 Verification Checklist
- [x] Both package.json files are valid JSON
- [x] `type-check` script is present in scripts object for both packages
- [x] Run `pnpm --filter @card-stack/core type-check` - should complete with no errors
- [x] Run `pnpm --filter @card-stack/deck-standard type-check` - should complete with no errors
- [x] Run `pnpm type-check` from root - should include card-stack packages

#### Step 2 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

```bash
git add card-stack/core/package.json card-stack/deck-standard/package.json
git commit -m "feat(card-stack): add type-check scripts to core and deck-standard"
```

---

### Step 3: Add type-check to Config Packages

Add TypeScript validation scripts to all config packages that contain TypeScript code.

- [x] Open `packages/config-eslint/package.json`
- [x] Add type-check to scripts section
- [x] Copy and paste the updated scripts object below:

```json
{
  "name": "@lellimecnar/eslint-config",
  "version": "0.1.0",
  "description": "Shared ESLint configuration",
  "main": "./base.js",
  "scripts": {
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "@lellimecnar/typescript-config": "workspace:*",
    "eslint": "^8.57.1",
    "typescript": "~5.5"
  },
  "peerDependencies": {
    "eslint": "^8.0.0"
  }
}
```

- [x] Open `packages/config-jest/package.json`
- [x] Add type-check to scripts section
- [x] Copy and paste the updated scripts object below:

```json
{
  "name": "@lellimecnar/jest-config",
  "version": "0.1.0",
  "description": "Shared Jest configuration",
  "main": "./jest-preset.js",
  "scripts": {
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "ts-jest": "^29.2.5"
  },
  "devDependencies": {
    "@lellimecnar/eslint-config": "workspace:*",
    "@lellimecnar/typescript-config": "workspace:*",
    "eslint": "^8.57.1",
    "typescript": "~5.5"
  },
  "peerDependencies": {
    "jest": "^29.0.0"
  }
}
```

- [x] Open `packages/config-prettier/package.json`
- [x] Add type-check to scripts section
- [x] Copy and paste the updated scripts object below:

```json
{
  "name": "@lellimecnar/prettier-config",
  "version": "0.1.0",
  "description": "Shared Prettier configuration",
  "main": "./prettier-preset.js",
  "scripts": {
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "@lellimecnar/eslint-config": "workspace:*",
    "@lellimecnar/typescript-config": "workspace:*",
    "eslint": "^8.57.1",
    "prettier": "^3.4.2",
    "typescript": "~5.5"
  },
  "peerDependencies": {
    "prettier": "^3.0.0"
  }
}
```

- [x] Open `packages/config-tailwind/package.json`
- [x] Add type-check to scripts section
- [x] Copy and paste the updated scripts object below:

```json
{
  "name": "@lellimecnar/tailwind-config",
  "version": "0.1.0",
  "description": "Shared Tailwind CSS configuration",
  "main": "./tailwind.config.ts",
  "scripts": {
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "@lellimecnar/eslint-config": "workspace:*",
    "@lellimecnar/typescript-config": "workspace:*",
    "eslint": "^8.57.1",
    "tailwindcss": "^3.4.17",
    "typescript": "~5.5"
  },
  "peerDependencies": {
    "tailwindcss": "^3.0.0"
  }
}
```

- [x] Open `packages/config-typescript/package.json`
- [x] Add type-check to scripts section
- [x] Copy and paste the updated scripts object below:

```json
{
  "name": "@lellimecnar/typescript-config",
  "version": "0.1.0",
  "description": "Shared TypeScript configuration",
  "main": "./base.json",
  "scripts": {
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "@lellimecnar/eslint-config": "workspace:*",
    "eslint": "^8.57.1",
    "typescript": "~5.5"
  },
  "peerDependencies": {
    "typescript": "~5.5"
  }
}
```

- [x] Open `packages/expo-with-modify-gradle/package.json`
- [x] Add type-check to scripts section
- [x] Copy and paste the updated scripts object below:

```json
{
  "name": "@lellimecnar/expo-with-modify-gradle",
  "version": "0.1.0",
  "description": "Expo config plugin for modifying Gradle files",
  "main": "./index.js",
  "scripts": {
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "@lellimecnar/eslint-config": "workspace:*",
    "@lellimecnar/typescript-config": "workspace:*",
    "eslint": "^8.57.1",
    "typescript": "~5.5"
  },
  "peerDependencies": {
    "expo": "^52.0.0"
  }
}
```

#### Step 3 Verification Checklist
- [x] All 6 package.json files are valid JSON
- [x] Each has `"type-check": "tsc --noEmit"` in scripts
- [x] Run `pnpm --filter @lellimecnar/eslint-config type-check` - no errors
- [x] Run `pnpm --filter @lellimecnar/jest-config type-check` - no errors
- [x] Run `pnpm --filter @lellimecnar/prettier-config type-check` - no errors
- [x] Run `pnpm --filter @lellimecnar/tailwind-config type-check` - no errors
- [x] Run `pnpm --filter @lellimecnar/typescript-config type-check` - no errors
- [x] Run `pnpm --filter @lellimecnar/expo-with-modify-gradle type-check` - no errors

#### Step 3 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

```bash
git add packages/config-eslint/package.json packages/config-jest/package.json packages/config-prettier/package.json packages/config-tailwind/package.json packages/config-typescript/package.json packages/expo-with-modify-gradle/package.json
git commit -m "feat(packages): add type-check scripts to all config packages"
```

---

### Step 4: Add type-check to Utils Package

Add TypeScript validation script to the utils package.

- [x] Open `packages/utils/package.json`
- [x] Add type-check to scripts section
- [x] Copy and paste the updated scripts object below:

```json
{
  "name": "@lellimecnar/utils",
  "version": "0.1.0",
  "description": "Shared utility functions",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "date-fns": "^4.1.0",
    "lodash": "^4.17.21"
  },
  "devDependencies": {
    "@lellimecnar/eslint-config": "workspace:*",
    "@lellimecnar/typescript-config": "workspace:*",
    "@types/lodash": "^4.17.13",
    "eslint": "^8.57.1",
    "typescript": "~5.5"
  }
}
```

#### Step 4 Verification Checklist
- [x] package.json is valid JSON
- [x] `type-check` script is present
- [x] Run `pnpm --filter @lellimecnar/utils type-check` - no errors
- [x] Run `pnpm type-check` from root - includes utils package

#### Step 4 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

```bash
git add packages/utils/package.json
git commit -m "feat(utils): add type-check script"
```

---

### Step 5: Add type-check to Mobile App

Add TypeScript validation script to the mobile Expo app.

- [x] Open `mobile/readon/package.json`
- [x] Add type-check to scripts section (maintain alphabetical order)
- [x] Copy and paste the updated scripts object below:

```json
{
  "name": "readon",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "android": "expo start --android",
    "dev": "expo start --android",
    "dev:ios": "expo start --ios",
    "dev:web": "expo start --web",
    "ios": "expo start --ios",
    "lint": "eslint .",
    "start": "expo start",
    "test": "jest --watchAll",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@expo/vector-icons": "^14.0.4",
    "@lellimecnar/ui-nativewind": "workspace:*",
    "@lellimecnar/utils": "workspace:*",
    "@react-navigation/native": "^7.0.11",
    "expo": "^52.0.23",
    "expo-constants": "~17.0.3",
    "expo-font": "~13.0.1",
    "expo-linking": "~7.0.3",
    "expo-router": "~4.0.14",
    "expo-splash-screen": "~0.29.18",
    "expo-status-bar": "~2.0.0",
    "expo-system-ui": "~4.0.4",
    "expo-web-browser": "~14.0.1",
    "nativewind": "^4.1.23",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "react-native": "0.76.6",
    "react-native-gesture-handler": "~2.20.2",
    "react-native-reanimated": "~3.16.4",
    "react-native-safe-area-context": "4.12.0",
    "react-native-screens": "~4.4.0",
    "react-native-web": "~0.19.13"
  },
  "devDependencies": {
    "@babel/core": "^7.25.2",
    "@lellimecnar/babel-preset": "workspace:*",
    "@lellimecnar/eslint-config": "workspace:*",
    "@lellimecnar/expo-with-modify-gradle": "workspace:*",
    "@lellimecnar/jest-config": "workspace:*",
    "@lellimecnar/tailwind-config": "workspace:*",
    "@types/jest": "^29.5.14",
    "@types/react": "~18.3.12",
    "@types/react-test-renderer": "^18.3.0",
    "eslint": "^8.57.1",
    "jest": "^29.7.0",
    "jest-expo": "~52.0.2",
    "react-test-renderer": "18.3.1",
    "tailwindcss": "^3.4.17",
    "typescript": "~5.5"
  },
  "private": true
}
```

#### Step 5 Verification Checklist
- [x] package.json is valid JSON
- [x] `type-check` script is present in scripts section
- [x] Scripts are in alphabetical order
- [x] Run `pnpm readon type-check` - no errors (uses root alias)
- [x] Run `pnpm --filter readon type-check` - no errors (direct filter)
- [x] Run `pnpm type-check` from root - includes mobile app

#### Step 5 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

```bash
git add mobile/readon/package.json
git commit -m "feat(mobile): add type-check script to readon app"
```

---

### Step 6: Add Node Version File

Create `.nvmrc` to ensure consistent Node.js version across development environments and CI.

- [x] Create `.nvmrc` file in the root directory
- [x] Copy and paste the content below into `.nvmrc`:

```
20
```

#### Step 6 Verification Checklist
- [x] `.nvmrc` file exists in root directory
- [x] File contains only `20` (no extra whitespace or newlines)
- [x] Run `nvm use` in project root (if nvm is installed)
- [x] Verify correct Node version is activated: `node --version` should show v20.x.x
- [x] Note: CI systems will automatically use this version if configured

#### Step 6 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

```bash
git add .nvmrc
git commit -m "chore: add .nvmrc for Node.js version management"
```

---

### Step 7: Enhance Turborepo Configuration

Add additional task configurations to improve caching, support new workflows, and add environment variable handling where needed.

- [x] Open `turbo.json` in the root directory
- [x] Add new tasks: `format`, `test:coverage`, `test:ci`
- [x] Copy and paste the complete updated configuration below into `turbo.json`:

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
    "test:coverage": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "inputs": ["$TURBO_DEFAULT$", "jest.config.js", "jest.config.ts"]
    },
    "test:ci": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "inputs": ["$TURBO_DEFAULT$", "jest.config.js", "jest.config.ts"],
      "env": ["CI"]
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "format": {
      "dependsOn": [],
      "outputs": [],
      "cache": false
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": []
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

#### Step 7 Verification Checklist
- [x] File is valid JSON (no syntax errors)
- [x] All original tasks are preserved
- [x] New tasks added: `format`, `test:coverage`, `test:ci`
- [x] `test:coverage` depends on `^build` and outputs to `coverage/**`
- [x] `test:ci` includes `CI` environment variable
- [x] `format` has no cache (mutations always execute)
- [x] Run `turbo test:coverage --dry-run` to verify task recognition
- [x] Run `turbo format --dry-run` to verify task recognition

#### Step 7 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

```bash
git add turbo.json
git commit -m "feat(turbo): add format, test:coverage, and test:ci tasks"
```

---

### Step 8: Add Workspace Management Scripts

Add convenience scripts to root package.json for common workspace operations.

- [x] Open `package.json` in the root directory
- [x] Add new scripts: `graph`, `outdated`, `update-interactive`, `why`, `clean:hard`
- [x] Copy and paste the updated scripts section below (merge with existing scripts):

```json
{
  "name": "@lellimecnar/source",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "card-stack/*",
    "packages/*",
    "web/*",
    "mobile/*"
  ],
  "scripts": {
    "miller.pub": "pnpm --filter miller.pub",
    "readon": "pnpm --filter readon",
    "readon.app": "pnpm --filter readon.app",
    "ui": "pnpm --filter @lellimecnar/ui",
    "build": "turbo build",
    "clean": "turbo clean; git clean -xdf node_modules .turbo .next .expo",
    "clean:hard": "pnpm clean && rm -rf pnpm-lock.yaml && pnpm install",
    "dev": "turbo dev",
    "format": "turbo lint -- --fix --fix-type=directive,problem,suggestion,layout",
    "graph": "pnpm list --depth=Infinity --json",
    "lint": "turbo lint",
    "outdated": "pnpm outdated --recursive",
    "test": "turbo test",
    "test:watch": "turbo test:watch",
    "type-check": "turbo type-check",
    "update-interactive": "pnpm update --interactive --recursive --latest",
    "why": "pnpm why"
  },
  "packageManager": "pnpm@9.12.2",
  "engines": {
    "node": "^20",
    "pnpm": "^9"
  },
  "devDependencies": {
    "@lellimecnar/eslint-config": "workspace:*",
    "@lellimecnar/prettier-config": "workspace:*",
    "@lellimecnar/typescript-config": "workspace:*",
    "eslint": "^8.57.1",
    "prettier": "^3.4.2",
    "turbo": "^2.3.3",
    "typescript": "~5.5"
  }
}
```

#### Step 8 Verification Checklist
- [x] package.json is valid JSON
- [x] All new scripts are present: `graph`, `outdated`, `update-interactive`, `why`, `clean:hard`
- [x] Scripts are in alphabetical order
- [x] Run `pnpm graph` - should output dependency tree JSON
- [x] Run `pnpm outdated` - should check for outdated packages
- [x] Run `pnpm why typescript` - should explain why typescript is installed
- [x] Do NOT run `clean:hard` yet (destructive operation)

#### Step 8 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

```bash
git add package.json
git commit -m "feat(workspace): add convenience scripts for dependency management"
```

---

### Step 9: Create Package Template Documentation

Create documentation for the required structure and scripts for new packages.

- [x] Create directory `.github` if it doesn't exist
- [x] Create file `.github/PACKAGE_TEMPLATE.md`
- [x] Copy and paste the content below into `.github/PACKAGE_TEMPLATE.md`:

```markdown
# Package Template

This document defines the required structure and conventions for creating new packages in the `@lellimecnar/source` monorepo.

## Package Structure

```
packages/<package-name>/
├── AGENTS.md              # AI agent instructions (required)
├── package.json           # Package manifest (required)
├── tsconfig.json          # TypeScript configuration (required for TS packages)
├── README.md              # Package documentation (recommended)
├── src/                   # Source files
│   └── index.ts           # Main entry point
└── dist/                  # Compiled output (gitignored)
```

## Required package.json Fields

### Basic Metadata
```json
{
  "name": "@lellimecnar/<package-name>",
  "version": "0.1.0",
  "description": "Brief description of package purpose",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts"
}
```

### Required Scripts

All packages MUST include these scripts:

```json
{
  "scripts": {
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  }
}
```

### Additional Scripts by Package Type

**Library/Utility Packages:**
```json
{
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

**UI Component Libraries:**
```json
{
  "scripts": {
    "build": "tailwindcss -i ./src/global.css -o ./dist/global.css",
    "dev": "tailwindcss -i ./src/global.css -o ./dist/global.css --watch"
  }
}
```

**Configuration Packages:**
```json
{
  "scripts": {
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  }
}
```

### Required Dependencies

**TypeScript Packages:**
```json
{
  "devDependencies": {
    "@lellimecnar/eslint-config": "workspace:*",
    "@lellimecnar/typescript-config": "workspace:*",
    "eslint": "^8.57.1",
    "typescript": "~5.5"
  }
}
```

**Packages with Tests:**
```json
{
  "devDependencies": {
    "@lellimecnar/jest-config": "workspace:*",
    "@types/jest": "^29.5.14",
    "jest": "^29.7.0"
  }
}
```

## TypeScript Configuration

### Base Configuration (tsconfig.json)

**For Node.js Libraries:**
```json
{
  "extends": "@lellimecnar/typescript-config",
  "compilerOptions": {
    "baseUrl": ".",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["dist", "node_modules"]
}
```

**For React Libraries:**
```json
{
  "extends": "@lellimecnar/typescript-config/react.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["dist", "node_modules"]
}
```

**For Configuration Packages:**
```json
{
  "extends": "@lellimecnar/typescript-config",
  "compilerOptions": {
    "baseUrl": ".",
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  },
  "include": ["**/*.ts", "*.js", ".*.js"],
  "exclude": ["node_modules"]
}
```

## AGENTS.md Template

Every package MUST include an `AGENTS.md` file for AI context:

```markdown
# AGENTS.md - <Package Name>

## Package Overview

**Name:** `@lellimecnar/<package-name>`
**Type:** [Library | Config | Utility | UI Component]
**Purpose:** [One-sentence description]

## Key Files

- `src/index.ts` - Main entry point
- [List other important files]

## Development Commands

\`\`\`bash
# Type check
pnpm --filter @lellimecnar/<package-name> type-check

# Lint
pnpm --filter @lellimecnar/<package-name> lint

# Test (if applicable)
pnpm --filter @lellimecnar/<package-name> test

# Build (if applicable)
pnpm --filter @lellimecnar/<package-name> build
\`\`\`

## Dependencies

### Internal Dependencies
- [List workspace dependencies]

### External Dependencies
- [List major external dependencies with purpose]

## Architecture Notes

[Brief description of package architecture, patterns used, or important implementation details]

## Testing Strategy

[If applicable, describe testing approach and coverage expectations]
```

## Workspace Configuration

Add new package to `pnpm-workspace.yaml` if creating a new workspace category:

```yaml
packages:
  - 'card-stack/*'
  - 'packages/*'
  - 'web/*'
  - 'mobile/*'
  - 'your-new-category/*'  # Add this line if creating new category
```

## Checklist for New Packages

- [ ] Package follows directory structure template
- [ ] `package.json` includes all required fields and scripts
- [ ] `tsconfig.json` extends appropriate base configuration
- [ ] `AGENTS.md` provides comprehensive package documentation
- [ ] Package name follows `@lellimecnar/<name>` convention
- [ ] All workspace dependencies use `workspace:*` protocol
- [ ] Scripts `lint` and `type-check` are present
- [ ] Package is added to appropriate workspace in `pnpm-workspace.yaml`
- [ ] Package builds without errors: `pnpm --filter <package> build`
- [ ] Package passes type checking: `pnpm --filter <package> type-check`
- [ ] Package passes linting: `pnpm --filter <package> lint`
- [ ] Package is documented in root `AGENTS.md` if necessary

## Integration Testing

After creating a new package:

```bash
# Install dependencies
pnpm install

# Type check all packages
pnpm type-check

# Lint all packages
pnpm lint

# Build all packages
pnpm build

# Test the specific package works in isolation
pnpm --filter @lellimecnar/<package-name> type-check
pnpm --filter @lellimecnar/<package-name> lint
```

## Notes

- Use `workspace:*` protocol for all internal dependencies
- Version all packages as `0.1.0` initially
- Mark packages as `"private": true` if not intended for npm publishing
- Follow existing naming conventions for consistency
- Update root `AGENTS.md` if package introduces new patterns or conventions
```

#### Step 9 Verification Checklist
- [x] `.github/` directory exists
- [x] `.github/PACKAGE_TEMPLATE.md` file created
- [x] File contains all required sections: structure, package.json fields, scripts, tsconfig patterns, AGENTS.md template, checklist
- [x] Markdown formatting is correct (no rendering errors)
- [x] Review template against existing packages (e.g., `packages/ui`, `card-stack/core`) to ensure accuracy
- [x] Template matches established patterns in the monorepo

#### Step 9 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

```bash
git add .github/PACKAGE_TEMPLATE.md
git commit -m "docs: add package template documentation"
```

---

## Final Verification

After all steps are complete, run the full verification suite:

```bash
# Full type check across all packages
pnpm type-check

# Full lint across all packages
pnpm lint

# Verify Turborepo recognizes all tasks
turbo --help

# Test specific new tasks
turbo test:coverage --dry-run
turbo format --dry-run

# Verify all packages have type-check
pnpm -r exec -- jq '.scripts["type-check"]' package.json | grep -v null | wc -l
# Should output 14 (10 packages + 2 card-stack + 2 web apps = 14 with type-check, excluding babel-preset)
```

## Completion Checklist

- [x] All 9 steps completed and committed
- [x] `turbo.json` has `type-check`, `format`, `test:coverage`, `test:ci` tasks
- [x] 10 packages have new `type-check` scripts added
- [x] `.nvmrc` file created with Node 20
- [x] Root `package.json` has workspace management scripts
- [x] `.github/PACKAGE_TEMPLATE.md` documentation created
- [x] All changes committed to `chore/build-system-improvements` branch
- [x] `pnpm type-check` runs successfully from root
- [x] No build, lint, or type errors in any package

## Next Steps

1. Push branch to remote: `git push -u origin chore/build-system-improvements`
2. Create pull request to `master` branch
3. Request review from team
4. Run CI pipeline to verify all changes work in clean environment
5. Merge after approval

---

**Implementation Complete!** All packages now have consistent build tasks, type-checking is standardized across the monorepo, and the Turborepo configuration is optimized for caching and validation workflows.
