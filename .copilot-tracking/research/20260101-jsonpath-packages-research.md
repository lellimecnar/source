<!-- markdownlint-disable-file -->

# Task Research Notes: jsonpath monorepo packages (pnpm + turbo)

## Research Executed

### File Analysis

- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/package.json
  - Root scripts use Turborepo tasks; `test` runs `turbo test -- --passWithNoTests`.
- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/turbo.json
  - `test` has no `dependsOn`; `test:coverage` depends on `^build` and includes `vitest.config.*`/`vite.config.*` as inputs.
- /Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/vitest.config.ts
  - Vitest multi-project runner points at per-package `vitest.config.ts` files, including `packages/jsonpath/*/vitest.config.ts`.

- packages/jsonpath/core/src/createEngine.ts
  - Engine wires scanner+parser + registries; plugin lifecycle hooks for token/AST transforms, evaluate middleware, error enrichers.
- packages/jsonpath/core/src/plugins/types.ts
  - Plugin contract: `meta` includes `id`, optional `capabilities`, `dependsOn`, `optionalDependsOn`, `peerDependencies`; `setup(ctx)` registers hooks/evaluators.
- packages/jsonpath/core/src/plugins/order.ts
  - Canonical deterministic ordering by `meta.id`.
- packages/jsonpath/core/src/plugins/resolve.ts
  - Deterministic resolution: de-dupe IDs, validate deps, topo-sort with deterministic tie-break, detect cycles, detect capability conflicts.
- packages/jsonpath/core/src/index.ts
  - Public API: exports `createEngine`, plugin types + resolver, lifecycle hook types, runtime types.

- packages/jsonpath/plugin-rfc-9535/src/index.ts
  - Preset wiring: `rfc9535Plugins` list + `createRfc9535Engine()` with profile config; exports a no-op “preset plugin” with capability `preset:rfc9535`.

- packages/jsonpath/conformance/src/corpus.ts
  - Defines small internal JSON docs + test cases across profiles; some cases intentionally expected to fail (TODO markers).
- packages/jsonpath/conformance/src/harness.ts
  - Harness runs case by compiling query, executing engine, optionally mapping `resultType`.
- packages/jsonpath/conformance/src/cts.ts
  - Loads upstream CTS JSON via ESM `assert { type: 'json' }` import (installed via `napa`).
- packages/jsonpath/conformance/src/index.ts
  - Re-exports corpus + harness.
- packages/jsonpath/conformance/src/ecosystem-smoke.spec.ts
  - Vitest smoke: imports many @jsonpath packages and does a small end-to-end query.

- packages/jsonpath/complete/src/index.ts
  - “Complete” bundle: `completePlugins = [...rfc9535Plugins, ...extraPlugins]`; exports `createCompleteEngine()`.
- packages/jsonpath/cli/src/run.ts
  - CLI reads JSON config from disk, creates complete engine, evaluates sync.
- packages/jsonpath/compat-jsonpath/src/index.ts
  - Compatibility layer for `jsonpath` (dchester): exposes `query/paths/nodes/value/parent/apply` wrappers.
- packages/jsonpath/compat-jsonpath-plus/src/index.ts
  - Compatibility layer for `jsonpath-plus`: exports `JSONPath()` and helpers; computes `path`/`pointer`/`parent`/etc from engine nodes.
- packages/jsonpath/compat-harness/src/compat.spec.ts
  - Vitest compares pointer enumeration against upstream `jsonpath-plus`.

- Package configuration samples (package.json/tsconfig/vite/vitest)
  - packages/jsonpath/core/package.json, tsconfig.json, vite.config.ts, vitest.config.ts
  - packages/jsonpath/plugin-rfc-9535/package.json
  - packages/jsonpath/complete/package.json
  - packages/jsonpath/conformance/package.json, tsconfig.json, vite.config.ts
  - packages/jsonpath/cli/package.json, tsconfig.json, vite.config.ts
  - packages/jsonpath/compat-jsonpath/package.json
  - packages/jsonpath/compat-jsonpath-plus/package.json
  - packages/jsonpath/compat-harness/package.json

- Shared config packages
  - packages/config-vitest/base.ts
  - packages/config-vite/base.ts
  - packages/config-vite/node.ts

- Comparable publishable packages for pattern validation
  - packages/utils/package.json, tsconfig.json, vite.config.ts
  - packages/polymix/package.json, tsconfig.json, vite.config.ts
  - packages/card-stack/core/package.json, tsconfig.json, vite.config.ts

### Code Search Results

- passWithNoTests
  - Root `package.json` passes `--passWithNoTests` to `turbo test`.
  - `@lellimecnar/vitest-config` sets `test.passWithNoTests: true` in `vitestBaseConfig()`.
  - Some workspaces (e.g. React Native) use Jest and also rely on pass-with-no-tests behavior.

### External Research

- None (all findings are from workspace source/config).

### Project Conventions

- Standards referenced: Turborepo tasks (`turbo.json`), per-package Vite library builds with preserved modules, per-package Vitest project configs.
- Instructions followed: Research-only (no code changes); workspace conventions from root scripts + `@lellimecnar/*-config` packages.

## Key Discoveries

### Project Structure

- `packages/jsonpath/*` are mostly small, publishable ESM packages.
- Each jsonpath workspace typically includes:
  - `package.json` with `type: "module"`, `exports` mapping `"."` to `./dist/index.js` and `./dist/index.d.ts`, and `files: ["dist"]`.
  - `tsconfig.json` extending `@lellimecnar/typescript-config`, with `outDir: ./dist`, `rootDir: ./src`, and `moduleResolution: "Bundler"`.
  - `vite.config.ts` using `@lellimecnar/vite-config/node` plus `vite-plugin-dts`.
  - `vitest.config.ts` importing `vitestBaseConfig()` from `@lellimecnar/vitest-config`.

### Implementation Patterns

#### Engine + plugin wiring (`@jsonpath/core`)

- Engine construction (`createEngine`) is “plugin-first”:
  - Plugins are resolved up-front via `resolvePlugins()`.
  - Plugins register behavior into runtime registries and lifecycle hooks:
    - `EvaluatorRegistry`: selector + segment evaluators (sync/async) + filter-script evaluator.
    - `ResultRegistry`: `resultType -> mapper` functions.
    - `EngineLifecycleHooks`: token transforms, AST transforms, evaluate middlewares, error enrichers.
- Execution flow:
  - Parse:
    1. scan tokens
    2. apply token transforms
    3. parse tokens to AST
    4. apply AST transforms
  - Evaluate:
    1. walk AST segments
    2. dispatch to segment evaluator if registered
    3. otherwise iterate selectors and dispatch to selector evaluators
    4. apply evaluate middleware wrappers (reverse-registered wrapping)
    5. map nodes to results via result registry or built-ins (`value` / `node`)
  - Error handling:
    - Plugin failures in setup / transforms / middleware are wrapped with `JsonPathError` (code `Plugin`).
    - Parse errors are normalized to `JsonPathError` (code `Syntax`), with optional plugin error enrichment.

#### Plugin resolution (`resolvePlugins`)

- Deterministic ordering is a core invariant:
  - Input plugins are sorted by `meta.id` first.
  - Topological sort uses deterministic tie-break: lexicographically smallest id when multiple nodes have indegree 0.
- Validations:
  - Duplicate plugin ids throw.
  - Missing required deps throw.
  - Cycles detected and reported (attempts to emit a cycle path).
  - Capability conflicts throw if two plugins claim the same capability string.

#### Preset wiring (`@jsonpath/plugin-rfc-9535` and `@jsonpath/complete`)

- `@jsonpath/plugin-rfc-9535` is “wiring only”:
  - Exports `rfc9535Plugins` array of many syntax/filter/result plugins.
  - Exports `createRfc9535Engine({ profile })` that:
    - Creates a fresh syntax-root plugin instance per engine (explicitly to avoid shared mutable state).
    - Passes profile config to both `@jsonpath/plugin-rfc-9535` and `@jsonpath/plugin-syntax-root` under `options.plugins[pluginId]`.
- `@jsonpath/complete` adds additional plugins beyond RFC set:
  - Script expressions, type selectors, parent selector, property-name selector, and validate plugin.

#### Compatibility layers

- `@jsonpath/compat-jsonpath` emulates the `jsonpath` (dchester) API surface via wrapper functions around a single engine instance.
  - Paths/nodes/value/parent derived by calling `evaluateSync()` with `resultType` set appropriately.
  - Mutation compatibility uses `@jsonpath/mutate` `setAll()` + `Object.assign()`; note comment that behavior might not perfectly match upstream mutation semantics.
- `@jsonpath/compat-jsonpath-plus` implements a `JSONPath(options)` wrapper:
  - Always evaluates with `resultType: 'node'` and then projects to requested result types.
  - Supports `wrap` false behavior (returns a single item when only one match).
  - Declares an `eval` option but does not use it to change evaluation mode.

### Complete Examples

```ts
// Source: packages/jsonpath/core/src/plugins/resolve.ts
// Core behavior: deterministic plugin resolution (deps + conflicts)
export function resolvePlugins(plugins: readonly JsonPathPlugin<any>[]) {
	// orderPluginsDeterministically -> topo sort -> capability conflict checks
}
```

```ts
// Source: packages/jsonpath/core/vite.config.ts (pattern repeated across packages)
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

const external = (id) =>
	id.startsWith('node:') ||
	externalDeps.some((dep) => id === dep || id.startsWith(`${dep}/`));

export default defineConfig(
	mergeConfig(viteNodeConfig(), {
		plugins: [
			dts({ entryRoot: 'src', tsconfigPath: 'tsconfig.json', outDir: 'dist' }),
		],
		build: {
			outDir: 'dist',
			lib: { entry: 'src/index.ts', formats: ['es'] },
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

- Engine API (`@jsonpath/core`):
  - `compile(expression) -> { expression, ast }`
  - `parse(expression) -> PathNode`
  - `evaluateSync(compiled, json, { resultType? }) -> unknown[]`
  - `evaluateAsync(...) -> Promise<unknown[]>`
- Result types known to core:
  - `value`, `node` built-in; `path`/`pointer`/`parent` supported via `ResultRegistry` mappers.

### Configuration Examples

```ts
// Source: packages/config-vitest/base.ts
export function vitestBaseConfig() {
	return {
		plugins: [tsconfigPaths()],
		test: {
			globals: true,
			passWithNoTests: true,
			coverage: {
				provider: 'v8',
				reportsDirectory: 'coverage',
				reporter: ['text', 'text-summary', 'html', 'lcov', 'json'],
			},
			setupFiles: ['./setup/reflect-metadata.ts'],
		},
	};
}
```

### Technical Requirements

- ESM throughout jsonpath packages (`package.json` has `type: "module"`; Vite builds `formats: ['es']`).
- Output conventions:
  - Vite uses `preserveModules` and `preserveModulesRoot: 'src'`, generating a `dist/` tree that mirrors `src/`.
  - Despite preserved modules, `package.json` exports generally only expose `"."` (no subpath exports).
- Conformance suite dependency:
  - `@lellimecnar/jsonpath-conformance` uses `napa` to install `jsonpath-compliance-test-suite` and imports JSON with `assert { type: 'json' }`.

### Gotchas (implementation-impacting)

- **Exports are strict**: packages generally export only `"."` even though Vite emits many files via `preserveModules`. Deep imports will fail in Node ESM when `exports` does not include subpaths.
- **Preset root plugin must be per-engine**: `createRfc9535Engine()` creates a fresh `@jsonpath/plugin-syntax-root` instance to avoid shared mutable state.
- **`eval` option is currently ignored in compat**: `@jsonpath/compat-jsonpath-plus` accepts `eval` but does not alter behavior.
- **Mutation semantics are “best effort”**: `@jsonpath/compat-jsonpath` uses `setAll()` (functional) + `Object.assign()` to approximate upstream in-place mutation.
- **CTS JSON import assertions**: conformance uses `import ... assert { type: 'json' }` from a `napa`-installed dependency. This requires toolchain support for JSON modules + assertions.
- **`turbo test -- --passWithNoTests` is monorepo-wide**: Vitest packages already set `test.passWithNoTests: true` via `@lellimecnar/vitest-config`, and some workspaces use Jest. Any new test runner choice must tolerate the turbo args convention.
- **CLI bin packaging**: `@jsonpath/cli` uses `postbuild` to copy `bin/` into `dist/bin/` to satisfy `package.json#bin` mapping.

## Recommended Approach

Adopt the existing “publishable Node/ESM library” template used across `packages/jsonpath/*`, `packages/utils`, `packages/polymix`, and `packages/card-stack/*`:

- Use `type: "module"`.
- Build with Vite library mode, `formats: ['es']`, and `preserveModules`.
- Generate `.d.ts` with `vite-plugin-dts` into `dist/`.
- Expose only the public entry via `exports["."]` pointing to `./dist/index.js` and `./dist/index.d.ts`.
- Use per-package `vitest.config.ts` delegating to `@lellimecnar/vitest-config`.
- Use `workspace:*` / `workspace:^` for workspace deps (jsonpath commonly uses `workspace:^` when chaining jsonpath packages).

## Concrete Templates (copy-ready)

### package.json (publishable jsonpath-style library)

```json
{
	"name": "@jsonpath/<package-name>",
	"version": "0.0.1",
	"description": "<short description>",
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
	"files": ["dist"],
	"scripts": {
		"build": "pnpm run clean && vite build",
		"clean": "node -e \"require('node:fs').rmSync('dist', { recursive: true, force: true })\"",
		"dev": "vite build --watch",
		"lint": "eslint .",
		"prepack": "pnpm run build",
		"test": "vitest run",
		"test:coverage": "vitest run --coverage",
		"test:watch": "vitest",
		"type-check": "tsgo --noEmit"
	},
	"dependencies": {
		"<dep>": "workspace:^"
	},
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@lellimecnar/vite-config": "workspace:^",
		"@lellimecnar/vitest-config": "workspace:*",
		"@types/jest": "^29.5.12",
		"@types/node": "^24",
		"@vitest/coverage-v8": "^4.0.16",
		"eslint": "^8.57.1",
		"typescript": "~5.5",
		"vite": "^7.3.0",
		"vite-plugin-dts": "^4.5.4",
		"vite-tsconfig-paths": "^6.0.3",
		"vitest": "^4.0.16"
	},
	"publishConfig": {
		"access": "public"
	}
}
```

### tsconfig.json (jsonpath-style library)

```jsonc
{
	"extends": "@lellimecnar/typescript-config",
	"compilerOptions": {
		"outDir": "./dist",
		"rootDir": "./src",
		"noEmit": false,
		"declaration": true,
		"declarationMap": true,
		"sourceMap": true,
		"module": "ESNext",
		"moduleResolution": "Bundler",
	},
	"include": ["src/**/*"],
	"exclude": ["dist", "node_modules"],
}
```

### vite.config.ts (jsonpath-style library)

```ts
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

### vitest.config.ts (jsonpath-style library)

```ts
import { defineConfig } from 'vitest/config';

import { vitestBaseConfig } from '@lellimecnar/vitest-config';

export default defineConfig(vitestBaseConfig());
```

## Implementation Guidance

- **Objectives**: Add/extend jsonpath packages without breaking monorepo build/test/export verification.
- **Key Tasks**:
  - Mirror the standard `package.json` shape (ESM + exports + scripts).
  - Use the standard `tsconfig.json` (outDir/rootDir + bundler resolution).
  - Copy the standard `vite.config.ts` externalization + preserveModules pattern.
  - Add `vitest.config.ts` referencing `vitestBaseConfig()`.
- **Dependencies**:
  - `@lellimecnar/vite-config` and `@lellimecnar/vitest-config` are required for consistency.
  - If importing JSON with assertions (like CTS), ensure Node/tooling supports it end-to-end.
- **Success Criteria**:
  - `pnpm -w turbo build --filter @jsonpath/*` succeeds.
  - `pnpm -w turbo test --filter @jsonpath/*` succeeds.
  - `pnpm -w verify:exports` succeeds and public imports match `exports` map.
