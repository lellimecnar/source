## tsgo + Vite + Vitest Migration (Monorepo-wide)

## Goal

Standardize the monorepo on faster, modern tooling:

- Use `tsgo` (`@typescript/native-preview`) for type-checking.
- Use Vite for **publishable library** builds only (Next.js builds remain `next build`).
- Migrate Jest → Vitest everywhere except Expo/RN workspaces (which keep `jest-expo`).
- Enforce ESM-only outputs for publishable packages using `"type": "module"` and no `exports.require`.

This document is a copy-paste ready implementation guide derived from `plans/tsgo-vite-vitest-migration/plan.md`.

## Prerequisites

Make sure you are currently on the `tsgo-vite-vitest-migration` branch before beginning implementation.

```bash
# Check current branch
git branch --show-current

# If not on tsgo-vite-vitest-migration, create and switch
git checkout -b tsgo-vite-vitest-migration
```

---

## Step-by-Step Instructions

### Step 1: Add migration scaffolding + agree on conventions

This step updates Turborepo inputs so changes to future Vite/Vitest configs are tracked correctly during the migration.

- [x] Open `turbo.json`
- [x] Update the `test`, `test:coverage`, and `test:ci` task inputs to include `vite.config.*` and `vitest.config.*` (keep the existing Jest-era inputs for now).

Copy/paste the full `turbo.json` below:

```json
{
	"$schema": "https://turbo.build/schema.json",
	"tasks": {
		"build": {
			"dependsOn": ["^build"],
			"inputs": ["$TURBO_DEFAULT$", ".env*"],
			"outputs": ["dist/**", ".next/**", "!.next/cache/**"],
			"env": ["NODE_ENV", "ANALYZE"]
		},
		"test": {
			"outputs": ["coverage/**"],
			"dependsOn": [],
			"inputs": [
				"$TURBO_DEFAULT$",
				"jest.config.js",
				"jest.config.ts",
				"vitest.config.*",
				"vite.config.*"
			]
		},
		"test:watch": {
			"cache": false,
			"persistent": true
		},
		"test:coverage": {
			"dependsOn": ["^build"],
			"outputs": ["coverage/**"],
			"inputs": [
				"$TURBO_DEFAULT$",
				"jest.config.js",
				"jest.config.ts",
				"vitest.config.*",
				"vite.config.*"
			]
		},
		"test:ci": {
			"dependsOn": ["^build"],
			"outputs": ["coverage/**"],
			"inputs": [
				"$TURBO_DEFAULT$",
				"jest.config.js",
				"jest.config.ts",
				"vitest.config.*",
				"vite.config.*"
			],
			"env": ["CI"]
		},
		"lint": {
			"dependsOn": ["^build"],
			"env": ["NODE_ENV", "ANALYZE"]
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

#### Step 1 Verification Checklist

- [x] Run `pnpm -w lint`

#### Step 1 STOP & COMMIT

Present the following multiline conventional commit message in the chat:

```txt
chore(turbo): track vite/vitest configs in test tasks

Update Turbo test task inputs to track `vite.config.*` and `vitest.config.*`.
Keep existing Jest-era inputs during the migration.

completes: step 1 of 14 for tsgo-vite-vitest-migration
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 2: Introduce `tsgo` as the monorepo type-check engine

This step installs `@typescript/native-preview` at the root and replaces all workspace `type-check` scripts from `tsc` → `tsgo`.

#### Step 2.1: Add the dependency

- [x] Add `@typescript/native-preview` to root devDependencies:

```bash
pnpm -w add -D @typescript/native-preview
```

> Keep `typescript` installed (Next.js/Expo ecosystem expectation).

#### Step 2.2: Update `type-check` scripts in every workspace

For each file below, replace the `type-check` script value as shown.

- [x] `package.json`
  - Replace `"type-check": "turbo type-check"` (no change needed)

- [x] `card-stack/core/package.json`
  - Replace:
    - `"type-check": "tsc --noEmit"`
    - with: `"type-check": "tsgo --noEmit"`

- [x] `card-stack/deck-standard/package.json`
  - Replace:
    - `"type-check": "tsc --noEmit"`
    - with: `"type-check": "tsgo --noEmit"`

- [x] `packages/utils/package.json`
  - Replace:
    - `"type-check": "tsc --noEmit"`
    - with: `"type-check": "tsgo --noEmit"`

- [x] `packages/polymix/package.json`
  - Replace:
    - `"type-check": "tsc --noEmit"`
    - with: `"type-check": "tsgo --noEmit"`

- [x] `packages/ui/package.json`
  - Replace:
    - `"type-check": "tsc --noEmit"`
    - with: `"type-check": "tsgo --noEmit"`

- [x] `packages/ui-nativewind/package.json`
  - Replace:
    - `"type-check": "tsc --noEmit"`
    - with: `"type-check": "tsgo --noEmit"`

- [x] `packages/ui-spec/core/package.json`
  - Replace:
    - `"type-check": "tsc -p tsconfig.json --noEmit"`
    - with: `"type-check": "tsgo -p tsconfig.json --noEmit"`

- [x] `packages/ui-spec/react/package.json`
  - Replace:
    - `"type-check": "tsc -p tsconfig.json --noEmit"`
    - with: `"type-check": "tsgo -p tsconfig.json --noEmit"`

- [x] `packages/ui-spec/router/package.json`
  - Replace:
    - `"type-check": "tsc -p tsconfig.json --noEmit"`
    - with: `"type-check": "tsgo -p tsconfig.json --noEmit"`

- [x] `packages/ui-spec/router-react/package.json`
  - Replace:
    - `"type-check": "tsc -p tsconfig.json --noEmit"`
    - with: `"type-check": "tsgo -p tsconfig.json --noEmit"`

- [x] `packages/ui-spec/validate-jsonschema/package.json`
  - Replace:
    - `"type-check": "tsc -p tsconfig.json --noEmit"`
    - with: `"type-check": "tsgo -p tsconfig.json --noEmit"`

- [x] `packages/ui-spec/cli/package.json`
  - Replace:
    - `"type-check": "tsc -p tsconfig.json --noEmit"`
    - with: `"type-check": "tsgo -p tsconfig.json --noEmit"`

- [x] `packages/config-eslint/package.json`
  - Replace:
    - `"type-check": "tsc --noEmit"`
    - with: `"type-check": "tsgo --noEmit"`

- [x] `packages/config-typescript/package.json`
  - Replace:
    - `"type-check": "tsc --noEmit"`
    - with: `"type-check": "tsgo --noEmit"`

- [x] `packages/config-prettier/package.json`
  - Replace:
    - `"type-check": "tsc --noEmit"`
    - with: `"type-check": "tsgo --noEmit"`

- [x] `packages/config-tailwind/package.json`
  - Replace:
    - `"type-check": "tsc --noEmit"`
    - with: `"type-check": "tsgo --noEmit"`

- [x] `packages/config-jest/package.json`
  - Replace:
    - `"type-check": "tsc --noEmit"`
    - with: `"type-check": "tsgo --noEmit"`

- [x] `packages/expo-with-modify-gradle/package.json`
  - Replace:
    - `"type-check": "tsc --noEmit"`
    - with: `"type-check": "tsgo --noEmit"`

- [x] `web/miller.pub/package.json`
  - Replace:
    - `"type-check": "tsc --noEmit"`
    - with: `"type-check": "tsgo --noEmit"`

- [x] `web/readon.app/package.json`
  - Replace:
    - `"type-check": "tsc --noEmit"`
    - with: `"type-check": "tsgo --noEmit"`

- [x] `mobile/readon/package.json`
  - Replace:
    - `"type-check": "tsc --noEmit"`
    - with: `"type-check": "tsgo --noEmit"`

#### Step 2 Verification Checklist

- [x] Run `pnpm -w type-check`
- [x] Spot-check:
  - [x] `pnpm --filter miller.pub type-check`
  - [x] `pnpm --filter readon.app type-check`

#### Step 2 STOP & COMMIT

Present the following multiline conventional commit message in the chat:

```txt
chore(tsgo): switch type-check scripts to tsgo

Add `@typescript/native-preview` as the monorepo type-check engine.
Switch workspace `type-check` scripts from `tsc` to `tsgo`.

completes: step 2 of 14 for tsgo-vite-vitest-migration
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 3: Create shared Vitest config package (`@lellimecnar/vitest-config`)

This step introduces a shared Vitest config package patterned after existing config packages.

#### Step 3.1: Create package folder

- [x] Create `packages/config-vitest/`
- [x] Create `packages/config-vitest/AGENTS.md` (minimal)
- [x] Create `packages/config-vitest/package.json`
- [x] Create `packages/config-vitest/tsconfig.json`
- [x] Create `packages/config-vitest/base.ts`
- [x] Create `packages/config-vitest/browser.ts`
- [x] Create `packages/config-vitest/browser-jsdom.ts`
- [x] Create `packages/config-vitest/setup/reflect-metadata.ts`
- [x] Create `packages/config-vitest/setup/testing-library.ts`
- [x] Create `packages/config-vitest/next/mocks/navigation.ts`
- [x] Create `packages/config-vitest/next/mocks/image.ts`
- [x] Create `packages/config-vitest/next/presets/app-router.ts`
- [x] Create `packages/config-vitest/setup/next-app-router.ts`

#### Step 3.2: File contents

Create `packages/config-vitest/package.json`:

```json
{
	"name": "@lellimecnar/vitest-config",
	"version": "0.0.0",
	"private": true,
	"license": "MIT",
	"type": "module",
	"exports": {
		".": "./base.ts",
		"./browser": "./browser.ts",
		"./browser-jsdom": "./browser-jsdom.ts",
		"./setup/reflect-metadata": "./setup/reflect-metadata.ts",
		"./setup/testing-library": "./setup/testing-library.ts",
		"./setup/next-app-router": "./setup/next-app-router.ts",
		"./next/mocks/navigation": "./next/mocks/navigation.ts",
		"./next/mocks/image": "./next/mocks/image.ts",
		"./next/presets/app-router": "./next/presets/app-router.ts"
	},
	"scripts": {
		"lint": "eslint .",
		"type-check": "tsgo --noEmit"
	},
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@types/node": "^24",
		"typescript": "~5.5"
	},
	"peerDependencies": {
		"typescript": "~5.5"
	}
}
```

Install Vitest dependencies for this config package:

```bash
pnpm --filter @lellimecnar/vitest-config add -D vitest @vitest/coverage-v8 vite-tsconfig-paths
```

Create `packages/config-vitest/tsconfig.json`:

```jsonc
{
	"extends": "@lellimecnar/typescript-config",
	"compilerOptions": {
		"module": "NodeNext",
		"moduleResolution": "NodeNext",
	},
	"include": ["**/*.ts"],
	"exclude": ["dist", "build", "node_modules"],
}
```

Create `packages/config-vitest/base.ts`:

```ts
import { fileURLToPath } from 'node:url';
import tsconfigPaths from 'vite-tsconfig-paths';
import type { ViteUserConfig } from 'vitest/config';

function resolveLocalFile(pathFromRoot: string) {
	return fileURLToPath(new URL(pathFromRoot, import.meta.url));
}

export function vitestBaseConfig(): ViteUserConfig {
	return {
		plugins: [tsconfigPaths()],
		test: {
			globals: true,
			passWithNoTests: true,
			coverage: {
				provider: 'v8',
				reportsDirectory: 'coverage',
				reporter: ['text', 'text-summary', 'html', 'lcov', 'json'],
				// Coverage target is 80% monorepo-wide, but is not enforced yet.
				// To enforce later, add thresholds behind an env flag.
			},
			setupFiles: [resolveLocalFile('./setup/reflect-metadata.ts')],
		},
	};
}
```

Create `packages/config-vitest/browser.ts`:

```ts
import { fileURLToPath } from 'node:url';
import type { ViteUserConfig } from 'vitest/config';

import { vitestBaseConfig } from './base.ts';

function resolveLocalFile(pathFromRoot: string) {
	return fileURLToPath(new URL(pathFromRoot, import.meta.url));
}

export function vitestBrowserConfigHappyDom(): ViteUserConfig {
	const base = vitestBaseConfig();

	return {
		...base,
		test: {
			...base.test,
			environment: 'happy-dom',
			setupFiles: [
				...(base.test?.setupFiles ?? []),
				resolveLocalFile('./setup/testing-library.ts'),
			],
		},
	};
}

export function vitestBrowserConfigHappyDomNextAppRouter(): ViteUserConfig {
	const base = vitestBrowserConfigHappyDom();

	return {
		...base,
		test: {
			...base.test,
			setupFiles: [
				...(base.test?.setupFiles ?? []),
				resolveLocalFile('./setup/next-app-router.ts'),
			],
		},
	};
}
```

Create `packages/config-vitest/browser-jsdom.ts`:

```ts
import type { ViteUserConfig } from 'vitest/config';

import { vitestBrowserConfigHappyDom } from './browser.ts';

export function vitestBrowserConfigJsdom(): ViteUserConfig {
	const base = vitestBrowserConfigHappyDom();

	return {
		...base,
		test: {
			...base.test,
			environment: 'jsdom',
		},
	};
}
```

Create `packages/config-vitest/setup/reflect-metadata.ts`:

```ts
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

try {
	require('reflect-metadata');
} catch {
	// Optional dependency.
}
```

Create `packages/config-vitest/setup/testing-library.ts`:

```ts
import { createRequire } from 'node:module';
import { afterEach } from 'vitest';

const require = createRequire(import.meta.url);

try {
	require('@testing-library/jest-dom/vitest');
} catch {
	// Optional dependency.
}

try {
	// Optional dependency; only works when installed.
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const { cleanup } = require('@testing-library/react');
	afterEach(() => cleanup());
} catch {
	// no-op
}
```

Create `packages/config-vitest/next/mocks/navigation.ts`:

```ts
import { vi } from 'vitest';

export function mockNextNavigation() {
	vi.mock('next/navigation', () => {
		return {
			usePathname: () => '/',
			useRouter: () => ({
				push: vi.fn(),
				replace: vi.fn(),
				prefetch: vi.fn(),
				back: vi.fn(),
				forward: vi.fn(),
				refresh: vi.fn(),
			}),
			useSearchParams: () => new URLSearchParams(),
			useParams: () => ({}),
		};
	});
}
```

Create `packages/config-vitest/next/mocks/image.ts`:

```ts
import { vi } from 'vitest';

export function mockNextImage() {
	vi.mock('next/image', () => {
		return {
			__esModule: true,
			default: () => null,
		};
	});
}
```

Create `packages/config-vitest/next/presets/app-router.ts`:

```ts
import { mockNextImage } from '../mocks/image.js';
import { mockNextNavigation } from '../mocks/navigation.js';

export function installNextAppRouterMocks() {
	mockNextNavigation();
	mockNextImage();
}
```

Create `packages/config-vitest/setup/next-app-router.ts`:

```ts
import { installNextAppRouterMocks } from '../next/presets/app-router.js';

installNextAppRouterMocks();
```

Create `packages/config-vitest/AGENTS.md` (minimal):

````markdown
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
````

#### Step 3 Verification Checklist

- [x] Run `pnpm --filter @lellimecnar/vitest-config type-check`

#### Step 3 STOP & COMMIT

Present the following multiline conventional commit message in the chat:

```txt
feat(config-vitest): add shared vitest presets

Add `@lellimecnar/vitest-config` with shared Node and browser presets.
Include optional setup helpers and Next.js App Router mocks.

completes: step 3 of 14 for tsgo-vite-vitest-migration
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 4: Create shared Vite config package (`@lellimecnar/vite-config`)

This step adds a shared Vite config package used to compose per-package `vite.config.ts` files.

#### Step 4.1: Create package folder

- [x] Create `packages/config-vite/`
- [x] Create `packages/config-vite/AGENTS.md` (minimal)
- [x] Create `packages/config-vite/package.json`
- [x] Create `packages/config-vite/tsconfig.json`
- [x] Create `packages/config-vite/base.ts`
- [x] Create `packages/config-vite/node.ts`
- [x] Create `packages/config-vite/browser.ts`

#### Step 4.2: File contents

Create `packages/config-vite/package.json`:

```json
{
	"name": "@lellimecnar/vite-config",
	"version": "0.0.0",
	"private": true,
	"license": "MIT",
	"exports": {
		".": "./base.ts",
		"./node": "./node.ts",
		"./browser": "./browser.ts"
	},
	"scripts": {
		"lint": "eslint .",
		"type-check": "tsgo --noEmit"
	},
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@types/node": "^24",
		"typescript": "~5.5"
	},
	"peerDependencies": {
		"typescript": "~5.5"
	}
}
```

Install Vite dependencies for this config package:

```bash
pnpm --filter @lellimecnar/vite-config add -D vite vite-tsconfig-paths vite-plugin-dts
```

Create `packages/config-vite/tsconfig.json`:

```jsonc
{
	"extends": "@lellimecnar/typescript-config",
	"include": ["**/*.ts"],
	"exclude": ["dist", "build", "node_modules"],
}
```

Create `packages/config-vite/base.ts`:

```ts
import type { UserConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export function viteBaseConfig(): UserConfig {
	return {
		plugins: [tsconfigPaths()],
		build: {
			// Each package defines its own lib entry/outDir.
			emptyOutDir: true,
		},
	};
}
```

Create `packages/config-vite/node.ts`:

```ts
import type { UserConfig } from 'vite';

import { viteBaseConfig } from './base.ts';

export function viteNodeConfig(): UserConfig {
	const base = viteBaseConfig();
	return {
		...base,
		// Node libraries can override target/externalization per-package.
	};
}
```

Create `packages/config-vite/browser.ts`:

```ts
import type { UserConfig } from 'vite';

import { viteBaseConfig } from './base.ts';

export function viteBrowserConfig(): UserConfig {
	const base = viteBaseConfig();
	return {
		...base,
	};
}
```

Create `packages/config-vite/AGENTS.md` (minimal):

````markdown
This file provides guidance when working with code in the `@lellimecnar/vite-config` package.

## Package Overview

`@lellimecnar/vite-config` is a shared Vite configuration package used to compose per-package `vite.config.ts`.

## Development Commands

```bash
pnpm --filter @lellimecnar/vite-config type-check
pnpm --filter @lellimecnar/vite-config lint
```
````

#### Step 4 Verification Checklist

- [x] Run `pnpm --filter @lellimecnar/vite-config type-check`

#### Step 4 STOP & COMMIT

Present the following multiline conventional commit message in the chat:

```txt
feat(config-vite): add shared vite presets

Add `@lellimecnar/vite-config` with shared base, Node, and browser config builders.
Provide a consistent foundation for per-package `vite.config.ts` composition.

completes: step 4 of 14 for tsgo-vite-vitest-migration
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 5: Migrate pure Node libraries from Jest → Vitest (low risk)

Targets:

- `@lellimecnar/utils`
- `polymix`
- `@card-stack/core`
- `@card-stack/deck-standard`

#### Step 5.1: Install dependencies (per package)

Run the following:

```bash
pnpm --filter @lellimecnar/utils add -D vitest @vitest/coverage-v8 "@lellimecnar/vitest-config@workspace:*"
pnpm --filter polymix add -D vitest @vitest/coverage-v8 "@lellimecnar/vitest-config@workspace:*"
pnpm --filter @card-stack/core add -D vitest @vitest/coverage-v8 "@lellimecnar/vitest-config@workspace:*"
pnpm --filter @card-stack/deck-standard add -D vitest @vitest/coverage-v8 "@lellimecnar/vitest-config@workspace:*"
```

#### Step 5.2: Create per-package `vitest.config.ts`

Create `packages/utils/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

import { vitestBaseConfig } from '@lellimecnar/vitest-config';

export default defineConfig(vitestBaseConfig());
```

Create `packages/polymix/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

import { vitestBaseConfig } from '@lellimecnar/vitest-config';

export default defineConfig(vitestBaseConfig());
```

Create `card-stack/core/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

import { vitestBaseConfig } from '@lellimecnar/vitest-config';

export default defineConfig(vitestBaseConfig());
```

Create `card-stack/deck-standard/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

import { vitestBaseConfig } from '@lellimecnar/vitest-config';

export default defineConfig(vitestBaseConfig());
```

#### Step 5.3: Update package scripts

Update these `package.json` scripts:

- [x] `packages/utils/package.json`
  - Replace scripts block with:

```json
	"scripts": {
		"build": "tsc -p tsconfig.build.json",
		"lint": "eslint .",
		"test": "vitest run",
		"test:watch": "vitest",
		"test:coverage": "vitest run --coverage",
		"type-check": "tsgo --noEmit"
	},
```

- [x] `packages/polymix/package.json`
  - Replace script entries:
    - `"test": "jest"` → `"test": "vitest run"`
    - Add:
      - `"test:watch": "vitest"`
      - `"test:coverage": "vitest run --coverage"`

- [x] `card-stack/core/package.json`
  - Replace:
    - `"test": "jest"` → `"test": "vitest run"`
    - `"test:watch": "jest --watch"` → `"test:watch": "vitest"`
  - Add:
    - `"test:coverage": "vitest run --coverage"`

- [x] `card-stack/deck-standard/package.json`
  - Replace:
    - `"test": "jest"` → `"test": "vitest run"`
    - `"test:watch": "jest --watch"` → `"test:watch": "vitest"`
  - Add:
    - `"test:coverage": "vitest run --coverage"`

#### Step 5.4: Remove Jest config files

- [x] Delete:
  - `packages/utils/jest.config.js`
  - `packages/polymix/jest.config.js`
  - `card-stack/core/jest.config.js`
  - `card-stack/deck-standard/jest.config.js`

#### Step 5.5: Update tests from `jest.*` → `vi.*`

For any tests that reference Jest APIs, apply these mechanical conversions:

- `jest.fn()` → `vi.fn()`
- `jest.spyOn()` → `vi.spyOn()`
- `jest.mock()` → `vi.mock()`
- `jest.useFakeTimers()` → `vi.useFakeTimers()`
- `jest.useRealTimers()` → `vi.useRealTimers()`
- `jest.requireActual()` → `await vi.importActual()`

#### Step 5 Verification Checklist

- [x] `pnpm --filter @lellimecnar/utils test`
- [x] `pnpm --filter polymix test`
- [x] `pnpm --filter @card-stack/core test`
- [x] `pnpm --filter @card-stack/deck-standard test`

#### Step 5 STOP & COMMIT

Present the following multiline conventional commit message in the chat:

```txt
feat(vitest): migrate core node packages off jest

Migrate core Node packages to Vitest (`@lellimecnar/utils`, `polymix`, `@card-stack/core`, `@card-stack/deck-standard`).
Add `vitest.config.ts`, update test scripts, remove Jest configs, and convert `jest.*` calls to `vi.*`.

completes: step 5 of 14 for tsgo-vite-vitest-migration
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 6: Migrate ui-spec packages from Jest → Vitest

Targets:

- `@ui-spec/core`
- `@ui-spec/react`
- `@ui-spec/router`
- `@ui-spec/router-react`
- `@ui-spec/validate-jsonschema`
- `@ui-spec/cli`

#### Step 6.1: Install dependencies

```bash
pnpm --filter @ui-spec/core add -D vitest @vitest/coverage-v8 "@lellimecnar/vitest-config@workspace:*"
pnpm --filter @ui-spec/react add -D vitest @vitest/coverage-v8 "@lellimecnar/vitest-config@workspace:*"
pnpm --filter @ui-spec/router add -D vitest @vitest/coverage-v8 "@lellimecnar/vitest-config@workspace:*"
pnpm --filter @ui-spec/router-react add -D vitest @vitest/coverage-v8 "@lellimecnar/vitest-config@workspace:*"
pnpm --filter @ui-spec/validate-jsonschema add -D vitest @vitest/coverage-v8 "@lellimecnar/vitest-config@workspace:*"
pnpm --filter @ui-spec/cli add -D vitest @vitest/coverage-v8 "@lellimecnar/vitest-config@workspace:*"
```

#### Step 6.2: Create per-package `vitest.config.ts`

For these Node-only packages:

- `@ui-spec/core`
- `@ui-spec/router`
- `@ui-spec/validate-jsonschema`
- `@ui-spec/cli`

Create `packages/ui-spec/core/vitest.config.ts` (repeat for each Node-only package listed above):

```ts
import { defineConfig } from 'vitest/config';

import { vitestBaseConfig } from '@lellimecnar/vitest-config';

export default defineConfig(vitestBaseConfig());
```

For these React/browser packages:

- `@ui-spec/react`
- `@ui-spec/router-react`

Install `happy-dom` in those packages:

```bash
pnpm --filter @ui-spec/react add -D happy-dom
pnpm --filter @ui-spec/router-react add -D happy-dom
```

Create `packages/ui-spec/react/vitest.config.ts` (repeat for `router-react`):

```ts
import { defineConfig } from 'vitest/config';

import { vitestBrowserConfigHappyDom } from '@lellimecnar/vitest-config/browser';

export default defineConfig(vitestBrowserConfigHappyDom());
```

#### Step 6.3: Update scripts and delete Jest configs

For each `packages/ui-spec/*/package.json` in this step:

- [x] Replace `"test": "jest"` with `"test": "vitest run"`
- [x] Add:
  - `"test:watch": "vitest"`
  - `"test:coverage": "vitest run --coverage"`
- [x] Delete `jest.config.js` and remove Jest-only devDependencies when safe (final cleanup happens in Step 13).

Delete these files:

- `packages/ui-spec/core/jest.config.js`
- `packages/ui-spec/react/jest.config.js`
- `packages/ui-spec/router/jest.config.js`
- `packages/ui-spec/router-react/jest.config.js`
- `packages/ui-spec/validate-jsonschema/jest.config.js`
- `packages/ui-spec/cli/jest.config.js`

#### Step 6 Verification Checklist

- [x] `pnpm --filter @ui-spec/core test`
- [x] `pnpm --filter @ui-spec/react test`
- [x] `pnpm --filter @ui-spec/router test`
- [x] `pnpm --filter @ui-spec/router-react test`
- [x] `pnpm --filter @ui-spec/validate-jsonschema test`
- [x] `pnpm --filter @ui-spec/cli test`

#### Step 6 STOP & COMMIT

Present the following multiline conventional commit message in the chat:

```txt
feat(vitest): migrate ui-spec packages off jest

Migrate `@ui-spec/*` packages from Jest to Vitest.
Add per-package `vitest.config.ts` (Node + browser/Happy DOM), update scripts, and remove Jest configs.

completes: step 6 of 14 for tsgo-vite-vitest-migration
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 7: Migrate web UI library (`@lellimecnar/ui`) tests from Jest → Vitest (browser)

#### Step 7.1: Install dependencies

```bash
pnpm --filter @lellimecnar/ui add -D vitest @vitest/coverage-v8 happy-dom "@lellimecnar/vitest-config@workspace:*"
```

#### Step 7.2: Create `packages/ui/vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';

import { vitestBrowserConfigHappyDom } from '@lellimecnar/vitest-config/browser';

const base = vitestBrowserConfigHappyDom();

export default defineConfig({
	...base,
	resolve: {
		alias: {
			'@/': new URL('./src/', import.meta.url).pathname,
		},
	},
});
```

#### Step 7.3: Remove Jest files and update setup

- [x] Delete `packages/ui/jest.config.js`
- [x] Delete `packages/ui/jest.setup.js`

> `@testing-library/jest-dom` is now loaded via `@lellimecnar/vitest-config` browser setup.

#### Step 7 Verification Checklist

- [x] `pnpm --filter @lellimecnar/ui test`

#### Step 7 STOP & COMMIT

Present the following multiline conventional commit message in the chat:

```txt
feat(vitest): migrate ui package tests

Switch `@lellimecnar/ui` tests from Jest to Vitest using the shared browser preset.
Add `vitest.config.ts` and remove Jest config/setup files.

completes: step 7 of 14 for tsgo-vite-vitest-migration
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 8: Migrate Next.js app tests from Jest → Vitest (browser)

Targets:

- `web/miller.pub`
- `web/readon.app`

#### Step 8.1: Install dependencies

```bash
pnpm --filter miller.pub add -D vitest @vitest/coverage-v8 happy-dom "@lellimecnar/vitest-config@workspace:*"
pnpm --filter readon.app add -D vitest @vitest/coverage-v8 happy-dom "@lellimecnar/vitest-config@workspace:*"
```

#### Step 8.2: Create per-app `vitest.config.ts`

Create `web/miller.pub/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

import { vitestBrowserConfigHappyDomNextAppRouter } from '@lellimecnar/vitest-config/browser';

const base = vitestBrowserConfigHappyDomNextAppRouter();

export default defineConfig({
	...base,
	resolve: {
		alias: {
			'@/': new URL('./src/', import.meta.url).pathname,
		},
	},
});
```

Create `web/readon.app/vitest.config.ts` with the same content.

#### Step 8.3: Remove Jest files and update scripts

- [x] Delete:
  - `web/miller.pub/jest.config.js`
  - `web/miller.pub/jest.setup.js`
  - `web/readon.app/jest.config.js`
  - `web/readon.app/jest.setup.js`

- [x] Update `package.json` scripts in both apps:
  - `test`: `vitest run`
  - `test:watch`: `vitest`
  - `test:coverage`: `vitest run --coverage`

#### Step 8 Verification Checklist

- [x] `pnpm --filter miller.pub test`
- [x] `pnpm --filter readon.app test`

#### Step 8 STOP & COMMIT

Present the following multiline conventional commit message in the chat:

```txt
feat(vitest): migrate next app tests

Migrate Next.js app tests (`miller.pub`, `readon.app`) from Jest to Vitest.
Add per-app `vitest.config.ts` with Next App Router mocks, update scripts, and remove Jest config/setup.

completes: step 8 of 14 for tsgo-vite-vitest-migration
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 9: Expo/RN tests: keep Jest (jest-expo), stop using ts-jest

This step confirms Expo/RN continues to use Jest and does not depend on `ts-jest`.

- [x] Ensure `mobile/readon` stays on `jest-expo` and continues to pass tests.
- [x] Ensure `packages/ui-nativewind` keeps `jest.config.cjs` and passes tests.

#### Step 9 Verification Checklist

- [x] `pnpm --filter readon test`
- [x] `pnpm --filter @lellimecnar/ui-nativewind test`

#### Step 9 STOP & COMMIT

Present the following multiline conventional commit message in the chat:

```txt
chore(rn): keep jest-expo tests intact

Keep Jest-based testing in Expo/RN workspaces (`mobile/readon`, `@lellimecnar/ui-nativewind`).
Confirm these workspaces remain compatible while the rest of the repo migrates to Vitest.

completes: step 9 of 14 for tsgo-vite-vitest-migration
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 10: Introduce Vite library builds for publishable TS packages (ESM-only)

This step adds per-package `vite.config.ts` files and updates package manifests so they produce real `dist/` JS + `.d.ts`.

> Important: Next.js apps and Expo/RN app do NOT switch build tooling.

#### Step 10.1: Convert `scripts/node` into a directory

There is currently an empty file at `scripts/node`. Replace it with a folder so we can add node scripts.

- [x] Delete the file `scripts/node`
- [x] Create folder `scripts/node/`

#### Step 10.2: Add dist-export verification script

Create `scripts/node/verify-dist-exports.mjs`:

```js
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

function readJson(filePath) {
	return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listWorkspacePackageJsons() {
	const candidates = [
		path.join(repoRoot, 'packages'),
		path.join(repoRoot, 'card-stack'),
	];

	const results = [];
	for (const baseDir of candidates) {
		if (!fs.existsSync(baseDir)) continue;
		for (const entry of fs.readdirSync(baseDir)) {
			const pkgDir = path.join(baseDir, entry);
			const pkgJson = path.join(pkgDir, 'package.json');
			if (fs.existsSync(pkgJson)) results.push(pkgJson);
		}
	}
	return results;
}

function assertFileExists(relativeToRepoRoot) {
	const abs = path.join(repoRoot, relativeToRepoRoot);
	if (!fs.existsSync(abs)) {
		throw new Error(`Missing file: ${relativeToRepoRoot}`);
	}
}

function collectExportTargets(exportsField, targets = new Set()) {
	if (!exportsField) return targets;
	if (typeof exportsField === 'string') {
		targets.add(exportsField);
		return targets;
	}
	if (Array.isArray(exportsField)) {
		for (const item of exportsField) collectExportTargets(item, targets);
		return targets;
	}
	if (typeof exportsField === 'object') {
		for (const value of Object.values(exportsField))
			collectExportTargets(value, targets);
		return targets;
	}
	return targets;
}

const packageJsonPaths = listWorkspacePackageJsons();

const problems = [];

for (const pkgJsonPath of packageJsonPaths) {
	const pkgDir = path.dirname(pkgJsonPath);
	const pkg = readJson(pkgJsonPath);

	// Only validate packages that claim to ship dist output.
	const distLike =
		String(pkg.main ?? '').startsWith('./dist/') ||
		String(pkg.types ?? '').startsWith('./dist/') ||
		JSON.stringify(pkg.exports ?? '').includes('./dist/');

	if (!distLike) continue;

	try {
		const relPkgDir = path.relative(repoRoot, pkgDir);

		if (pkg.main) assertFileExists(path.join(relPkgDir, pkg.main));
		if (pkg.types) assertFileExists(path.join(relPkgDir, pkg.types));

		const exportTargets = [...collectExportTargets(pkg.exports)];
		for (const t of exportTargets) {
			if (typeof t === 'string' && t.startsWith('./dist/')) {
				assertFileExists(path.join(relPkgDir, t));
			}
		}
	} catch (err) {
		problems.push({
			package: pkg.name ?? pkgJsonPath,
			error: err.message,
		});
	}
}

if (problems.length) {
	console.error('Export verification failed:');
	for (const p of problems) console.error(`- ${p.package}: ${p.error}`);
	process.exit(1);
}

console.log('Export verification passed.');
```

Add a root script in `package.json`:

```json
		"verify:exports": "node scripts/node/verify-dist-exports.mjs",
```

#### Step 10.3: Add Vite builds per package

This step makes these packages truly publishable by producing real `dist/**/*.js` and `dist/**/*.d.ts`.

Common rules (apply to every package in this step):

- Output format: ESM only.
- Preserve modules:
  - `preserveModules: true`
  - `preserveModulesRoot: 'src'`
  - `entryFileNames: '[name].js'` (ensures `.js` under `dist/`)
- Types: emitted to `dist/` using `vite-plugin-dts`.

##### Step 10.3.1: Install build dependencies

Run these commands:

```bash
pnpm --filter @lellimecnar/utils add -D vite vite-tsconfig-paths vite-plugin-dts @lellimecnar/vite-config
pnpm --filter polymix add -D vite vite-tsconfig-paths vite-plugin-dts @lellimecnar/vite-config
pnpm --filter @ui-spec/core add -D vite vite-tsconfig-paths vite-plugin-dts @lellimecnar/vite-config
pnpm --filter @ui-spec/router add -D vite vite-tsconfig-paths vite-plugin-dts @lellimecnar/vite-config
pnpm --filter @ui-spec/validate-jsonschema add -D vite vite-tsconfig-paths vite-plugin-dts @lellimecnar/vite-config
pnpm --filter @ui-spec/cli add -D vite vite-tsconfig-paths vite-plugin-dts @lellimecnar/vite-config
pnpm --filter @card-stack/core add -D vite vite-tsconfig-paths vite-plugin-dts @lellimecnar/vite-config
pnpm --filter @card-stack/deck-standard add -D vite vite-tsconfig-paths vite-plugin-dts @lellimecnar/vite-config

# React/JSX libraries also need the React plugin
pnpm --filter @ui-spec/react add -D vite vite-tsconfig-paths vite-plugin-dts @lellimecnar/vite-config @vitejs/plugin-react
pnpm --filter @ui-spec/router-react add -D vite vite-tsconfig-paths vite-plugin-dts @lellimecnar/vite-config @vitejs/plugin-react
```

##### Step 10.3.2: Create `vite.config.ts` per package

Create `packages/utils/vite.config.ts`:

```ts
import { createRequire } from 'node:module';
import { defineConfig, mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';

import { viteNodeConfig } from '@lellimecnar/vite-config/node';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const external = [
	...Object.keys(pkg.dependencies ?? {}),
	...Object.keys(pkg.peerDependencies ?? {}),
];

export default defineConfig(
	mergeConfig(viteNodeConfig(), {
		plugins: [
			dts({
				entryRoot: 'src',
				tsconfigPath: 'tsconfig.json',
				outDir: 'dist',
			}),
		],
		build: {
			outDir: 'dist',
			lib: {
				entry: 'src/index.ts',
				formats: ['es'],
			},
			rollupOptions: {
				external,
				output: {
					preserveModules: true,
					preserveModulesRoot: 'src',
					entryFileNames: '[name].js',
				},
			},
		},
	}),
);
```

Create `packages/polymix/vite.config.ts`:

```ts
import { createRequire } from 'node:module';
import { defineConfig, mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';

import { viteNodeConfig } from '@lellimecnar/vite-config/node';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const external = [
	...Object.keys(pkg.dependencies ?? {}),
	...Object.keys(pkg.peerDependencies ?? {}),
];

export default defineConfig(
	mergeConfig(viteNodeConfig(), {
		plugins: [
			dts({
				entryRoot: 'src',
				tsconfigPath: 'tsconfig.json',
				outDir: 'dist',
			}),
		],
		build: {
			outDir: 'dist',
			lib: {
				entry: 'src/index.ts',
				formats: ['es'],
			},
			rollupOptions: {
				external,
				output: {
					preserveModules: true,
					preserveModulesRoot: 'src',
					entryFileNames: '[name].js',
				},
			},
		},
	}),
);
```

Create `card-stack/core/vite.config.ts`:

```ts
import { createRequire } from 'node:module';
import { defineConfig, mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';

import { viteNodeConfig } from '@lellimecnar/vite-config/node';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const external = [
	...Object.keys(pkg.dependencies ?? {}),
	...Object.keys(pkg.peerDependencies ?? {}),
];

export default defineConfig(
	mergeConfig(viteNodeConfig(), {
		plugins: [
			dts({
				entryRoot: 'src',
				tsconfigPath: 'tsconfig.json',
				outDir: 'dist',
			}),
		],
		build: {
			outDir: 'dist',
			lib: {
				entry: 'src/index.ts',
				formats: ['es'],
			},
			rollupOptions: {
				external,
				output: {
					preserveModules: true,
					preserveModulesRoot: 'src',
					entryFileNames: '[name].js',
				},
			},
		},
	}),
);
```

Create `card-stack/deck-standard/vite.config.ts`:

```ts
import { createRequire } from 'node:module';
import { defineConfig, mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';

import { viteNodeConfig } from '@lellimecnar/vite-config/node';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const external = [
	...Object.keys(pkg.dependencies ?? {}),
	...Object.keys(pkg.peerDependencies ?? {}),
];

export default defineConfig(
	mergeConfig(viteNodeConfig(), {
		plugins: [
			dts({
				entryRoot: 'src',
				tsconfigPath: 'tsconfig.json',
				outDir: 'dist',
			}),
		],
		build: {
			outDir: 'dist',
			lib: {
				entry: 'src/index.ts',
				formats: ['es'],
			},
			rollupOptions: {
				external,
				output: {
					preserveModules: true,
					preserveModulesRoot: 'src',
					entryFileNames: '[name].js',
				},
			},
		},
	}),
);
```

Create `packages/ui-spec/core/vite.config.ts`:

```ts
import { createRequire } from 'node:module';
import { defineConfig, mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';

import { viteNodeConfig } from '@lellimecnar/vite-config/node';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const external = [
	...Object.keys(pkg.dependencies ?? {}),
	...Object.keys(pkg.peerDependencies ?? {}),
];

export default defineConfig(
	mergeConfig(viteNodeConfig(), {
		plugins: [
			dts({
				entryRoot: 'src',
				tsconfigPath: 'tsconfig.json',
				outDir: 'dist',
			}),
		],
		build: {
			outDir: 'dist',
			lib: {
				entry: 'src/index.ts',
				formats: ['es'],
			},
			rollupOptions: {
				external,
				output: {
					preserveModules: true,
					preserveModulesRoot: 'src',
					entryFileNames: '[name].js',
				},
			},
		},
	}),
);
```

Create `packages/ui-spec/router/vite.config.ts`:

```ts
import { createRequire } from 'node:module';
import { defineConfig, mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';

import { viteNodeConfig } from '@lellimecnar/vite-config/node';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const external = [
	...Object.keys(pkg.dependencies ?? {}),
	...Object.keys(pkg.peerDependencies ?? {}),
];

export default defineConfig(
	mergeConfig(viteNodeConfig(), {
		plugins: [
			dts({
				entryRoot: 'src',
				tsconfigPath: 'tsconfig.json',
				outDir: 'dist',
			}),
		],
		build: {
			outDir: 'dist',
			lib: {
				entry: 'src/index.ts',
				formats: ['es'],
			},
			rollupOptions: {
				external,
				output: {
					preserveModules: true,
					preserveModulesRoot: 'src',
					entryFileNames: '[name].js',
				},
			},
		},
	}),
);
```

Create `packages/ui-spec/validate-jsonschema/vite.config.ts`:

```ts
import { createRequire } from 'node:module';
import { defineConfig, mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';

import { viteNodeConfig } from '@lellimecnar/vite-config/node';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const external = [
	...Object.keys(pkg.dependencies ?? {}),
	...Object.keys(pkg.peerDependencies ?? {}),
];

export default defineConfig(
	mergeConfig(viteNodeConfig(), {
		plugins: [
			dts({
				entryRoot: 'src',
				tsconfigPath: 'tsconfig.json',
				outDir: 'dist',
			}),
		],
		build: {
			outDir: 'dist',
			lib: {
				entry: 'src/index.ts',
				formats: ['es'],
			},
			rollupOptions: {
				external,
				output: {
					preserveModules: true,
					preserveModulesRoot: 'src',
					entryFileNames: '[name].js',
				},
			},
		},
	}),
);
```

Create `packages/ui-spec/react/vite.config.ts`:

```ts
import { createRequire } from 'node:module';
import { defineConfig, mergeConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

import { viteNodeConfig } from '@lellimecnar/vite-config/node';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const external = [
	...Object.keys(pkg.dependencies ?? {}),
	...Object.keys(pkg.peerDependencies ?? {}),
];

export default defineConfig(
	mergeConfig(viteNodeConfig(), {
		plugins: [
			react(),
			dts({
				entryRoot: 'src',
				tsconfigPath: 'tsconfig.json',
				outDir: 'dist',
			}),
		],
		build: {
			outDir: 'dist',
			lib: {
				entry: 'src/index.ts',
				formats: ['es'],
			},
			rollupOptions: {
				external,
				output: {
					preserveModules: true,
					preserveModulesRoot: 'src',
					entryFileNames: '[name].js',
				},
			},
		},
	}),
);
```

Create `packages/ui-spec/router-react/vite.config.ts`:

```ts
import { createRequire } from 'node:module';
import { defineConfig, mergeConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

import { viteNodeConfig } from '@lellimecnar/vite-config/node';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const external = [
	...Object.keys(pkg.dependencies ?? {}),
	...Object.keys(pkg.peerDependencies ?? {}),
];

export default defineConfig(
	mergeConfig(viteNodeConfig(), {
		plugins: [
			react(),
			dts({
				entryRoot: 'src',
				tsconfigPath: 'tsconfig.json',
				outDir: 'dist',
			}),
		],
		build: {
			outDir: 'dist',
			lib: {
				entry: 'src/index.ts',
				formats: ['es'],
			},
			rollupOptions: {
				external,
				output: {
					preserveModules: true,
					preserveModulesRoot: 'src',
					entryFileNames: '[name].js',
				},
			},
		},
	}),
);
```

Create `packages/ui-spec/cli/vite.config.ts`:

```ts
import { createRequire } from 'node:module';
import { defineConfig, mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';

import { viteNodeConfig } from '@lellimecnar/vite-config/node';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const external = [
	...Object.keys(pkg.dependencies ?? {}),
	...Object.keys(pkg.peerDependencies ?? {}),
];

export default defineConfig(
	mergeConfig(viteNodeConfig(), {
		plugins: [
			dts({
				entryRoot: 'src',
				tsconfigPath: 'tsconfig.json',
				outDir: 'dist',
			}),
		],
		build: {
			outDir: 'dist',
			lib: {
				entry: 'src/index.ts',
				formats: ['es'],
			},
			rollupOptions: {
				external,
				output: {
					preserveModules: true,
					preserveModulesRoot: 'src',
					entryFileNames: '[name].js',
				},
			},
		},
	}),
);
```

##### Step 10.3.3: Update package manifests and scripts (ESM-only)

Update each package’s `package.json` as follows.

`packages/utils/package.json`:

- [x] Add: `"type": "module"`
- [x] Add/replace `exports`:

```json
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"default": "./dist/index.js"
		}
	},
```

- [x] Replace `build` script with `"build": "vite build"`

`packages/polymix/package.json`:

- [x] Add: `"type": "module"`
- [x] Remove `exports.require` and keep ESM-only:

```json
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"default": "./dist/index.js"
		}
	},
```

- [x] Replace `build` with `"build": "pnpm run clean && vite build"`
- [x] Replace `dev` with `"dev": "vite build --watch"`

`card-stack/core/package.json`:

- [x] Replace `exports`, `main`, and `types` to point to `dist/` instead of `src/`:

```json
	"type": "module",
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"default": "./dist/index.js"
		}
	},
	"main": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"files": ["dist"],
```

- [x] Add `"build": "vite build"`

`card-stack/deck-standard/package.json`:

- [x] Add: `"type": "module"`
- [x] Ensure `build` exists and points to `vite build`.

`packages/ui-spec/*/package.json` (all packages in this step):

- [x] Add: `"type": "module"`
- [x] Replace `"build": "tsc -p tsconfig.json"` with `"build": "vite build"`

`packages/ui-spec/cli/package.json` (CLI-specific additions):

- [x] Create `packages/ui-spec/cli/bin/uispec.js`:

```js
#!/usr/bin/env node
import '../index.js';
```

- [x] Make it executable:

```bash
chmod +x packages/ui-spec/cli/bin/uispec.js
```

- [x] Add a postbuild to copy `bin/` into dist:

```json
	"scripts": {
		"build": "vite build",
		"postbuild": "node -e \"require('node:fs').cpSync('bin', 'dist/bin', { recursive: true })\"",
		...
	},
```

- [x] Point `bin` at the copied shim:

```json
	"bin": {
		"uispec": "./dist/bin/uispec.js"
	},
```

#### Step 10 Verification Checklist

- [x] `pnpm -w build`
- [x] `pnpm -w verify:exports`

#### Step 10 STOP & COMMIT

Present the following multiline conventional commit message in the chat:

```txt
feat(vite): add library builds and export verification

Introduce Vite-based library builds for publishable TypeScript packages (ESM-only outputs).
Add export verification tooling and per-package `vite.config.ts` to produce `dist/**/*.js` and `dist/**/*.d.ts`.

completes: step 10 of 14 for tsgo-vite-vitest-migration
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 11: Fix “build-gap” packages to ensure dist outputs exist

This step is a safety net. If Step 10 was applied exactly as written, these “build gap” cases should already be fixed.

Targets called out in the plan:

- `packages/utils` (currently emits declarations only)
- `card-stack/core` (currently exports TS source)
- `card-stack/deck-standard` (currently claims dist but has no build)

#### Step 11 Verification Checklist

- [x] `pnpm -w build`
- [x] `pnpm -w verify:exports`

#### Step 11 STOP & COMMIT

Present the following multiline conventional commit message in the chat:

```txt
fix(build): ensure publishable packages emit dist outputs

Fix remaining "build-gap" packages so publishable workspaces emit real `dist/` outputs.
Align build scripts and package exports with the Vite-based library build convention.

completes: step 11 of 14 for tsgo-vite-vitest-migration
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 12: Update Turborepo test pipeline to Vitest-era inputs

This step finalizes Turborepo inputs to prefer Vitest-era configs.

- [x] Replace `turbo.json` with the following full content:

- [x] Update root `package.json` test scripts to be Vitest/Turbo compatible:
  - [x] Replace `test` with: `turbo test -- --passWithNoTests`
  - [x] Replace `test:coverage` with: `turbo test:coverage`

```json
{
	"$schema": "https://turbo.build/schema.json",
	"tasks": {
		"build": {
			"dependsOn": ["^build"],
			"inputs": ["$TURBO_DEFAULT$", ".env*"],
			"outputs": ["dist/**", ".next/**", "!.next/cache/**"],
			"env": ["NODE_ENV", "ANALYZE"]
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
			"inputs": ["$TURBO_DEFAULT$", "vitest.config.*", "vite.config.*"]
		},
		"test:ci": {
			"dependsOn": ["^build"],
			"outputs": ["coverage/**"],
			"inputs": ["$TURBO_DEFAULT$", "vitest.config.*", "vite.config.*"],
			"env": ["CI"]
		},
		"lint": {
			"dependsOn": ["^build"],
			"env": ["NODE_ENV", "ANALYZE"]
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

#### Step 12 Verification Checklist

- [x] `pnpm -w test`
- [x] `pnpm -w test:coverage`

#### Step 12 STOP & COMMIT

Present the following multiline conventional commit message in the chat:

```txt
chore(turbo): switch test cache inputs to vitest

Update `turbo.json` test task inputs to the Vitest-era configuration.
Remove Jest-era cache inputs now that the migration is complete.

completes: step 12 of 14 for tsgo-vite-vitest-migration
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 13: Remove Jest + ts-jest tooling and clean up configs

This step removes Jest tooling from packages that migrated to Vitest, while keeping Jest only where required (Expo/RN).

- [ ] Remove `jest` and `ts-jest` from root and from any Vitest-migrated package devDependencies.
- [ ] Keep `jest-expo`, `babel-jest`, and `@lellimecnar/jest-config` only for Expo/RN workspaces.
- [ ] Delete `packages/config-jest` only if no remaining consumers exist outside Expo/RN.

Delete (where migrated to Vitest):

- [ ] Any remaining `**/jest.config.*`
- [ ] Any remaining `jest.setup.js` that was replaced

#### Step 13 Verification Checklist

- [ ] `pnpm -w test`
- [ ] `pnpm -w type-check`
- [ ] `pnpm -w build`

#### Step 13 STOP & COMMIT

Present the following multiline conventional commit message in the chat:

```txt
chore(jest): remove jest tooling from vitest packages

Remove Jest and ts-jest dependencies from workspaces that migrated to Vitest.
Keep Jest tooling only where required for Expo/RN, and delete migrated Jest configs.

completes: step 13 of 14 for tsgo-vite-vitest-migration
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

### Step 14: Final validation + documentation updates

Update documentation to reflect:

- Vitest as the test runner (except Expo/RN)
- `tsgo` as the type-check engine
- Vite for library builds only (Next builds unchanged)

Files to update if they mention Jest/type-check tooling:

- `AGENTS.md`
- `docs/TESTING.md`
- `docs/DEPENDENCY_MANAGEMENT.md`

#### Step 14 Verification Checklist

- [ ] `pnpm -w lint`
- [ ] `pnpm -w test`
- [ ] `pnpm -w build`
- [ ] `pnpm -w type-check`

#### Step 14 STOP & COMMIT

Present the following multiline conventional commit message in the chat:

```txt
docs(tooling): document tsgo + vite + vitest

Update docs to reflect Vitest as the default test runner (except Expo/RN).
Document `tsgo` for type-checking and Vite for publishable library builds only.

completes: step 14 of 14 for tsgo-vite-vitest-migration
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.
