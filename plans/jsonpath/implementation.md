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

### Standard Commands

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

### Gotchas (from research)

> **Critical**: Review these before implementation to avoid common pitfalls.

- **Exports are strict**: packages generally export only `"."` even though Vite emits many files via `preserveModules`. Deep imports will fail in Node ESM when `exports` does not include subpaths.
- **Preset root plugin must be per-engine**: `createRfc9535Engine()` must create a fresh `@jsonpath/plugin-syntax-root` instance to avoid shared mutable state.
- **CTS JSON import assertions**: conformance uses `import ... assert { type: 'json' }` from a `napa`-installed dependency. This requires toolchain support for JSON modules + assertions.
- **CLI bin packaging**: `@jsonpath/cli` uses `postbuild` to copy `bin/` into `dist/bin/` to satisfy `package.json#bin` mapping.

### Risk Mitigation

| Risk                                | Mitigation                                                   |
| ----------------------------------- | ------------------------------------------------------------ |
| Breaking existing consumers         | v0 implementation; no backward compat required               |
| Plugin ordering regression          | Comprehensive tests for phase ordering                       |
| Missing imports after consolidation | Grep for all old package names before merging                |
| Build failures                      | Incremental commits allow rollback to specific step          |
| Test failures in compat packages    | May have pre-existing issues; document and skip if unrelated |

### Success Criteria

1. **`@jsonpath/jsonpath` is the main entrypoint**
   - Zero-config import works: `import engine from '@jsonpath/jsonpath'`
   - Convenience helpers work: `evaluateSync('$.store.books[*].title', data)`

2. **RFC 9535 plugins are consolidated**
   - All RFC plugins live in `@jsonpath/plugin-rfc-9535`
   - Individual plugins accessible via subpath exports
   - Old plugin packages are deleted

3. **Phase system is implemented**
   - Plugins declare phases
   - Ordering is deterministic per phase
   - Constraints work correctly

4. **Workspace is clean**
   - No references to deleted packages
   - All packages build and test
   - Documentation is updated

---

## Step 0: Branch setup (pre-flight) [COMPLETED]

```bash
git fetch origin
git switch master
git pull
git switch -c jsonpath/rfc9535-default-package
```

---

## Step 1: Audit current engine + plugin wiring [COMPLETED]

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

- [x] Create `plans/jsonpath/audit-notes.md`.
- [x] Document:
  - [x] Current plugin inventory (plugin IDs, capabilities, dependencies)
  - [x] Hook registration patterns used by each plugin category
  - [x] Import dependency graph for RFC plugins
  - [x] List of packages that import `@jsonpath/complete` or individual RFC plugins
  - [x] Mapping of existing plugins to proposed phases (`syntax`, `filter`, `runtime`, `result`)

### Acceptance criteria

- [x] Audit document exists and is complete.
- [x] No code changes in this step.

### Verification

- [x] `git status` shows only `plans/jsonpath/audit-notes.md`.

### STOP & COMMIT

```txt
chore(jsonpath): audit current engine and plugin architecture

Document current jsonpath engine/plugin wiring, plugin inventory, import graph,
and the mapping to the new RFC 9535 default package architecture.
```

---

## Step 2: Introduce `createPlugin` helper and phase system in `@jsonpath/core` [COMPLETED]

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

- [x] Group plugins by declared phase.
- [x] Apply ordering constraints within each phase.
- [x] Execute deterministically: `syntax` → `filter` → `runtime` → `result`.
- [x] Handle duplicates: `allowMultiple: false` → warn + last wins.
- [x] Handle unsatisfiable constraints: warn + fallback to stable id ordering.

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

- [x] `createPlugin` is exported from `@jsonpath/core`.
- [x] `PluginPhases` and `PhaseOrder` are exported.
- [x] `JsonPathPluginMeta` includes `phases`, `allowMultiple`, and `order`.
- [x] `resolvePlugins()` orders by phase then by constraints.
- [x] `createEngine()` accepts `components` overrides.
- [x] Subpath exports work.
- [x] All existing `@jsonpath/core` tests pass.
- [x] New tests cover phase ordering and constraint resolution.

### Verification

- [x] `pnpm --filter @jsonpath/core test`

### STOP & COMMIT

```txt
feat(core): add createPlugin helper and plugin phase system

Introduce createPlugin and plugin phases for deterministic ordering, and allow
core engine component overrides with subpath exports for core components.
```

---

## Step 3: Consolidate RFC 9535 plugins into `@jsonpath/plugin-rfc-9535` [COMPLETED]

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
		".": {
			"types": "./dist/index.d.ts",
			"default": "./dist/index.js"
		},
		"./plugins/syntax/root": {
			"types": "./dist/plugins/syntax/root.d.ts",
			"default": "./dist/plugins/syntax/root.js"
		},
		"./plugins/syntax/current": {
			"types": "./dist/plugins/syntax/current.d.ts",
			"default": "./dist/plugins/syntax/current.js"
		},
		"./plugins/syntax/child-member": {
			"types": "./dist/plugins/syntax/child-member.d.ts",
			"default": "./dist/plugins/syntax/child-member.js"
		},
		"./plugins/syntax/child-index": {
			"types": "./dist/plugins/syntax/child-index.d.ts",
			"default": "./dist/plugins/syntax/child-index.js"
		},
		"./plugins/syntax/wildcard": {
			"types": "./dist/plugins/syntax/wildcard.d.ts",
			"default": "./dist/plugins/syntax/wildcard.js"
		},
		"./plugins/syntax/union": {
			"types": "./dist/plugins/syntax/union.d.ts",
			"default": "./dist/plugins/syntax/union.js"
		},
		"./plugins/syntax/descendant": {
			"types": "./dist/plugins/syntax/descendant.d.ts",
			"default": "./dist/plugins/syntax/descendant.js"
		},
		"./plugins/syntax/filter": {
			"types": "./dist/plugins/syntax/filter.d.ts",
			"default": "./dist/plugins/syntax/filter.js"
		},
		"./plugins/filter/literals": {
			"types": "./dist/plugins/filter/literals.d.ts",
			"default": "./dist/plugins/filter/literals.js"
		},
		"./plugins/filter/boolean": {
			"types": "./dist/plugins/filter/boolean.d.ts",
			"default": "./dist/plugins/filter/boolean.js"
		},
		"./plugins/filter/comparison": {
			"types": "./dist/plugins/filter/comparison.d.ts",
			"default": "./dist/plugins/filter/comparison.js"
		},
		"./plugins/filter/existence": {
			"types": "./dist/plugins/filter/existence.d.ts",
			"default": "./dist/plugins/filter/existence.js"
		},
		"./plugins/filter/functions": {
			"types": "./dist/plugins/filter/functions.d.ts",
			"default": "./dist/plugins/filter/functions.js"
		},
		"./plugins/filter/regex": {
			"types": "./dist/plugins/filter/regex.d.ts",
			"default": "./dist/plugins/filter/regex.js"
		},
		"./plugins/functions/core": {
			"types": "./dist/plugins/functions/core.d.ts",
			"default": "./dist/plugins/functions/core.js"
		},
		"./plugins/result/value": {
			"types": "./dist/plugins/result/value.d.ts",
			"default": "./dist/plugins/result/value.js"
		},
		"./plugins/result/node": {
			"types": "./dist/plugins/result/node.d.ts",
			"default": "./dist/plugins/result/node.js"
		},
		"./plugins/result/path": {
			"types": "./dist/plugins/result/path.d.ts",
			"default": "./dist/plugins/result/path.js"
		},
		"./plugins/result/pointer": {
			"types": "./dist/plugins/result/pointer.d.ts",
			"default": "./dist/plugins/result/pointer.js"
		},
		"./iregexp": {
			"types": "./dist/iregexp.d.ts",
			"default": "./dist/iregexp.js"
		}
	}
}
```

#### 3.3 Update main index.ts

Update `packages/jsonpath/plugin-rfc-9535/src/index.ts`:

```ts
import {
	createPlugin,
	createEngine,
	type CreateEngineOptions,
} from '@jsonpath/core';

// Syntax plugins
export { createSyntaxRootPlugin } from './plugins/syntax/root';
export { createSyntaxCurrentPlugin } from './plugins/syntax/current';
export { createSyntaxChildMemberPlugin } from './plugins/syntax/child-member';
export { createSyntaxChildIndexPlugin } from './plugins/syntax/child-index';
export { createSyntaxWildcardPlugin } from './plugins/syntax/wildcard';
export { createSyntaxUnionPlugin } from './plugins/syntax/union';
export { createSyntaxDescendantPlugin } from './plugins/syntax/descendant';
export { createSyntaxFilterPlugin } from './plugins/syntax/filter';

// Filter plugins
export { createFilterLiteralsPlugin } from './plugins/filter/literals';
export { createFilterBooleanPlugin } from './plugins/filter/boolean';
export { createFilterComparisonPlugin } from './plugins/filter/comparison';
export { createFilterExistencePlugin } from './plugins/filter/existence';
export { createFilterFunctionsPlugin } from './plugins/filter/functions';
export { createFilterRegexPlugin } from './plugins/filter/regex';

// Function plugins
export { createFunctionsCorePlugin } from './plugins/functions/core';

// Result plugins
export { createResultValuePlugin } from './plugins/result/value';
export { createResultNodePlugin } from './plugins/result/node';
export { createResultPathPlugin } from './plugins/result/path';
export { createResultPointerPlugin } from './plugins/result/pointer';

// IRegexp utility
export { iregexp } from './iregexp';

// Import for internal use
import { createSyntaxRootPlugin } from './plugins/syntax/root';
import { createSyntaxCurrentPlugin } from './plugins/syntax/current';
import { createSyntaxChildMemberPlugin } from './plugins/syntax/child-member';
import { createSyntaxChildIndexPlugin } from './plugins/syntax/child-index';
import { createSyntaxWildcardPlugin } from './plugins/syntax/wildcard';
import { createSyntaxUnionPlugin } from './plugins/syntax/union';
import { createSyntaxDescendantPlugin } from './plugins/syntax/descendant';
import { createSyntaxFilterPlugin } from './plugins/syntax/filter';
import { createFilterLiteralsPlugin } from './plugins/filter/literals';
import { createFilterBooleanPlugin } from './plugins/filter/boolean';
import { createFilterComparisonPlugin } from './plugins/filter/comparison';
import { createFilterExistencePlugin } from './plugins/filter/existence';
import { createFilterFunctionsPlugin } from './plugins/filter/functions';
import { createFilterRegexPlugin } from './plugins/filter/regex';
import { createFunctionsCorePlugin } from './plugins/functions/core';
import { createResultValuePlugin } from './plugins/result/value';
import { createResultNodePlugin } from './plugins/result/node';
import { createResultPathPlugin } from './plugins/result/path';
import { createResultPointerPlugin } from './plugins/result/pointer';

/**
 * All RFC 9535 plugins in dependency order.
 * This array can be used directly with createEngine().
 */
export const rfc9535Plugins = [
	// Syntax plugins (order matters for parsing)
	createSyntaxRootPlugin(),
	createSyntaxCurrentPlugin(),
	createSyntaxChildMemberPlugin(),
	createSyntaxChildIndexPlugin(),
	createSyntaxWildcardPlugin(),
	createSyntaxUnionPlugin(),
	createSyntaxDescendantPlugin(),
	createSyntaxFilterPlugin(),
	// Filter plugins
	createFilterLiteralsPlugin(),
	createFilterBooleanPlugin(),
	createFilterComparisonPlugin(),
	createFilterExistencePlugin(),
	createFilterFunctionsPlugin(),
	createFilterRegexPlugin(),
	// Function plugins
	createFunctionsCorePlugin(),
	// Result plugins
	createResultValuePlugin(),
	createResultNodePlugin(),
	createResultPathPlugin(),
	createResultPointerPlugin(),
] as const;

export type Rfc9535EngineOptions = Omit<CreateEngineOptions, 'plugins'> & {
	/**
	 * Additional plugins to include after RFC 9535 plugins.
	 * Use this to add extensions.
	 */
	additionalPlugins?: CreateEngineOptions['plugins'];
};

/**
 * Create an engine pre-configured with all RFC 9535 plugins.
 */
export function createRfc9535Engine(options?: Rfc9535EngineOptions) {
	const { additionalPlugins = [], ...rest } = options ?? {};
	return createEngine({
		...rest,
		plugins: [...rfc9535Plugins, ...additionalPlugins],
	});
}

/**
 * Preset plugin that declares dependency on all RFC 9535 plugins.
 * Useful for plugin systems that need to declare RFC 9535 as a dependency.
 */
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

- [x] All RFC plugin source code lives under `plugin-rfc-9535/src/plugins/`.
- [x] Each plugin uses `createPlugin`.
- [x] Each plugin declares appropriate phase(s).
- [x] Subpath exports work.
- [x] `rfc9535Plugins` is exported and non-empty.
- [x] All existing `@jsonpath/plugin-rfc-9535` tests pass.
- [x] New smoke tests verify plugin meta stability.

### Verification

- [x] `pnpm --filter @jsonpath/plugin-rfc-9535 test`

### STOP & COMMIT

```txt
feat(plugin-rfc-9535): consolidate all RFC plugins as internal modules

Move all RFC 9535 plugins into @jsonpath/plugin-rfc-9535 internal modules with
phase declarations and subpath exports.
```

---

## Step 4: Delete old RFC plugin packages (workspace cleanup) [COMPLETED]

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

**Keep these extension plugins (NOT deleted):**

- `packages/jsonpath/plugin-result-parent/` - Parent node references (not RFC 9535)
- `packages/jsonpath/plugin-result-types/` - Type introspection (not RFC 9535)
- `packages/jsonpath/plugin-parent-selector/` - `^` parent selector (extension)
- `packages/jsonpath/plugin-property-name-selector/` - `~` key selector (extension)
- `packages/jsonpath/plugin-type-selectors/` - Type-based selectors (extension)
- `packages/jsonpath/plugin-script-expressions/` - SES-sandboxed scripts (extension)
- `packages/jsonpath/plugin-validate/` - Validation orchestration (extension)

### Actions

- [x] Delete all listed directories.
- [x] Verify no dangling references to deleted packages.
- [x] Update any Turbo filters / root scripts referencing deleted packages.
- [x] Run a clean install.

### Acceptance criteria

- [x] All 21 directories listed above are deleted.
- [x] Extension plugins are preserved (7 packages listed as "keep").
- [x] No dangling `workspace:*` references to deleted packages.
- [x] No import statements referencing deleted packages.
- [x] `pnpm install` completes without errors.
- [x] `pnpm build --filter @jsonpath/*` succeeds.

### Verification

- [x] `pnpm install`
- [x] `pnpm -w -r build --filter @jsonpath/*`

---

## Step 5: Introduce `@jsonpath/jsonpath` (zero-config engine entrypoint) [COMPLETED]

### Files to create

- `packages/jsonpath/jsonpath/src/index.ts`

### Files to modify

- `packages/jsonpath/jsonpath/package.json`

### Actions

#### 5.1 Create main entrypoint

Create `packages/jsonpath/jsonpath/src/index.ts`:

```ts
import { createRfc9535Engine } from '@jsonpath/plugin-rfc-9535';
import { registerDefaultExtensions } from '@jsonpath/plugin-result-parent';
import { createPlugin, PluginPhases } from '@jsonpath/core';

// Zero-config engine
export const engine = createRfc9535Engine();

// Default extensions
registerDefaultExtensions(engine);

/**
 * Evaluate a JSONPath expression against data.
 * @param expression - The JSONPath expression.
 * @param data - The data to evaluate against.
 * @param options - Optional evaluation options.
 * @returns The evaluation result.
 */
export function evaluateSync(
	expression: string,
	data: unknown,
	options?: {
		/**
		 * Maximum depth for recursive expressions.
		 * Prevents crashes from excessively deep recursion.
		 * @default 100
		 */
		maxDepth?: number;
		/**
		 * Maximum number of results to return.
		 * @default Infinity
		 */
		maxResults?: number;
		/**
		 * Verbosity level for errors and warnings.
		 * @default 'silent'
		 */
		verbosity?: 'silent' | 'warn' | 'error' | 'debug';
		/**
		 * Additional JSONPath plugins to include.
		 */
		plugins?: Record<string, unknown>;
	},
): unknown;

/**
 * Evaluate a JSONPath expression against data asynchronously.
 * @param expression - The JSONPath expression.
 * @param data - The data to evaluate against.
 * @param options - Optional evaluation options.
 * @returns A promise that resolves to the evaluation result.
 */
export function evaluate(
	expression: string,
	data: unknown,
	options?: {
		/**
		 * Maximum depth for recursive expressions.
		 * Prevents crashes from excessively deep recursion.
		 * @default 100
		 */
		maxDepth?: number;
		/**
		 * Maximum number of results to return.
		 * @default Infinity
		 */
		maxResults?: number;
		/**
		 * Verbosity level for errors and warnings.
		 * @default 'silent'
		 */
		verbosity?: 'silent' | 'warn' | 'error' | 'debug';
		/**
		 * Additional JSONPath plugins to include.
		 */
		plugins?: Record<string, unknown>;
	},
): Promise<unknown>;
```

#### 5.2 Update package.json

Update `packages/jsonpath/jsonpath/package.json`:

```json
{
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"default": "./dist/index.js"
		}
	}
}
```

### Acceptance criteria

- [x] `@jsonpath/jsonpath` package exists and is buildable.
- [x] Main entrypoint is `@jsonpath/jsonpath`.
- [x] Zero-config import works: `import engine from '@jsonpath/jsonpath'`.
- [x] Convenience helpers work: `evaluateSync('$.store.books[*].title', data)`.
- [x] All existing `@jsonpath/jsonpath` tests pass.
- [x] Documentation is updated.

### Verification

- [x] `pnpm --filter @jsonpath/jsonpath test`

### STOP & COMMIT

```txt
feat(jsonpath): add zero-config engine entrypoint

Introduce @jsonpath/jsonpath as the main entrypoint for zero-config JSONPath
usage, consolidating RFC 9535 plugins and providing evaluate/evaluateSync
helpers.
```
