<!-- markdownlint-disable-file -->

## RFC 9535 Default JSONPath Package (Implementation)

### Scope

- Implement `@jsonpath/jsonpath` as the zero-config RFC 9535-only JSONPath entrypoint.
- Consolidate all RFC 9535 plugins into `@jsonpath/plugin-rfc-9535` as internal modules, exposed via subpath exports.
- Move the internal compliance harness into `@jsonpath/jsonpath` (test-only) and delete the old conformance workspace.
- Delete `@jsonpath/complete`.
- Refactor `@jsonpath/core` to add `createPlugin`, plugin phases, deterministic ordering, and component overrides.

### Constraints

- Branch: `jsonpath/rfc9535-default-package`
- Delivery: single PR with step-based commits (one commit per step)
- Run commands from repo root (do not `cd` into workspaces)

### Standard commands

```bash
pnpm install

# Focused builds/tests
pnpm --filter @jsonpath/core test
pnpm --filter @jsonpath/plugin-rfc-9535 test
pnpm --filter @jsonpath/jsonpath test

# Full jsonpath workspace verification
pnpm -w -r build --filter @jsonpath/*
pnpm -w -r test --filter @jsonpath/*
```

---

## Step 0: Branch setup (pre-flight)

```bash
git fetch origin
git switch master
git pull
git switch -c jsonpath/rfc9535-default-package
```

---

## Step 1: Audit current engine + plugin wiring

**Commit message:** `chore(jsonpath): audit current engine and plugin architecture`

### Objective

Create an audit note capturing the current engine surface, plugin inventory, hook registration patterns, and import dependency graph.

### Files to analyze (read-only)

- `packages/jsonpath/core/src/createEngine.ts`
- `packages/jsonpath/core/src/index.ts`
- `packages/jsonpath/core/src/plugins/types.ts`
- `packages/jsonpath/core/src/plugins/resolve.ts`
- `packages/jsonpath/core/src/runtime/hooks.ts`
- `packages/jsonpath/plugin-rfc-9535/src/index.ts`
- `packages/jsonpath/conformance/src/{corpus.ts,harness.ts,index.ts}`
- `packages/jsonpath/complete/src/index.ts`
- `packages/jsonpath/cli/src/run.ts`

### Actions

- [ ] Create `plans/jsonpath/audit-notes.md`.
- [ ] Document:
  - [ ] Current plugin inventory (plugin IDs, capabilities, dependencies)
  - [ ] Hook registration patterns used by each plugin category
  - [ ] Import dependency graph for RFC plugins
  - [ ] List of packages that import `@jsonpath/complete` or individual RFC plugins
  - [ ] Mapping of existing plugins to proposed phases (`syntax`, `filter`, `runtime`, `result`)

### Acceptance criteria

- [ ] Audit document exists and is complete.
- [ ] No code changes in this step.

### Verification

- [ ] `git status` shows only `plans/jsonpath/audit-notes.md`.

### STOP & COMMIT

```txt
chore(jsonpath): audit current engine and plugin architecture

Document current jsonpath engine/plugin wiring, plugin inventory, import graph,
and the mapping to the new RFC 9535 default package architecture.
```

---

## Step 2: Introduce `createPlugin` helper and phase system in `@jsonpath/core`

**Commit message:** `feat(core): add createPlugin helper and plugin phase system`

### Files to create

- `packages/jsonpath/core/src/plugins/createPlugin.ts`
- `packages/jsonpath/core/src/plugins/phases.ts`

### Files to modify

- `packages/jsonpath/core/src/plugins/types.ts`
- `packages/jsonpath/core/src/plugins/resolve.ts`
- `packages/jsonpath/core/src/createEngine.ts`
- `packages/jsonpath/core/src/index.ts`
- `packages/jsonpath/core/package.json`

### Actions

#### 2.1 Define phase enum and types

Create `packages/jsonpath/core/src/plugins/phases.ts`:

```ts
export const PluginPhases = {
	syntax: 'syntax', // Parse-time syntax/grammar registration and AST construction
	filter: 'filter', // Filter-expression operators, literals, functions, evaluation
	runtime: 'runtime', // Core evaluation semantics for selectors/segments
	result: 'result', // Result shaping/mapping
} as const;

export type PluginPhase = (typeof PluginPhases)[keyof typeof PluginPhases];

// Deterministic execution order
export const PhaseOrder: readonly PluginPhase[] = [
	'syntax',
	'filter',
	'runtime',
	'result',
];
```

#### 2.2 Extend plugin meta types

Update `packages/jsonpath/core/src/plugins/types.ts` to include:

```ts
// additions
phases: readonly PluginPhase[]; // Required: at least one phase
allowMultiple?: boolean; // Default: false
order?: {
	first?: boolean; // Run first in its phase
	last?: boolean; // Run last in its phase
	before?: readonly JsonPathPluginId[]; // Run before these plugins
	after?: readonly JsonPathPluginId[]; // Run after these plugins
};
```

#### 2.3 Implement `createPlugin` helper

Create `packages/jsonpath/core/src/plugins/createPlugin.ts`:

```ts
export interface PluginDefinition<Config = unknown> {
	meta: Omit<JsonPathPluginMeta, 'id'> & { id?: JsonPathPluginId };
	setup: (ctx: PluginSetupContext<Config>) => void;
}

export function createPlugin<Config = unknown>(
	definition:
		| PluginDefinition<Config>
		| ((config: Config) => PluginDefinition<Config>),
): JsonPathPlugin<Config> | ((config?: Config) => JsonPathPlugin<Config>) {
	// If definition is a function, return a factory
	if (typeof definition === 'function') {
		return (config?: Config) => {
			const resolved = definition(config as Config);
			return {
				meta: resolved.meta as JsonPathPluginMeta,
				setup: resolved.setup,
			};
		};
	}
	// Otherwise return the plugin directly
	return {
		meta: definition.meta as JsonPathPluginMeta,
		setup: definition.setup,
	};
}
```

#### 2.4 Update resolver for phase-based ordering

Modify `resolvePlugins()` to:

- [ ] Group plugins by declared phase.
- [ ] Apply ordering constraints within each phase.
- [ ] Execute deterministically: `syntax` → `filter` → `runtime` → `result`.
- [ ] Handle duplicates: `allowMultiple: false` → warn + last wins.
- [ ] Handle unsatisfiable constraints: warn + fallback to stable id ordering.

#### 2.5 Add component overrides to `CreateEngineOptions`

Update `packages/jsonpath/core/src/createEngine.ts`:

```ts
export interface CreateEngineOptions {
	plugins: readonly JsonPathPlugin<any>[];
	components?: {
		scanner?: Scanner;
		parser?: JsonPathParser;
		evaluators?: EvaluatorRegistry;
		results?: ResultRegistry;
		lifecycle?: EngineLifecycleHooks;
	};
	options?: {
		maxDepth?: number;
		maxResults?: number;
		verbosity?: 'silent' | 'warn' | 'error' | 'debug';
		plugins?: Record<string, unknown>;
	};
}
```

#### 2.6 Add subpath exports for components

Update `packages/jsonpath/core/package.json`:

```json
{
	"exports": {
		".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
		"./ast": { "types": "./dist/ast.d.ts", "default": "./dist/ast.js" },
		"./lexer": { "types": "./dist/lexer.d.ts", "default": "./dist/lexer.js" },
		"./parser": { "types": "./dist/parser.d.ts", "default": "./dist/parser.js" }
	}
}
```

Create re-export modules:

- `packages/jsonpath/core/src/ast.ts` → re-export `@jsonpath/ast`
- `packages/jsonpath/core/src/lexer.ts` → re-export `@jsonpath/lexer`
- `packages/jsonpath/core/src/parser.ts` → re-export `@jsonpath/parser`

### Acceptance criteria

- [ ] `createPlugin` is exported from `@jsonpath/core`.
- [ ] `PluginPhases` and `PhaseOrder` are exported.
- [ ] `JsonPathPluginMeta` includes `phases`, `allowMultiple`, and `order`.
- [ ] `resolvePlugins()` orders by phase then by constraints.
- [ ] `createEngine()` accepts `components` overrides.
- [ ] Subpath exports work.
- [ ] All existing `@jsonpath/core` tests pass.
- [ ] New tests cover phase ordering and constraint resolution.

### Verification

```bash
pnpm --filter @jsonpath/core test
```

### STOP & COMMIT

```txt
feat(core): add createPlugin helper and plugin phase system

Introduce createPlugin and plugin phases for deterministic ordering, and allow
core engine component overrides with subpath exports for core components.
```

---

## Step 3: Consolidate RFC 9535 plugins into `@jsonpath/plugin-rfc-9535`

**Commit message:** `feat(plugin-rfc-9535): consolidate all RFC plugins as internal modules`

### Files to create

Note: `child-index` handles both Index and Slice selectors.

```
packages/jsonpath/plugin-rfc-9535/src/plugins/
├── syntax/
│   ├── root.ts
│   ├── current.ts
│   ├── child-member.ts
│   ├── child-index.ts
│   ├── wildcard.ts
│   ├── union.ts
│   ├── descendant.ts
│   └── filter.ts
├── filter/
│   ├── literals.ts
│   ├── boolean.ts
│   ├── comparison.ts
│   ├── existence.ts
│   ├── functions.ts
│   └── regex.ts
├── functions/
│   └── core.ts
├── result/
│   ├── value.ts
│   ├── node.ts
│   ├── path.ts
│   └── pointer.ts
├── iregexp.ts
└── index.ts
```

### Files to modify

- `packages/jsonpath/plugin-rfc-9535/package.json`
- `packages/jsonpath/plugin-rfc-9535/src/index.ts`

### Actions

#### 3.1 Migrate plugin source code

For each RFC plugin package being consolidated:

1. Copy existing `src/` contents into the appropriate subdirectory under `plugin-rfc-9535/src/plugins/`.
2. Update imports to use relative paths or `@jsonpath/core`.
3. Convert to use the `createPlugin` helper from `@jsonpath/core`.
4. Add phase declarations to each plugin meta.

Example migration for syntax root:

```ts
import { createPlugin, PluginPhases } from '@jsonpath/core';

export const createSyntaxRootPlugin = createPlugin<{
	profile?: Profile;
	strict?: boolean;
}>((config) => ({
	meta: {
		id: '@jsonpath/plugin-rfc-9535/syntax-root',
		phases: [PluginPhases.syntax],
		capabilities: ['syntax:rfc9535:root'],
	},
	setup: ({ engine }) => {
		// ... existing setup logic
	},
}));
```

#### 3.2 Update package.json with subpath exports

Update `packages/jsonpath/plugin-rfc-9535/package.json` to export each internal module:

```json
{
	"exports": {
		".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
		"./plugins/syntax/root": {
			"types": "./dist/plugins/syntax/root.d.ts",
			"default": "./dist/plugins/syntax/root.js"
		},
		"./plugins/syntax/current": { "...": "..." }
	}
}
```

#### 3.3 Update main index.ts

Update `packages/jsonpath/plugin-rfc-9535/src/index.ts`:

```ts
import { createPlugin } from '@jsonpath/core';

export { createSyntaxRootPlugin } from './plugins/syntax/root';
export { createSyntaxCurrentPlugin } from './plugins/syntax/current';

export const rfc9535Plugins = [
	createSyntaxRootPlugin(),
	createSyntaxCurrentPlugin(),
] as const;

export function createRfc9535Engine(options?: Rfc9535EngineOptions) {
	return createEngine({
		plugins: rfc9535Plugins,
		options: {
			/* ... */
		},
	});
}

export const plugin = createPlugin({
	meta: {
		id: '@jsonpath/plugin-rfc-9535',
		phases: [],
		capabilities: ['preset:rfc9535'],
		dependsOn: rfc9535Plugins.map((p) => p.meta.id),
	},
	setup: () => undefined,
});
```

### Acceptance criteria

- [ ] All RFC plugin source code lives under `plugin-rfc-9535/src/plugins/`.
- [ ] Each plugin uses `createPlugin`.
- [ ] Each plugin declares appropriate phase(s).
- [ ] Subpath exports work.
- [ ] `rfc9535Plugins` is exported and non-empty.
- [ ] All existing `@jsonpath/plugin-rfc-9535` tests pass.
- [ ] New smoke tests verify plugin meta stability.

### Verification

```bash
pnpm --filter @jsonpath/plugin-rfc-9535 test
```

### STOP & COMMIT

```txt
feat(plugin-rfc-9535): consolidate all RFC plugins as internal modules

Move all RFC 9535 plugins into @jsonpath/plugin-rfc-9535 internal modules with
phase declarations and subpath exports.
```

---

## Step 4: Delete old RFC plugin packages (workspace cleanup)

**Commit message:** `chore(jsonpath): delete consolidated RFC plugin packages`

### Directories to delete

```
packages/jsonpath/plugin-syntax-root/
packages/jsonpath/plugin-syntax-current/
packages/jsonpath/plugin-syntax-child-member/
packages/jsonpath/plugin-syntax-child-index/
packages/jsonpath/plugin-syntax-wildcard/
packages/jsonpath/plugin-syntax-union/
packages/jsonpath/plugin-syntax-descendant/
packages/jsonpath/plugin-syntax-filter/
packages/jsonpath/plugin-filter-literals/
packages/jsonpath/plugin-filter-boolean/
packages/jsonpath/plugin-filter-comparison/
packages/jsonpath/plugin-filter-existence/
packages/jsonpath/plugin-filter-functions/
packages/jsonpath/plugin-filter-regex/
packages/jsonpath/plugin-iregexp/
packages/jsonpath/plugin-functions-core/
packages/jsonpath/plugin-result-value/
packages/jsonpath/plugin-result-node/
packages/jsonpath/plugin-result-path/
packages/jsonpath/plugin-result-pointer/
packages/jsonpath/complete/
```

Note: `plugin-result-parent/` and `plugin-result-types/` are not deleted.

### Actions

- [ ] Delete all listed directories.
- [ ] Update any Turbo filters / root scripts referencing deleted packages.
- [ ] Run a clean install.

### Verification

```bash
pnpm install
pnpm -w -r build --filter @jsonpath/*
```

### STOP & COMMIT

```txt
chore(jsonpath): delete consolidated RFC plugin packages

Remove consolidated RFC plugin workspaces and @jsonpath/complete after the
RFC plugins are internalized under @jsonpath/plugin-rfc-9535.
```

---

## Step 5: Introduce `@jsonpath/jsonpath` (zero-config engine entrypoint)

**Commit message:** `feat(jsonpath): add @jsonpath/jsonpath as main entrypoint`

### Files to create

```
packages/jsonpath/jsonpath/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
└── src/
	├── index.ts
	└── index.spec.ts
```

### Actions

#### 5.1 Create package.json

Create `packages/jsonpath/jsonpath/package.json`:

```json
{
	"name": "@jsonpath/jsonpath",
	"version": "0.0.1",
	"description": "RFC 9535 JSONPath for JavaScript - zero configuration required",
	"license": "MIT",
	"type": "module",
	"exports": {
		".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" }
	},
	"main": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"scripts": {
		"build": "vite build",
		"test": "vitest run",
		"postinstall": "napa"
	},
	"dependencies": {
		"@jsonpath/core": "workspace:*",
		"@jsonpath/plugin-rfc-9535": "workspace:*"
	},
	"napa": {
		"jsonpath-compliance-test-suite": "jsonpath-standard/jsonpath-compliance-test-suite#main"
	}
}
```

#### 5.2 Create main entrypoint

Create `packages/jsonpath/jsonpath/src/index.ts`:

```ts
import {
	createEngine as coreCreateEngine,
	type JsonPathEngine,
} from '@jsonpath/core';
import { rfc9535Plugins, createRfc9535Engine } from '@jsonpath/plugin-rfc-9535';

export { JsonPathError, JsonPathErrorCodes } from '@jsonpath/core';
export type {
	JsonPathEngine,
	CompileResult,
	EvaluateOptions,
} from '@jsonpath/core';
export { rfc9535Plugins } from '@jsonpath/plugin-rfc-9535';

let defaultEngine: JsonPathEngine | null = null;

function getDefaultEngine(): JsonPathEngine {
	if (!defaultEngine) {
		defaultEngine = createRfc9535Engine();
	}
	return defaultEngine;
}

export const engine: JsonPathEngine = new Proxy({} as JsonPathEngine, {
	get(_, prop) {
		return (getDefaultEngine() as any)[prop];
	},
});

export default engine;

export interface CreateEngineOptions {
	plugins?: readonly any[];
	components?: any;
	options?: any;
}

export function createEngine(opts?: CreateEngineOptions): JsonPathEngine {
	const plugins = [...rfc9535Plugins, ...(opts?.plugins ?? [])];
	return coreCreateEngine({
		plugins,
		components: opts?.components,
		options: opts?.options,
	});
}

export function evaluateSync(
	expression: string,
	json: unknown,
	options?: any,
): unknown[] {
	const eng = getDefaultEngine();
	const compiled = eng.compile(expression);
	return eng.evaluateSync(compiled, json, options);
}

export async function evaluateAsync(
	expression: string,
	json: unknown,
	options?: any,
): Promise<unknown[]> {
	const eng = getDefaultEngine();
	const compiled = eng.compile(expression);
	return eng.evaluateAsync(compiled, json, options);
}

export function compile(expression: string) {
	return getDefaultEngine().compile(expression);
}

export function parse(expression: string) {
	return getDefaultEngine().parse(expression);
}
```

### Verification

```bash
pnpm --filter @jsonpath/jsonpath test
```

### STOP & COMMIT

```txt
feat(jsonpath): add @jsonpath/jsonpath as main entrypoint

Introduce @jsonpath/jsonpath as a zero-config RFC 9535-only JSONPath engine
entrypoint, re-exporting core types/errors and providing convenience helpers.
```

---

## Step 6: Move compliance apparatus into `@jsonpath/jsonpath`

**Commit message:** `chore(jsonpath): move compliance harness into @jsonpath/jsonpath`

### Actions

- [ ] Move compliance corpus + harness into `@jsonpath/jsonpath/src/__tests__/compliance/`.
- [ ] Delete `packages/jsonpath/conformance/`.
- [ ] Update `packages/jsonpath/compat-harness/src/compat.spec.ts` to remove imports from the deleted conformance package.

### Verification

```bash
pnpm --filter @jsonpath/jsonpath test
```

### STOP & COMMIT

```txt
chore(jsonpath): move compliance harness into @jsonpath/jsonpath

Move the internal compliance harness and corpus into @jsonpath/jsonpath as
test-only modules and remove the old conformance workspace.
```

---

## Step 7: Update ecosystem packages

**Commit message:** `refactor(jsonpath): update ecosystem to use @jsonpath/jsonpath`

### Files to update

- `packages/jsonpath/cli/src/run.ts`
- `packages/jsonpath/cli/package.json`
- `packages/jsonpath/compat-jsonpath/src/index.ts`
- `packages/jsonpath/compat-jsonpath/package.json`
- `packages/jsonpath/compat-jsonpath-plus/src/index.ts`
- `packages/jsonpath/compat-jsonpath-plus/package.json`
- `packages/jsonpath/compat-harness/src/compat.spec.ts`
- `packages/jsonpath/compat-harness/package.json`

### Actions

#### 7.1 Update CLI

Update `packages/jsonpath/cli/src/run.ts`:

```ts
import { createEngine } from '@jsonpath/jsonpath';

export function runJsonPathCli(configPath: string): unknown[] {
	const engine = createEngine();
	// ...
}
```

#### 7.2 Update compat packages

Replace imports from:

- `@jsonpath/complete` → `@jsonpath/jsonpath`
- `@jsonpath/plugin-syntax-*` → `@jsonpath/plugin-rfc-9535/plugins/syntax/*`
- `@jsonpath/plugin-filter-*` → `@jsonpath/plugin-rfc-9535/plugins/filter/*`
- `@jsonpath/plugin-result-*` → `@jsonpath/plugin-rfc-9535/plugins/result/*`

Update `package.json` dependencies accordingly.

### Verification

```bash
pnpm --filter @jsonpath/cli test
pnpm --filter @jsonpath/compat-jsonpath test
pnpm --filter @jsonpath/compat-jsonpath-plus test
pnpm --filter @jsonpath/compat-harness test
```

### STOP & COMMIT

```txt
refactor(jsonpath): update ecosystem to use @jsonpath/jsonpath

Update CLI and compat packages to use the new @jsonpath/jsonpath entrypoint and
the consolidated RFC plugin subpath exports.
```

---

## Step 8: Final workspace integrity pass

**Commit message:** `chore(jsonpath): finalize workspace after restructure`

### Files to review/update

- `turbo.json`
- root `package.json`
- README files in jsonpath packages
- `specs/jsonpath.md`
- `docs/api/jsonpath.md` (if exists)

### Verification

```bash
pnpm -w -r build --filter @jsonpath/*
pnpm -w -r test --filter @jsonpath/*
```

### STOP & COMMIT

```txt
chore(jsonpath): finalize workspace after restructure

Final workspace integrity pass and documentation updates after introducing
@jsonpath/jsonpath and consolidating RFC plugins.
```
