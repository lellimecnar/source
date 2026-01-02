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

**Keep these extension plugins (NOT deleted):**

- `packages/jsonpath/plugin-result-parent/` - Parent node references (not RFC 9535)
- `packages/jsonpath/plugin-result-types/` - Type introspection (not RFC 9535)
- `packages/jsonpath/plugin-parent-selector/` - `^` parent selector (extension)
- `packages/jsonpath/plugin-property-name-selector/` - `~` key selector (extension)
- `packages/jsonpath/plugin-type-selectors/` - Type-based selectors (extension)
- `packages/jsonpath/plugin-script-expressions/` - SES-sandboxed scripts (extension)
- `packages/jsonpath/plugin-validate/` - Validation orchestration (extension)

### Actions

- [ ] Delete all listed directories.
- [ ] Verify no dangling references to deleted packages.
- [ ] Update any Turbo filters / root scripts referencing deleted packages.
- [ ] Run a clean install.

### Acceptance criteria

- [ ] All 21 directories listed above are deleted.
- [ ] Extension plugins are preserved (7 packages listed as "keep").
- [ ] No dangling `workspace:*` references to deleted packages.
- [ ] No import statements referencing deleted packages.
- [ ] `pnpm install` completes without errors.
- [ ] `pnpm build --filter @jsonpath/*` succeeds.

### Verification

```bash
# Delete directories
rm -rf packages/jsonpath/plugin-syntax-root packages/jsonpath/plugin-syntax-current \
       packages/jsonpath/plugin-syntax-child-member packages/jsonpath/plugin-syntax-child-index \
       packages/jsonpath/plugin-syntax-wildcard packages/jsonpath/plugin-syntax-union \
       packages/jsonpath/plugin-syntax-descendant packages/jsonpath/plugin-syntax-filter \
       packages/jsonpath/plugin-filter-literals packages/jsonpath/plugin-filter-boolean \
       packages/jsonpath/plugin-filter-comparison packages/jsonpath/plugin-filter-existence \
       packages/jsonpath/plugin-filter-functions packages/jsonpath/plugin-filter-regex \
       packages/jsonpath/plugin-iregexp packages/jsonpath/plugin-functions-core \
       packages/jsonpath/plugin-result-value packages/jsonpath/plugin-result-node \
       packages/jsonpath/plugin-result-path packages/jsonpath/plugin-result-pointer \
       packages/jsonpath/complete

# Verify no dangling references (should return no matches)
grep -r "@jsonpath/plugin-syntax-" packages/ --include="*.json" --include="*.ts" | grep -v node_modules || echo "No dangling syntax plugin refs"
grep -r "@jsonpath/plugin-filter-" packages/ --include="*.json" --include="*.ts" | grep -v node_modules || echo "No dangling filter plugin refs"
grep -r "@jsonpath/plugin-result-value\|@jsonpath/plugin-result-node\|@jsonpath/plugin-result-path\|@jsonpath/plugin-result-pointer" packages/ --include="*.json" --include="*.ts" | grep -v node_modules || echo "No dangling result plugin refs"
grep -r "@jsonpath/plugin-functions-core\|@jsonpath/plugin-iregexp" packages/ --include="*.json" --include="*.ts" | grep -v node_modules || echo "No dangling misc plugin refs"
grep -r "@jsonpath/complete" packages/ --include="*.json" --include="*.ts" | grep -v node_modules || echo "No dangling complete refs"

# Clean install and verify
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
├── AGENTS.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
└── src/
    ├── index.ts
    └── index.spec.ts
```

### Actions

#### 5.1 Create AGENTS.md

Create `packages/jsonpath/jsonpath/AGENTS.md`:

```markdown
# @jsonpath/jsonpath

RFC 9535 JSONPath for JavaScript - zero configuration required.

## Overview

This is the **main entrypoint** for typical JSONPath consumers. It provides a ready-to-use RFC 9535-compliant engine with no configuration required.

## Usage

\`\`\`ts
import engine from '@jsonpath/jsonpath';
// or
import { evaluateSync, compile, parse } from '@jsonpath/jsonpath';

const result = evaluateSync('$.store.books[*].title', data);
\`\`\`

## API

- `engine` - Default lazy-initialized RFC 9535 engine (default export)
- `evaluateSync(expression, json, options?)` - Compile and evaluate in one call
- `evaluateAsync(expression, json, options?)` - Async version
- `compile(expression)` - Compile expression for reuse
- `parse(expression)` - Parse to AST
- `createEngine(options?)` - Create custom engine with additional plugins

## Extension Plugins

To add extensions beyond RFC 9535:

\`\`\`ts
import { createEngine } from '@jsonpath/jsonpath';
import { parentSelectorPlugin } from '@jsonpath/plugin-parent-selector';

const engine = createEngine({ plugins: [parentSelectorPlugin] });
\`\`\`

## Testing

This package includes the RFC 9535 Compliance Test Suite (CTS) as test-only modules under `src/__tests__/compliance/`.
```

#### 5.2 Create package.json

Create `packages/jsonpath/jsonpath/package.json`:

```json
{
	"name": "@jsonpath/jsonpath",
	"version": "0.0.1",
	"description": "RFC 9535 JSONPath for JavaScript - zero configuration required",
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
		"type-check": "tsgo --noEmit",
		"postinstall": "napa"
	},
	"dependencies": {
		"@jsonpath/core": "workspace:^",
		"@jsonpath/plugin-rfc-9535": "workspace:^"
	},
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@lellimecnar/vite-config": "workspace:^",
		"@lellimecnar/vitest-config": "workspace:*",
		"@types/node": "^24",
		"@vitest/coverage-v8": "^4.0.16",
		"eslint": "^8.57.1",
		"napa": "^3.0.0",
		"typescript": "~5.5",
		"vite": "^7.3.0",
		"vite-plugin-dts": "^4.5.4",
		"vite-tsconfig-paths": "^6.0.3",
		"vitest": "^4.0.16"
	},
	"napa": {
		"jsonpath-compliance-test-suite": "jsonpath-standard/jsonpath-compliance-test-suite#main"
	},
	"publishConfig": {
		"access": "public"
	}
}
```

#### 5.3 Create tsconfig.json

Create `packages/jsonpath/jsonpath/tsconfig.json`:

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

#### 5.4 Create vite.config.ts

Create `packages/jsonpath/jsonpath/vite.config.ts`:

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

#### 5.5 Create vitest.config.ts

Create `packages/jsonpath/jsonpath/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

import { vitestBaseConfig } from '@lellimecnar/vitest-config';

export default defineConfig(vitestBaseConfig());
```

#### 5.6 Create main entrypoint

Create `packages/jsonpath/jsonpath/src/index.ts`:

```ts
import {
	createEngine as coreCreateEngine,
	type JsonPathEngine,
	type JsonPathPlugin,
	type CreateEngineOptions as CoreCreateEngineOptions,
} from '@jsonpath/core';
import { rfc9535Plugins, createRfc9535Engine } from '@jsonpath/plugin-rfc-9535';

// Re-export commonly needed types/errors
export { JsonPathError, JsonPathErrorCodes } from '@jsonpath/core';
export type {
	JsonPathEngine,
	CompileResult,
	EvaluateOptions,
	JsonPathPlugin,
} from '@jsonpath/core';
export { rfc9535Plugins } from '@jsonpath/plugin-rfc-9535';

// Lazy singleton default engine
let defaultEngine: JsonPathEngine | null = null;

function getDefaultEngine(): JsonPathEngine {
	if (!defaultEngine) {
		defaultEngine = createRfc9535Engine();
	}
	return defaultEngine;
}

// Default engine export (lazy proxy)
export const engine: JsonPathEngine = new Proxy({} as JsonPathEngine, {
	get(_, prop) {
		return (getDefaultEngine() as any)[prop];
	},
});

export default engine;

// Factory for custom engines (RFC defaults + extra plugins)
export interface CreateEngineOptions {
	plugins?: readonly JsonPathPlugin<any>[];
	components?: CoreCreateEngineOptions['components'];
	options?: CoreCreateEngineOptions['options'];
}

export function createEngine(opts?: CreateEngineOptions): JsonPathEngine {
	const plugins = [...rfc9535Plugins, ...(opts?.plugins ?? [])];
	return coreCreateEngine({
		plugins,
		components: opts?.components,
		options: opts?.options,
	});
}

// Convenience helpers (compile + evaluate in one call)
export function evaluateSync(
	expression: string,
	json: unknown,
	options?: { resultType?: string },
): unknown[] {
	const eng = getDefaultEngine();
	const compiled = eng.compile(expression);
	return eng.evaluateSync(compiled, json, options);
}

export async function evaluateAsync(
	expression: string,
	json: unknown,
	options?: { resultType?: string },
): Promise<unknown[]> {
	const eng = getDefaultEngine();
	const compiled = eng.compile(expression);
	return eng.evaluateAsync(compiled, json, options);
}

// Compile and parse shortcuts
export function compile(expression: string) {
	return getDefaultEngine().compile(expression);
}

export function parse(expression: string) {
	return getDefaultEngine().parse(expression);
}
```

#### 5.7 Create basic test

Create `packages/jsonpath/jsonpath/src/index.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import engine, { evaluateSync, compile, parse, createEngine } from './index';

describe('@jsonpath/jsonpath', () => {
	const data = {
		store: {
			books: [
				{ title: 'Book A', price: 10 },
				{ title: 'Book B', price: 20 },
			],
		},
	};

	describe('default engine', () => {
		it('should compile and evaluate expressions', () => {
			const compiled = engine.compile('$.store.books[*].title');
			const result = engine.evaluateSync(compiled, data);
			expect(result).toEqual(['Book A', 'Book B']);
		});
	});

	describe('evaluateSync helper', () => {
		it('should compile and evaluate in one call', () => {
			const result = evaluateSync('$.store.books[0].title', data);
			expect(result).toEqual(['Book A']);
		});
	});

	describe('compile helper', () => {
		it('should return a compiled expression', () => {
			const compiled = compile('$.store.books[*]');
			expect(compiled).toHaveProperty('expression');
			expect(compiled).toHaveProperty('ast');
		});
	});

	describe('parse helper', () => {
		it('should return an AST', () => {
			const ast = parse('$.store.books[*]');
			expect(ast).toBeDefined();
		});
	});

	describe('createEngine', () => {
		it('should create engine with default RFC plugins', () => {
			const eng = createEngine();
			const result = eng.evaluateSync(eng.compile('$'), { a: 1 });
			expect(result).toEqual([{ a: 1 }]);
		});

		it('should accept additional plugins', () => {
			// Basic test - real extension plugins would be added here
			const eng = createEngine({ plugins: [] });
			expect(eng).toBeDefined();
		});
	});
});
```

### Acceptance criteria

- [ ] Package builds successfully.
- [ ] `import engine from '@jsonpath/jsonpath'` works.
- [ ] `import { evaluateSync } from '@jsonpath/jsonpath'` works.
- [ ] `createEngine({ plugins: [myPlugin] })` appends to RFC plugins.
- [ ] Default engine is RFC 9535 compliant.
- [ ] Convenience helpers work correctly.
- [ ] All tests pass.
      }

export function parse(expression: string) {
return getDefaultEngine().parse(expression);
}

````

### Verification

```bash
pnpm --filter @jsonpath/jsonpath test
````

### STOP & COMMIT

```txt
feat(jsonpath): add @jsonpath/jsonpath as main entrypoint

Introduce @jsonpath/jsonpath as a zero-config RFC 9535-only JSONPath engine
entrypoint, re-exporting core types/errors and providing convenience helpers.
```

---

## Step 6: Move compliance apparatus into `@jsonpath/jsonpath`

**Commit message:** `chore(jsonpath): move compliance harness into @jsonpath/jsonpath`

### Files to create/move

```
packages/jsonpath/jsonpath/src/__tests__/
├── compliance/
│   ├── corpus.ts      # Migrated from conformance/src/corpus.ts
│   ├── harness.ts     # Migrated from conformance/src/harness.ts
│   ├── cts.ts         # Migrated from conformance/src/cts.ts
│   └── index.ts       # Re-exports for internal use
└── compliance.spec.ts # Test runner
```

### Directories to delete

```
packages/jsonpath/conformance/
```

### Actions

#### 6.1 Create compliance directory structure

```bash
mkdir -p packages/jsonpath/jsonpath/src/__tests__/compliance
```

#### 6.2 Migrate corpus.ts

Copy and adapt `packages/jsonpath/conformance/src/corpus.ts` to `packages/jsonpath/jsonpath/src/__tests__/compliance/corpus.ts`:

- Update imports to use `@jsonpath/jsonpath` internal paths
- Keep the test case definitions and document fixtures

#### 6.3 Migrate harness.ts

Copy and adapt `packages/jsonpath/conformance/src/harness.ts` to `packages/jsonpath/jsonpath/src/__tests__/compliance/harness.ts`:

```ts
// packages/jsonpath/jsonpath/src/__tests__/compliance/harness.ts
import { createRfc9535Engine } from '@jsonpath/plugin-rfc-9535';
import type { JsonPathEngine } from '@jsonpath/core';

export interface TestCase {
	id: string;
	selector: string;
	document: unknown;
	result?: unknown[];
	invalid_selector?: boolean;
}

export function runTestCase(
	testCase: TestCase,
	engine?: JsonPathEngine,
): { passed: boolean; error?: Error; result?: unknown[] } {
	const eng = engine ?? createRfc9535Engine();

	try {
		const compiled = eng.compile(testCase.selector);

		if (testCase.invalid_selector) {
			return { passed: false, error: new Error('Expected invalid selector') };
		}

		const result = eng.evaluateSync(compiled, testCase.document);

		if (testCase.result !== undefined) {
			const passed = JSON.stringify(result) === JSON.stringify(testCase.result);
			return { passed, result };
		}

		return { passed: true, result };
	} catch (error) {
		if (testCase.invalid_selector) {
			return { passed: true };
		}
		return { passed: false, error: error as Error };
	}
}
```

#### 6.4 Migrate cts.ts (CTS loader)

Copy and adapt `packages/jsonpath/conformance/src/cts.ts` to `packages/jsonpath/jsonpath/src/__tests__/compliance/cts.ts`:

```ts
// packages/jsonpath/jsonpath/src/__tests__/compliance/cts.ts
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// CTS is installed via napa postinstall
export function loadCtsTestSuite(): unknown {
	try {
		return require('jsonpath-compliance-test-suite/cts.json');
	} catch {
		console.warn('CTS not available - run pnpm install to fetch');
		return { tests: [] };
	}
}
```

#### 6.5 Create compliance index

Create `packages/jsonpath/jsonpath/src/__tests__/compliance/index.ts`:

```ts
export { runTestCase, type TestCase } from './harness';
export { loadCtsTestSuite } from './cts';
export * from './corpus';
```

#### 6.6 Create compliance test runner

Create `packages/jsonpath/jsonpath/src/__tests__/compliance.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { loadCtsTestSuite, runTestCase } from './compliance';

describe('RFC 9535 Compliance Test Suite', () => {
	const cts = loadCtsTestSuite() as { tests: any[] };

	if (!cts.tests || cts.tests.length === 0) {
		it.skip('CTS not available', () => {});
		return;
	}

	for (const test of cts.tests) {
		it(`${test.name}: ${test.selector}`, () => {
			const result = runTestCase({
				id: test.name,
				selector: test.selector,
				document: test.document,
				result: test.result,
				invalid_selector: test.invalid_selector,
			});
			expect(result.passed).toBe(true);
		});
	}
});
```

#### 6.7 Update compat-harness imports

Update `packages/jsonpath/compat-harness/src/compat.spec.ts`:

- Remove imports from `@lellimecnar/jsonpath-conformance`
- Either inline the needed test documents or import from `@jsonpath/jsonpath` if exposed

#### 6.8 Delete conformance package

```bash
rm -rf packages/jsonpath/conformance
```

### Acceptance criteria

- [ ] `packages/jsonpath/conformance/` is deleted.
- [ ] Compliance harness lives under `@jsonpath/jsonpath/src/__tests__/compliance/`.
- [ ] Compliance code is NOT exported from the package (test-only).
- [ ] `napa` fetch still works via `postinstall`.
- [ ] Basic compliance test runs and passes.
- [ ] `compat-harness` tests still work (or are updated).

### Verification

```bash
# Verify compliance tests run
pnpm --filter @jsonpath/jsonpath test

# Verify compat-harness still works
pnpm --filter @jsonpath/compat-harness test
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
// BEFORE:
// import { createCompleteEngine } from '@jsonpath/complete';

// AFTER:
import { createEngine } from '@jsonpath/jsonpath';

export function runJsonPathCli(configPath: string): unknown[] {
	const engine = createEngine();
	// ... rest of implementation
}
```

Update `packages/jsonpath/cli/package.json` dependencies:

```json
{
	"dependencies": {
		"@jsonpath/jsonpath": "workspace:^"
	}
}
```

Remove `@jsonpath/complete` from dependencies.

#### 7.2 Update compat-jsonpath

Update `packages/jsonpath/compat-jsonpath/src/index.ts`:

```ts
// BEFORE:
// import { createEngine } from '@jsonpath/core';
// import { rfc9535Plugins } from '@jsonpath/plugin-rfc-9535';
// const engine = createEngine({ plugins: rfc9535Plugins });

// AFTER:
import { createEngine, type JsonPathEngine } from '@jsonpath/jsonpath';

let engine: JsonPathEngine | null = null;

function getEngine(): JsonPathEngine {
	if (!engine) {
		engine = createEngine();
	}
	return engine;
}

// Update all functions to use getEngine() instead of module-level engine
export function query(expression: string, json: unknown): unknown[] {
	const eng = getEngine();
	const compiled = eng.compile(expression);
	return eng.evaluateSync(compiled, json, { resultType: 'value' });
}

// ... similar updates for paths, nodes, value, parent, apply
```

Update `packages/jsonpath/compat-jsonpath/package.json`:

```json
{
	"dependencies": {
		"@jsonpath/jsonpath": "workspace:^",
		"@jsonpath/mutate": "workspace:^"
	}
}
```

Remove `@jsonpath/core` and `@jsonpath/plugin-rfc-9535` from dependencies.

#### 7.3 Update compat-jsonpath-plus

Update `packages/jsonpath/compat-jsonpath-plus/src/index.ts`:

```ts
// BEFORE:
// import { createEngine } from '@jsonpath/core';
// import { rfc9535Plugins } from '@jsonpath/plugin-rfc-9535';

// AFTER:
import { createEngine, type JsonPathEngine } from '@jsonpath/jsonpath';

// ... rest of implementation uses createEngine() from @jsonpath/jsonpath
```

Update `packages/jsonpath/compat-jsonpath-plus/package.json`:

```json
{
	"dependencies": {
		"@jsonpath/jsonpath": "workspace:^"
	}
}
```

Remove `@jsonpath/core` and `@jsonpath/plugin-rfc-9535` from dependencies.

#### 7.4 Update compat-harness

Update `packages/jsonpath/compat-harness/package.json`:

```json
{
	"devDependencies": {
		"@jsonpath/compat-jsonpath-plus": "workspace:^"
	}
}
```

Remove `@lellimecnar/jsonpath-conformance` from dependencies.

Update `packages/jsonpath/compat-harness/src/compat.spec.ts`:

- Remove `import { documents } from '@lellimecnar/jsonpath-conformance'`
- Either inline the test documents or skip tests that depend on the removed conformance package

### Import migration reference

| Old Import                           | New Import                                         |
| ------------------------------------ | -------------------------------------------------- |
| `@jsonpath/complete`                 | `@jsonpath/jsonpath`                               |
| `createCompleteEngine()`             | `createEngine()`                                   |
| `createEngine` from `@jsonpath/core` | `createEngine` from `@jsonpath/jsonpath`           |
| `rfc9535Plugins` (direct use)        | Not needed - `createEngine()` includes them        |
| `@jsonpath/plugin-syntax-*`          | `@jsonpath/plugin-rfc-9535/plugins/syntax/*`       |
| `@jsonpath/plugin-filter-*`          | `@jsonpath/plugin-rfc-9535/plugins/filter/*`       |
| `@jsonpath/plugin-result-value`      | `@jsonpath/plugin-rfc-9535/plugins/result/value`   |
| `@jsonpath/plugin-result-node`       | `@jsonpath/plugin-rfc-9535/plugins/result/node`    |
| `@jsonpath/plugin-result-path`       | `@jsonpath/plugin-rfc-9535/plugins/result/path`    |
| `@jsonpath/plugin-result-pointer`    | `@jsonpath/plugin-rfc-9535/plugins/result/pointer` |
| `@lellimecnar/jsonpath-conformance`  | (deleted - inline or skip)                         |

### Acceptance criteria

- [ ] No references to `@jsonpath/complete` remain.
- [ ] No references to deleted plugin packages remain.
- [ ] CLI uses `@jsonpath/jsonpath`.
- [ ] compat-jsonpath uses `@jsonpath/jsonpath`.
- [ ] compat-jsonpath-plus uses `@jsonpath/jsonpath`.
- [ ] All updated packages build successfully.
- [ ] All updated packages' tests pass.

### Verification

```bash
# Verify no dangling references
grep -r "@jsonpath/complete" packages/jsonpath --include="*.ts" --include="*.json" | grep -v node_modules || echo "No complete refs"
grep -r "@lellimecnar/jsonpath-conformance" packages/jsonpath --include="*.ts" --include="*.json" | grep -v node_modules || echo "No conformance refs"

# Run tests
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
- `pnpm-workspace.yaml`

### Actions

#### 8.1 Clean up workspace references

Run workspace integrity check:

```bash
pnpm install
```

This will:

- Remove references to deleted packages from lockfile
- Validate all `workspace:*` references resolve

#### 8.2 Update turbo.json if needed

Verify no references to deleted packages exist:

```bash
grep -E "(plugin-syntax|plugin-filter|plugin-result|complete|conformance)" turbo.json || echo "No stale refs"
```

#### 8.3 Update root package.json scripts

If root `package.json` has scripts referencing deleted packages:

```bash
grep -E "(plugin-syntax|plugin-filter|plugin-result|complete|conformance)" package.json || echo "No stale refs"
```

#### 8.4 Update specs/jsonpath.md

Add documentation for the new package structure:

```markdown
## Package Overview

### User-Facing Packages

| Package                          | Purpose                                                     |
| -------------------------------- | ----------------------------------------------------------- |
| `@jsonpath/jsonpath`             | **Primary entrypoint** - RFC 9535 compliant JSONPath engine |
| `@jsonpath/cli`                  | Command-line interface                                      |
| `@jsonpath/compat-jsonpath`      | Drop-in replacement for `jsonpath` npm package              |
| `@jsonpath/compat-jsonpath-plus` | Drop-in replacement for `jsonpath-plus`                     |

### Core Infrastructure

| Package            | Purpose                                   |
| ------------------ | ----------------------------------------- |
| `@jsonpath/core`   | Plugin system, engine factory, base types |
| `@jsonpath/ast`    | AST node types and utilities              |
| `@jsonpath/lexer`  | Tokenizer for JSONPath expressions        |
| `@jsonpath/parser` | Parser for JSONPath expressions           |

### Plugin Bundles

| Package                     | Purpose                                                            |
| --------------------------- | ------------------------------------------------------------------ |
| `@jsonpath/plugin-rfc-9535` | All RFC 9535 plugins (syntax, filter, result) with subpath exports |

### Extension Plugins

| Package                                   | Purpose                          |
| ----------------------------------------- | -------------------------------- |
| `@jsonpath/plugin-parent-selector`        | `^` parent selector extension    |
| `@jsonpath/plugin-property-name-selector` | `~` key selector extension       |
| `@jsonpath/plugin-type-selectors`         | Type-based selectors             |
| `@jsonpath/plugin-script-expressions`     | SES-sandboxed script expressions |
| `@jsonpath/plugin-validate`               | Validation orchestration         |
| `@jsonpath/mutate`                        | Document mutation operations     |
```

#### 8.5 Update package READMEs

Ensure each remaining package has an updated README with:

- [ ] Current package purpose
- [ ] Basic usage example
- [ ] Links to related packages

#### 8.6 Full build and test

```bash
# Clean rebuild
pnpm clean
pnpm install
pnpm build --filter @jsonpath/*

# Run all tests
pnpm test --filter @jsonpath/*

# Verify no type errors
pnpm type-check
```

#### 8.7 Verify exports work

Create a quick smoke test script:

```bash
# Test that main exports work
node -e "import('@jsonpath/jsonpath').then(m => console.log('jsonpath:', Object.keys(m)))"
node -e "import('@jsonpath/core').then(m => console.log('core:', Object.keys(m)))"
node -e "import('@jsonpath/plugin-rfc-9535').then(m => console.log('plugin-rfc-9535:', Object.keys(m)))"
```

### Acceptance criteria

- [ ] `pnpm install` completes without errors.
- [ ] `pnpm build --filter @jsonpath/*` succeeds.
- [ ] `pnpm test --filter @jsonpath/*` passes.
- [ ] `pnpm type-check` passes.
- [ ] No dangling references to deleted packages.
- [ ] All package READMEs are updated.
- [ ] `specs/jsonpath.md` reflects new structure.
- [ ] Export smoke tests pass.

### Verification

```bash
# Final verification suite
pnpm install && \
pnpm build --filter @jsonpath/* && \
pnpm test --filter @jsonpath/* && \
pnpm type-check && \
echo "✅ All checks passed"
```

### STOP & COMMIT

```txt
chore(jsonpath): finalize workspace after restructure

Final workspace integrity pass and documentation updates after introducing
@jsonpath/jsonpath and consolidating RFC plugins.
```

---

## Appendix: Quick Reference

### Package Dependency Graph (Post-Restructure)

```
@jsonpath/jsonpath
├── @jsonpath/core
│   ├── @jsonpath/ast
│   ├── @jsonpath/lexer
│   └── @jsonpath/parser
└── @jsonpath/plugin-rfc-9535
    └── @jsonpath/core

@jsonpath/cli
└── @jsonpath/jsonpath

@jsonpath/compat-jsonpath
├── @jsonpath/jsonpath
└── @jsonpath/mutate

@jsonpath/compat-jsonpath-plus
└── @jsonpath/jsonpath

Extension plugins
├── @jsonpath/plugin-parent-selector → @jsonpath/core
├── @jsonpath/plugin-property-name-selector → @jsonpath/core
├── @jsonpath/plugin-type-selectors → @jsonpath/core
├── @jsonpath/plugin-script-expressions → @jsonpath/core
└── @jsonpath/plugin-validate → @jsonpath/core
```

### Deleted Packages (for reference)

```
@jsonpath/complete
@jsonpath/plugin-syntax-root
@jsonpath/plugin-syntax-current
@jsonpath/plugin-syntax-child-member
@jsonpath/plugin-syntax-child-index
@jsonpath/plugin-syntax-wildcard
@jsonpath/plugin-syntax-union
@jsonpath/plugin-syntax-descendant
@jsonpath/plugin-syntax-filter
@jsonpath/plugin-filter-literals
@jsonpath/plugin-filter-boolean
@jsonpath/plugin-filter-comparison
@jsonpath/plugin-filter-existence
@jsonpath/plugin-filter-functions
@jsonpath/plugin-filter-regex
@jsonpath/plugin-iregexp
@jsonpath/plugin-functions-core
@jsonpath/plugin-result-value
@jsonpath/plugin-result-node
@jsonpath/plugin-result-path
@jsonpath/plugin-result-pointer
@lellimecnar/jsonpath-conformance
```

### Common Commands

```bash
# Development
pnpm --filter @jsonpath/jsonpath dev     # Watch mode
pnpm --filter @jsonpath/jsonpath test    # Run tests

# Building
pnpm build --filter @jsonpath/*          # Build all jsonpath packages
pnpm type-check                          # Type check entire workspace

# Testing
pnpm test --filter @jsonpath/*           # Test all jsonpath packages

# Linting
pnpm lint --filter @jsonpath/*           # Lint all jsonpath packages
```
