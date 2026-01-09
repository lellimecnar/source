<!-- markdownlint-disable-file -->

# Task Research Notes: DataMap Package Implementation

## Research Executed

### File Analysis

- package.json
  - Root scripts use Turbo (`build`, `test`, `type-check`, etc.), and toolchain versions include Node `^24.12.0`, pnpm `9.12.2`, Vite/Vitest, TypeScript `~5.5`, and `@typescript/native-preview`.
- pnpm-workspace.yaml
  - Already includes `packages/data-map/*` (so the plan’s “update workspace globs” step is already satisfied).
- vitest.config.ts
  - Root Vitest `test.projects` already includes `packages/data-map/*/vitest.config.ts`.
- turbo.json
  - Turbo tasks define `build/test/test:coverage/lint/type-check` dependency structure (most depend on `^build`).
- AGENTS.md
  - Documents repo-wide commands; states `tsgo` is used for type-checking.
- plans/data-map/plan.md
  - DataMap plan explicitly depends on `@jsonpath/*` and `mnemonist` and lists package dependency graph.
- docs/api/jsonpath.md
  - Documents the JSONPath suite packages and import patterns.
- packages/config-vite/base.ts
  - Shared Vite base config includes `vite-tsconfig-paths`.
- packages/config-vitest/base.ts
  - Shared Vitest base config includes `vite-tsconfig-paths` and sets reporters/coverage defaults.
- packages/utils/package.json
  - Representative “publishable TS library” package.json pattern (ESM, exports, Vite build, `tsgo --noEmit`).
- packages/utils/tsconfig.json
  - Representative TS config that includes `paths` mappings (including `"*": ["./*"]` and `"@/*": ["./src/*"]`) and extends `@lellimecnar/typescript-config/react.json`.
- packages/utils/vite.config.ts
  - Canonical Vite lib-mode build config (Rollup `preserveModules` + `vite-plugin-dts`, plus explicit `external` based on package dependencies).
- packages/utils/vitest.config.ts
  - Canonical per-package Vitest config: `defineConfig(vitestBaseConfig())`.
- packages/jsonpath/core/package.json
  - Canonical test scripts (`vitest run`, coverage, watch) and Vite build scripts.
- packages/jsonpath/core/tsconfig.json
  - Canonical Node-ish TS library config extending `@lellimecnar/typescript-config/base.json`.
- packages/jsonpath/core/.eslintrc.cjs
  - Canonical ESLint config extending `@lellimecnar/eslint-config/node`.
- packages/jsonpath/benchmarks/package.json
  - Example of benchmark scripts implemented as `vitest bench`.

### Code Search Results

- mnemonist|TrieMap|LRUCache
  - Found in specs/data-map.md and plans/data-map/plan.md (design/plan references).
- "mnemonist" in packages/data-map/\*/package.json
  - Found in:
    - packages/data-map/subscriptions/package.json (dependency: mnemonist)
    - packages/data-map/path/package.json (dependency: mnemonist)
- mnemonist in pnpm-lock.yaml
  - Present (e.g. mnemonist@0.39.8).
- packages/data-map directory inventory
  - packages/data-map/\* exists (DataMap packages are present in this repo).

### External Research

- #fetch:https://yomguithereal.github.io/mnemonist/trie-map
  - Confirms TrieMap API: `new TrieMap()` or `new TrieMap(Array)`, `.set`, `.update`, `.delete`, `.clear`, `.get`, `.has`, `.find`, iterators.
- #fetch:https://yomguithereal.github.io/mnemonist/lru-cache
  - Confirms LRUCache API: `new LRUCache(capacity)`, `.set`, `.get`, `.peek`, `.has`, `.clear`, `.setpop`; deletion methods exist only on `LRUCacheWithDelete`.
- #fetch:https://vite.dev/guide/build.html#library-mode
  - Confirms Vite library mode is configured via `build.lib` and recommends externalizing deps via `build.rollupOptions.external`.
- #fetch:https://vitest.dev/guide/workspace.html
  - Confirms the “workspace/projects” approach using `test.projects` globs, and that root-level config influences global options (e.g., reporters/coverage).

### Project Conventions

- Standards referenced: pnpm workspaces + Turborepo orchestration; Vite for publishable library builds; Vitest multi-project setup; `tsgo` (`@typescript/native-preview`) for type-checking.
- Instructions followed: use `workspace:*`/`workspace:^` for internal deps; reuse shared config packages rather than duplicating tool configuration.

## Key Discoveries

### Project Structure

- Monorepo wiring for DataMap already exists:
  - pnpm workspaces include `packages/data-map/*` (pnpm-workspace.yaml).
  - Vitest root includes `packages/data-map/*/vitest.config.ts` (vitest.config.ts).
  - Turbo root scripts run workspace `build/test/type-check` via `turbo` (package.json).
- `packages/data-map/` exists (DataMap workspaces are present).

### Implementation Patterns

- “Publishable TS library” template is consistent across packages:
  - ESM (`"type": "module"`), `exports["."]` points at `dist/index.js` and `dist/index.d.ts`.
  - Vite library build with Rollup `preserveModules` and `vite-plugin-dts` output to `dist`.
  - Per-package Vitest config imports `vitestBaseConfig()` (which includes `vite-tsconfig-paths` for TS path aliasing).
  - ESLint config is local per-package and extends shared `@lellimecnar/eslint-config/*` presets.

- Type checking pattern:
  - Packages use `"type-check": "tsgo --noEmit"` (representative package.json files).
  - Root runs `pnpm type-check` → `turbo type-check` (package.json, AGENTS.md).

### Complete Examples

```json
{
	"name": "@data-map/core",
	"version": "0.1.0",
	"description": "DataMap core implementation",
	"license": "MIT",
	"sideEffects": false,
	"type": "module",
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"default": "./dist/index.js"
		}
	},
	"main": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"files": ["dist", "README.md"],
	"scripts": {
		"build": "vite build",
		"dev": "vite build --watch",
		"lint": "eslint .",
		"test": "vitest run",
		"test:coverage": "vitest run --coverage",
		"test:watch": "vitest",
		"type-check": "tsgo --noEmit"
	},
	"dependencies": {
		"@jsonpath/pointer": "workspace:*"
	},
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@lellimecnar/vite-config": "workspace:^",
		"@lellimecnar/vitest-config": "workspace:*",
		"@types/node": "^24",
		"@vitest/coverage-v8": "^4.0.16",
		"eslint": "^8.57.1",
		"typescript": "~5.5",
		"vite": "^7.3.0",
		"vite-plugin-dts": "^4.5.4",
		"vite-tsconfig-paths": "^6.0.3",
		"vitest": "^4.0.16"
	}
}
```

```typescript
import { createRequire } from 'node:module';
import { defineConfig, mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';

import { viteNodeConfig } from '@lellimecnar/vite-config/node';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const externalDeps = [
	...Object.keys(pkg.dependencies ?? {}),
	...Object.keys(pkg.peerDependencies ?? {}),
];

const external = (id: string) =>
	id.startsWith('node:') ||
	externalDeps.some((dep: string) => id === dep || id.startsWith(`${dep}/`));

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

### API and Schema Documentation

- DataMap feature + package graph: plans/data-map/plan.md
- JSONPath suite API + import patterns: docs/api/jsonpath.md
- Mnemonist APIs:
  - TrieMap: https://yomguithereal.github.io/mnemonist/trie-map
  - LRUCache: https://yomguithereal.github.io/mnemonist/lru-cache

### Configuration Examples

```typescript
import { defineConfig } from 'vitest/config';

import { vitestBaseConfig } from '@lellimecnar/vitest-config';

export default defineConfig(vitestBaseConfig());
```

```javascript
module.exports = {
	extends: ['@lellimecnar/eslint-config/node'],
	parserOptions: {
		project: './tsconfig.json',
		tsconfigRootDir: __dirname,
	},
};
```

### Technical Requirements

- Mnemonist is required and present:
  - Declared in DataMap package dependencies (e.g. path + subscriptions).
  - Present in pnpm-lock.yaml.
- Mnemonist API nuance:
  - `LRUCache` does not support deletion; deletions are on `LRUCacheWithDelete`.
- Plan vs repo state mismatch to account for:
  - plans/data-map/plan.md Step 1 suggests updating `pnpm-workspace.yaml` and root scripts; those are already configured (pnpm-workspace.yaml, package.json, vitest.config.ts).

## Recommended Approach

Follow existing package conventions (model after packages/jsonpath/core and packages/utils) for each new `@data-map/*` workspace:

- Use `@lellimecnar/vite-config/node` + `vite-plugin-dts` + Rollup `preserveModules` for builds.
- Use `vitestBaseConfig()` for tests, relying on shared `vite-tsconfig-paths` behavior for TS path aliases.
- Use `@lellimecnar/typescript-config/base.json` for non-React packages; only use React-oriented TS configs when JSX/React types are actually needed.
- Mnemonist is already used via CJS entrypoints (e.g. `mnemonist/trie-map.js`) with a default import in TypeScript; keep new usage consistent with the existing pattern.

## Implementation Guidance

- **Objectives**: Keep existing `packages/data-map/*` workspaces aligned with Turbo/Vite/Vitest conventions.
- **Key Tasks**: Apply the canonical per-package config patterns consistently across existing DataMap workspaces.
- **Dependencies**: `@jsonpath/*` workspaces + `mnemonist` (external) + shared config packages (`@lellimecnar/*-config`).
- **Success Criteria**: `pnpm build`, `pnpm test`, and `pnpm type-check` automatically include the new DataMap workspaces without additional root config changes.
  <!-- NOTE: Removed a duplicated second copy of this document to avoid stale/contradictory guidance. -->
      "name": "@data-map/core",
      "version": "0.1.0",
      "description": "DataMap core implementation",
      "license": "MIT",
      "sideEffects": false,
      "type": "module",
      "exports": {
      	".": {
      		"types": "./dist/index.d.ts",
      		"default": "./dist/index.js"
      	}
      },
      "main": "./dist/index.js",
      "types": "./dist/index.d.ts",
      "files": ["dist", "README.md"],
      "scripts": {
      	"build": "vite build",
      	"dev": "vite build --watch",
      	"lint": "eslint .",
      	"test": "vitest run",
      	"test:coverage": "vitest run --coverage",
      	"test:watch": "vitest",
      	"type-check": "tsgo --noEmit"
      },
      "dependencies": {
      	"@jsonpath/pointer": "workspace:*"
      },
      "devDependencies": {
      	"@lellimecnar/eslint-config": "workspace:*",
      	"@lellimecnar/typescript-config": "workspace:*",
      	"@lellimecnar/vite-config": "workspace:^",
      	"@lellimecnar/vitest-config": "workspace:*",
      	"@types/node": "^24",
      	"@vitest/coverage-v8": "^4.0.16",
      	"eslint": "^8.57.1",
      	"typescript": "~5.5",
      	"vite": "^7.3.0",
      	"vite-plugin-dts": "^4.5.4",
      	"vite-tsconfig-paths": "^6.0.3",
      	"vitest": "^4.0.16"
      }
  }

````

```jsonc
// Canonical tsconfig.json (modeled after packages/jsonpath/core/tsconfig.json)
{
	"extends": "@lellimecnar/typescript-config/base.json",
	"compilerOptions": {
		"outDir": "./dist",
		"rootDir": "./src",
		"paths": {
			"*": ["./*"],
		},
	},
	"include": ["src/**/*.ts"],
	"exclude": ["node_modules", "dist", "**/*.spec.ts", "**/__tests__"],
}
````

```typescript
// Canonical vite.config.ts (exact pattern used in packages/utils/vite.config.ts)
import { createRequire } from 'node:module';
import { defineConfig, mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';

import { viteNodeConfig } from '@lellimecnar/vite-config/node';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const externalDeps = [
	...Object.keys(pkg.dependencies ?? {}),
	...Object.keys(pkg.peerDependencies ?? {}),
];

const external = (id: string) =>
	id.startsWith('node:') ||
	externalDeps.some((dep: string) => id === dep || id.startsWith(`${dep}/`));

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

### API and Schema Documentation

- DataMap spec and plan:
  - specs/data-map.md
  - plans/data-map/plan.md
- Mnemonist APIs used by DataMap:
  - TrieMap: https://yomguithereal.github.io/mnemonist/trie-map
  - LRUCache: https://yomguithereal.github.io/mnemonist/lru-cache
- Tooling docs relevant to the monorepo’s chosen build/test structure:
  - Vite library mode: https://vite.dev/guide/build.html#library-mode
  - Vitest “projects/workspace”: https://vitest.dev/guide/workspace.html

### Configuration Examples

```typescript
// Canonical vitest.config.ts (exact pattern used in packages/utils/vitest.config.ts)
import { defineConfig } from 'vitest/config';

import { vitestBaseConfig } from '@lellimecnar/vitest-config';

export default defineConfig(vitestBaseConfig());
```

```javascript
// Canonical .eslintrc.cjs (exact pattern used in packages/jsonpath/core/.eslintrc.cjs)
module.exports = {
	extends: ['@lellimecnar/eslint-config/node'],
	parserOptions: {
		project: './tsconfig.json',
		tsconfigRootDir: __dirname,
	},
};
```

### Technical Requirements

- Mnemonist is required by the DataMap plan/spec, but is not currently installed:
  - No package.json declares it.
  - pnpm-lock.yaml does not include it.
- Mnemonist API nuance that impacts design choices:
  - `LRUCache` does not support deletions; deletions require `LRUCacheWithDelete`.
- Path aliasing for tests/build relies on `vite-tsconfig-paths` in shared configs:
  - packages/config-vite/base.ts and packages/config-vitest/base.ts.
- Turbo execution model impacts CI/dev ergonomics:
  - `build/test/test:coverage/lint/type-check` all depend on `^build` (turbo.json).
  - Benchmarks are modeled as Turbo tasks too (turbo.json) and commonly implemented via `vitest bench` (packages/jsonpath/benchmarks/package.json).

## Recommended Approach

Implement new `@data-map/*` packages by copying the established “publishable TS library” pattern used across `packages/jsonpath/*`:

- Use Vite library mode + `vite-plugin-dts`, preserving modules (packages/utils/vite.config.ts).
- Use `vitestBaseConfig()` for per-package test setup (packages/utils/vitest.config.ts) so aliases (`paths`) work via `vite-tsconfig-paths` (packages/config-vitest/base.ts).
- Use `@lellimecnar/typescript-config/base.json` for non-React packages (packages/jsonpath/core/tsconfig.json). If/when a DataMap package needs React/JSX, mirror the React-leaning TS config approach used in packages/utils/tsconfig.json.
- Add Mnemonist as an explicit dependency where needed (per DataMap plan), and validate ESM import style in a unit test because Mnemonist docs primarily show `require(...)` usage.

## Implementation Guidance

- **Objectives**: Align new DataMap packages with monorepo tooling and patterns (Vite lib builds, Vitest multi-project testing, `tsgo` type-checking) so Turbo can build/test/type-check them without special cases.
- **Key Tasks**:
  - Create `packages/data-map/<package>/` structure (pnpm-workspace.yaml and vitest.config.ts already expect it).
  - Add Mnemonist dependency where required; prefer importing specific modules (`mnemonist/trie-map`, `mnemonist/lru-cache`) to keep usage consistent with Mnemonist’s modular docs.
  - Implement minimal `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `.eslintrc.cjs` following existing package patterns.
- **Dependencies**: `@lellimecnar/vite-config`, `@lellimecnar/vitest-config`, `@lellimecnar/typescript-config`, `@lellimecnar/eslint-config`, plus `mnemonist` and relevant `@jsonpath/*` workspaces.
- **Success Criteria**:
  - `pnpm build`, `pnpm test`, `pnpm type-check` include DataMap packages without extra configuration (package.json, vitest.config.ts, pnpm-workspace.yaml).
  - Mnemonist TrieMap/LRUCache imports compile and run in a package unit test.

<!-- ARCHIVED OLD CONTENT (pre-cleanup). Tooling in this environment does not support deleting large file tails; ignore everything below. DO NOT UPDATE BELOW THIS LINE.

```typescript
interface FlatStore {
  // Core storage - Map<pointer, value>
  data: Map<string, unknown>;
  
  // Array metadata tracking
  arrayMeta: Map<string, ArrayMetadata>;
  
  // Version tracking for structural sharing
  version: number;
  versions: Map<string, number>;
}

// Flatten nested object to pointer-keyed map
const nested = { users: [{ name: 'Alice' }] };
const flat = new Map([
  ['/users/0/name', 'Alice'],
]);
```

### Subscription Engine Pattern

From spec section 4.1-4.4:

```typescript
// Subscription types
type SubscriptionPattern = 
  | { type: 'exact'; pointer: string }
  | { type: 'pattern'; path: string; compiled: CompiledPattern }
  | { type: 'query'; path: string; ast: JSONPathAST };

// TrieMap integration for O(m) exact matching
import { TrieMap } from 'mnemonist/trie-map';

class SubscriptionEngine {
  private exactTrie: TrieMap<Set<Subscription>>;
  private wildcardMatchers: Map<string, { pattern: CompiledPattern; subscriptions: Set<Subscription> }>;
  private recursivePatterns: Map<string, Set<Subscription>>;
}
```

### Array Optimization Strategies

From spec section 6.1-6.6:

1. **Indirection Layer** (Recommended): Logical → physical index mapping
   - O(1) mutations without pointer churn
   - Free slot reuse for memory efficiency

2. **Gap Buffer**: For sequential push/pop workloads
   - Amortized O(1) for sequential access patterns

3. **Persistent Vector**: For immutable updates (optional)
   - 32-wide branching tree, O(log32 n) operations

4. **Smart Strategy Selection**:
   - Small arrays (<100): Direct native arrays
   - Large mutable: Indirection layer
   - Immutable mode: Persistent vector

### Configuration Files Needed

Each package requires:
1. `package.json` - Package manifest
2. `tsconfig.json` - TypeScript config (extends base)
3. `vite.config.ts` - Vite build config
4. `vitest.config.ts` - Test config (optional if using base)
5. `src/index.ts` - Entry point with exports
6. `README.md` - Package documentation

## Recommended Approach

### Implementation Order

1. **Phase 1 - Foundation (Zero Dependencies)**
   - `@data-map/signals` - Pure TypeScript signal implementation
   - `@data-map/storage` - FlatStore with JSON Pointer integration

2. **Phase 2 - Core Infrastructure**
   - `@data-map/subscriptions` - Pattern matching with mnemonist TrieMap
   - `@data-map/arrays` - Optimized array strategies

3. **Phase 3 - Bridge Layer**
   - `@data-map/computed` - Connect signals to storage paths

4. **Phase 4 - Integration**
   - `@data-map/core` - Unified DataMap API facade

5. **Phase 5 - Framework Bindings**
   - `@data-map/react` - Hooks for React 18+
   - `@data-map/vue` - Composables for Vue 3

6. **Phase 6 - Developer Experience**
   - `@data-map/devtools` - Inspection and debugging

### Critical Implementation Notes

1. **Add mnemonist dependency**: Not currently in monorepo, needs to be added to relevant packages

2. **Signal Implementation**: Build custom, don't import external - keeps bundle small and control complete

3. **Pointer API Alignment**: `@jsonpath/pointer` already has `resolve()` alias for DataMap compatibility

4. **Test Strategy**: Use vitest with ~90% coverage target per package

5. **Build Order**: Respect `^build` dependency in turbo.json - lower-level packages must build first

## Implementation Guidance

### Objectives
- Implement all 11 packages under `packages/data-map/*`
- O(1) access/mutation via flat storage with JSON Pointer keys
- Signal-based reactivity with automatic dependency tracking
- Pattern subscriptions via TrieMap and compiled patterns
- Framework bindings for React, Vue, Solid

### Key Tasks

1. Create folder structure for all packages
2. Generate package.json, tsconfig.json, vite.config.ts for each
3. Implement in dependency order (signals/storage first)
4. Add mnemonist as dependency to @data-map/subscriptions
5. Integrate with @jsonpath/* for pointer/query operations
6. Build framework adapters as peer-dependent packages

### Dependencies Identified

**Internal (workspace:*)**:
- `@jsonpath/pointer` - Core pointer operations
- `@jsonpath/jsonpath` - Query evaluation
- `@jsonpath/patch` - Patch operations
- `@jsonpath/core` - Shared types

**External (needs addition)**:
- `mnemonist` ^0.39.0 - TrieMap, LRUCache

**Peer Dependencies**:
- `react` ^18.0.0 || ^19.0.0
- `vue` ^3.3.0
- `solid-js` ^1.8.0
- `immutable` ^4.3.0 (optional)

### Success Criteria

- All 11 packages buildable with `turbo build`
