# RFC 9535 Default JSONPath Package

**Branch:** `jsonpath/rfc9535-default-package`
**Delivery:** Single PR with step-based commits (one commit per step)
**Status:** Draft

---

## Overview

This plan introduces `@jsonpath/jsonpath` as the zero-config RFC 9535 engine entrypoint, consolidates RFC 9535 spec plugins into `@jsonpath/plugin-rfc-9535` as internal modules (exposed via subpath exports), moves the internal compliance harness into `@jsonpath/jsonpath` (deleting the old `@lellimecnar/jsonpath-conformance` workspace), deletes `@jsonpath/complete` entirely, and refactors `@jsonpath/core` to expose a `createPlugin` helper and accept component overrides.

## Goal

Provide a single, ergonomic import (`@jsonpath/jsonpath`) that yields a ready-to-use **RFC 9535-only** JSONPath engine with `compile`, `parse`, `evaluateSync`, and `evaluateAsync` available with zero configuration, while keeping the ecosystem composable (default plugins/components remain individually exportable and fully overridable).

`@jsonpath/jsonpath` is the **main entrypoint** for typical consumers. It is **strictly RFC 9535 compliant** and does NOT include extension plugins (parent selector, script expressions, type selectors, etc.). Users who need extensions must install and configure them separately.

Aside from optional additional plugins, consumers should not need to install any other dependencies unless they have an advanced use case requiring custom configuration of parser/AST/lexer/etc. or are creating their own plugins.

---

## Key Decisions (Resolved)

| Decision                   | Choice                                  | Rationale                                                                     |
| -------------------------- | --------------------------------------- | ----------------------------------------------------------------------------- |
| `@jsonpath/jsonpath` scope | RFC 9535-only                           | Pure standards compliance; extensions are opt-in                              |
| `createPlugin` abstraction | Introduce in `@jsonpath/core`           | Standardizes plugin authoring pattern                                         |
| Plugin phase declarations  | Implement now                           | Required for deterministic ordering                                           |
| `@jsonpath/complete` fate  | Delete entirely                         | Replaced by `@jsonpath/jsonpath`                                              |
| RFC plugin consolidation   | Internal modules with subpath exports   | Not published separately; available via `@jsonpath/plugin-rfc-9535/plugins/*` |
| Compliance suite wiring    | Keep `postinstall` with `napa`          | Auto-fetches for all installs                                                 |
| Delivery strategy          | Single large PR with step-based commits | Atomic delivery, easier to review as a whole                                  |

---

## RFC 9535 Feature Verification

This section documents the complete mapping between RFC 9535 specification sections and the plugins consolidated into `@jsonpath/plugin-rfc-9535`. Cross-referenced with [json-p3 documentation](https://jg-rp.github.io/json-p3/guides/jsonpath-syntax) for implementation accuracy.

### Selectors (RFC 9535 Section 2.3)

| RFC Section | Feature              | Syntax Example      | Source Plugin                | Status |
| ----------- | -------------------- | ------------------- | ---------------------------- | ------ |
| 2.3.1       | Name selector        | `.name`, `['name']` | `plugin-syntax-child-member` | ✅     |
| 2.3.2       | Wildcard selector    | `*`, `[*]`          | `plugin-syntax-wildcard`     | ✅     |
| 2.3.3       | Index selector       | `[0]`, `[-1]`       | `plugin-syntax-child-index`  | ✅     |
| 2.3.4       | Array slice selector | `[0:5:2]`, `[::2]`  | `plugin-syntax-child-index`  | ✅     |
| 2.3.5       | Filter selector      | `[?@.active]`       | `plugin-syntax-filter`       | ✅     |

### Segments (RFC 9535 Section 2.4-2.5)

| RFC Section | Feature              | Syntax Example      | Source Plugin              | Status |
| ----------- | -------------------- | ------------------- | -------------------------- | ------ |
| 2.4.1       | Child segment        | `.name`, `[sel]`    | `plugin-syntax-child-*`    | ✅     |
| 2.4.2       | Descendant segment   | `..name`, `..[sel]` | `plugin-syntax-descendant` | ✅     |
| 2.5         | Union/selector lists | `[0,1,'a']`         | `plugin-syntax-union`      | ✅     |

### Identifiers (RFC 9535 Section 2.1-2.2)

| RFC Section | Feature                 | Syntax Example | Source Plugin           | Status |
| ----------- | ----------------------- | -------------- | ----------------------- | ------ |
| 2.1         | Root identifier         | `$`            | `plugin-syntax-root`    | ✅     |
| 2.2         | Current node identifier | `@`            | `plugin-syntax-current` | ✅     |

### Filter Expressions (RFC 9535 Section 2.5)

| RFC Section | Feature              | Syntax Example        | Source Plugin                           | Status |
| ----------- | -------------------- | --------------------- | --------------------------------------- | ------ |
| 2.5.1       | Literals             | `true`, `42`, `"str"` | `plugin-filter-literals`                | ✅     |
| 2.5.2       | Boolean operators    | `&&`, `\|\|`, `!`     | `plugin-filter-boolean`                 | ✅     |
| 2.5.3       | Comparison operators | `==`, `<`, `>=`       | `plugin-filter-comparison`              | ✅     |
| 2.5.4       | Existence tests      | `@.optional`          | `plugin-filter-existence`               | ✅     |
| 2.5.5       | Function expressions | `func(...)`           | `plugin-filter-functions`               | ✅     |
| 2.5.5.2     | Regular expressions  | I-Regexp patterns     | `plugin-filter-regex`, `plugin-iregexp` | ✅     |

### Core Functions (RFC 9535 Section 2.6)

| RFC Section | Function   | Signature                             | Source Plugin           | Status |
| ----------- | ---------- | ------------------------------------- | ----------------------- | ------ |
| 2.6.1       | `length()` | `length(value) → number \| undefined` | `plugin-functions-core` | ✅     |
| 2.6.2       | `count()`  | `count(nodes) → number`               | `plugin-functions-core` | ✅     |
| 2.6.3       | `match()`  | `match(value, pattern) → boolean`     | `plugin-functions-core` | ✅     |
| 2.6.4       | `search()` | `search(value, pattern) → boolean`    | `plugin-functions-core` | ✅     |
| 2.6.5       | `value()`  | `value(nodes) → value \| undefined`   | `plugin-functions-core` | ✅     |

### Result Types (RFC 9535 Sections 2.7-2.8)

| RFC Section | Feature          | Description           | Source Plugin           | Status |
| ----------- | ---------------- | --------------------- | ----------------------- | ------ |
| 2.7         | Nodelist         | Query result nodes    | `plugin-result-node`    | ✅     |
| 2.7         | Values           | Extracted values      | `plugin-result-value`   | ✅     |
| 2.8         | Normalized paths | Canonical path format | `plugin-result-path`    | ✅     |
| RFC 6901    | JSON Pointer     | `/a/0/b` format       | `plugin-result-pointer` | ✅     |

---

## Package Changes Summary

### Packages to CREATE

| Package              | Purpose                                               |
| -------------------- | ----------------------------------------------------- |
| `@jsonpath/jsonpath` | Zero-config RFC 9535 engine entrypoint (main library) |

### Packages to DELETE

| Package                                | Reason                                              |
| -------------------------------------- | --------------------------------------------------- |
| `@jsonpath/complete`                   | Replaced by `@jsonpath/jsonpath`                    |
| `@lellimecnar/jsonpath-conformance`    | Moved into `@jsonpath/jsonpath` as test-only module |
| `@jsonpath/plugin-syntax-root`         | Consolidated into `@jsonpath/plugin-rfc-9535`       |
| `@jsonpath/plugin-syntax-current`      | Consolidated into `@jsonpath/plugin-rfc-9535`       |
| `@jsonpath/plugin-syntax-child-member` | Consolidated into `@jsonpath/plugin-rfc-9535`       |
| `@jsonpath/plugin-syntax-child-index`  | Consolidated into `@jsonpath/plugin-rfc-9535`       |
| `@jsonpath/plugin-syntax-wildcard`     | Consolidated into `@jsonpath/plugin-rfc-9535`       |
| `@jsonpath/plugin-syntax-union`        | Consolidated into `@jsonpath/plugin-rfc-9535`       |
| `@jsonpath/plugin-syntax-descendant`   | Consolidated into `@jsonpath/plugin-rfc-9535`       |
| `@jsonpath/plugin-syntax-filter`       | Consolidated into `@jsonpath/plugin-rfc-9535`       |
| `@jsonpath/plugin-filter-literals`     | Consolidated into `@jsonpath/plugin-rfc-9535`       |
| `@jsonpath/plugin-filter-boolean`      | Consolidated into `@jsonpath/plugin-rfc-9535`       |
| `@jsonpath/plugin-filter-comparison`   | Consolidated into `@jsonpath/plugin-rfc-9535`       |
| `@jsonpath/plugin-filter-existence`    | Consolidated into `@jsonpath/plugin-rfc-9535`       |
| `@jsonpath/plugin-filter-functions`    | Consolidated into `@jsonpath/plugin-rfc-9535`       |
| `@jsonpath/plugin-filter-regex`        | Consolidated into `@jsonpath/plugin-rfc-9535`       |
| `@jsonpath/plugin-iregexp`             | Consolidated into `@jsonpath/plugin-rfc-9535`       |
| `@jsonpath/plugin-functions-core`      | Consolidated into `@jsonpath/plugin-rfc-9535`       |
| `@jsonpath/plugin-result-value`        | Consolidated into `@jsonpath/plugin-rfc-9535`       |
| `@jsonpath/plugin-result-node`         | Consolidated into `@jsonpath/plugin-rfc-9535`       |
| `@jsonpath/plugin-result-path`         | Consolidated into `@jsonpath/plugin-rfc-9535`       |
| `@jsonpath/plugin-result-pointer`      | Consolidated into `@jsonpath/plugin-rfc-9535`       |

### Packages to MODIFY

| Package                          | Changes                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `@jsonpath/core`                 | Add `createPlugin` helper, phase system, component overrides, subpath exports |
| `@jsonpath/plugin-rfc-9535`      | Consolidate all RFC plugins as internal modules, add subpath exports          |
| `@jsonpath/cli`                  | Update imports to use `@jsonpath/jsonpath`                                    |
| `@jsonpath/compat-jsonpath`      | Update imports                                                                |
| `@jsonpath/compat-jsonpath-plus` | Update imports                                                                |
| `@jsonpath/compat-harness`       | Update imports                                                                |

### Packages UNCHANGED (Extension Plugins)

These remain as separate published packages:

- `@jsonpath/plugin-parent-selector` - `^` parent selector (stub - needs implementation)
- `@jsonpath/plugin-property-name-selector` - `~` key/keys selector (stub - needs implementation)
- `@jsonpath/plugin-type-selectors` - Type-based selectors (`@string()`, etc.) (stub - needs implementation)
- `@jsonpath/plugin-script-expressions` - SES-sandboxed script evaluation
- `@jsonpath/plugin-validate` - Validation orchestration
- `@jsonpath/plugin-result-parent` - Parent node references in results (NOT RFC 9535)
- `@jsonpath/plugin-result-types` - Type introspection for results (NOT RFC 9535)

### Packages to CREATE (Extension Plugins - Future Work)

These are NOT part of RFC 9535 but provide json-p3 feature parity:

| Package                                 | Purpose                           | json-p3 Reference                    |
| --------------------------------------- | --------------------------------- | ------------------------------------ |
| `@jsonpath/plugin-current-key-selector` | `#` current key/index identifier  | Extra Syntax: Current key identifier |
| `@jsonpath/plugin-functions-has`        | `has(@, pattern)` filter function | Extra Functions: `has()`             |

> **Note:** These extension plugins are tracked for future work but are NOT required for the RFC 9535 entrypoint (`@jsonpath/jsonpath`). Implementation of these plugins should be a separate PR.

---

## Implementation Steps

### Step 1: Audit current engine + plugin wiring

**Commit message:** `chore(jsonpath): audit current engine and plugin architecture`

**Files to analyze:**

- `packages/jsonpath/core/src/createEngine.ts`
- `packages/jsonpath/core/src/index.ts`
- `packages/jsonpath/core/src/plugins/types.ts`
- `packages/jsonpath/core/src/plugins/resolve.ts`
- `packages/jsonpath/core/src/runtime/hooks.ts`
- `packages/jsonpath/plugin-rfc-9535/src/index.ts`
- `packages/jsonpath/conformance/src/{corpus.ts,harness.ts,index.ts}`
- `packages/jsonpath/complete/src/index.ts`
- `packages/jsonpath/cli/src/run.ts`

**What:**

- Document the exact "default" engine surface today:
  - Core provides `createEngine({ plugins, options })` factory
  - RFC preset is implemented as `rfc9535Plugins` array + `createRfc9535Engine()` in `@jsonpath/plugin-rfc-9535`
  - Compliance harness lives under `@lellimecnar/jsonpath-conformance` (private)
  - `@jsonpath/complete` bundles RFC + extension plugins (to be deleted)
- Identify all import sites affected by:
  - Consolidating RFC plugins into `@jsonpath/plugin-rfc-9535`
  - Introducing `@jsonpath/jsonpath` entrypoint
  - Deleting `@jsonpath/complete`
- Map current hook registration patterns:
  - `ctx.engine.scanner` - Token rules via `scanner.register()`
  - `ctx.engine.parser.registerSegmentParser()` - Parsing
  - `ctx.engine.evaluators.registerSelector(kind, fn)` - Evaluation keyed by `selector.kind`
  - `ctx.engine.results` - Result mappers
  - `ctx.engine.lifecycle` - Token/AST transforms, evaluate middleware, error enrichers

**Deliverable:**

Create `plans/jsonpath/audit-notes.md` with:

- [ ] Current plugin inventory (plugin IDs, capabilities, dependencies)
- [ ] Hook registration patterns used by each plugin category
- [ ] Import dependency graph for RFC plugins
- [ ] List of packages that import `@jsonpath/complete` or individual RFC plugins
- [ ] Mapping of existing plugins to proposed phases (`syntax`, `filter`, `runtime`, `result`)

**Acceptance criteria:**

- Audit document exists and is complete
- No code changes in this step

---

### Step 2: Introduce `createPlugin` helper and phase system in `@jsonpath/core`

**Commit message:** `feat(core): add createPlugin helper and plugin phase system`

**Files to create:**

- `packages/jsonpath/core/src/plugins/createPlugin.ts`
- `packages/jsonpath/core/src/plugins/phases.ts`

**Files to modify:**

- `packages/jsonpath/core/src/plugins/types.ts`
- `packages/jsonpath/core/src/plugins/resolve.ts`
- `packages/jsonpath/core/src/createEngine.ts`
- `packages/jsonpath/core/src/index.ts`
- `packages/jsonpath/core/package.json`

**What:**

#### 2.1 Define phase enum and types

```typescript
// packages/jsonpath/core/src/plugins/phases.ts
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

```typescript
// packages/jsonpath/core/src/plugins/types.ts (additions)
export interface JsonPathPluginMeta {
	id: JsonPathPluginId;
	capabilities?: readonly JsonPathCapability[];
	dependsOn?: readonly JsonPathPluginId[];
	optionalDependsOn?: readonly JsonPathPluginId[];
	peerDependencies?: readonly string[];
	// NEW: Phase declarations
	phases: readonly PluginPhase[]; // Required: at least one phase
	allowMultiple?: boolean; // Default: false
	// NEW: Ordering constraints (optional)
	order?: {
		first?: boolean; // Run first in its phase
		last?: boolean; // Run last in its phase
		before?: readonly JsonPathPluginId[]; // Run before these plugins
		after?: readonly JsonPathPluginId[]; // Run after these plugins
	};
}
```

#### 2.3 Implement `createPlugin` helper

```typescript
// packages/jsonpath/core/src/plugins/createPlugin.ts
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

- Modify `resolvePlugins()` to:
  - Group plugins by declared phase
  - Apply ordering constraints within each phase
  - Produce deterministic execution order: `syntax` → `filter` → `runtime` → `result`
  - Handle duplicate detection (`allowMultiple: false` → warn + last wins)
  - Handle unsatisfiable constraints (warn + fallback to stable `id` ordering)

#### 2.5 Add component overrides to `CreateEngineOptions`

```typescript
// packages/jsonpath/core/src/createEngine.ts
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

- `packages/jsonpath/core/src/ast.ts` → re-exports `@jsonpath/ast`
- `packages/jsonpath/core/src/lexer.ts` → re-exports `@jsonpath/lexer`
- `packages/jsonpath/core/src/parser.ts` → re-exports `@jsonpath/parser`

**Acceptance criteria:**

- [ ] `createPlugin` is exported from `@jsonpath/core`
- [ ] `PluginPhases` and `PhaseOrder` are exported
- [ ] `JsonPathPluginMeta` includes `phases`, `allowMultiple`, and `order` fields
- [ ] `resolvePlugins()` orders plugins by phase then by constraints
- [ ] `createEngine()` accepts `components` overrides
- [ ] Subpath exports work: `import { ... } from '@jsonpath/core/ast'`
- [ ] All existing `@jsonpath/core` tests pass
- [ ] New tests cover phase ordering and constraint resolution

**Testing:**

```bash
pnpm --filter @jsonpath/core test
```

---

### Step 3: Consolidate RFC 9535 plugins into `@jsonpath/plugin-rfc-9535`

**Commit message:** `feat(plugin-rfc-9535): consolidate all RFC plugins as internal modules`

**Files to create:**

> **Note:** `plugin-syntax-child-index` handles both array index `[n]` AND array slice `[start:end:step]` per RFC 9535 Sections 2.3.3-2.3.4.

```
packages/jsonpath/plugin-rfc-9535/src/plugins/
├── syntax/
│   ├── root.ts
│   ├── current.ts
│   ├── child-member.ts
│   ├── child-index.ts          # Handles both Index and Slice selectors
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

**Files to modify:**

- `packages/jsonpath/plugin-rfc-9535/package.json`
- `packages/jsonpath/plugin-rfc-9535/src/index.ts`

**What:**

#### 3.1 Migrate plugin source code

For each RFC plugin package:

1. Copy `src/` contents into appropriate subdirectory under `plugin-rfc-9535/src/plugins/`
2. Update imports to use relative paths or `@jsonpath/core`
3. Convert to use `createPlugin` helper from `@jsonpath/core`
4. Add phase declarations to each plugin meta

Example migration for `plugin-syntax-root`:

```typescript
// packages/jsonpath/plugin-rfc-9535/src/plugins/syntax/root.ts
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

```json
{
	"exports": {
		".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
		"./plugins/syntax/root": {
			"types": "./dist/plugins/syntax/root.d.ts",
			"default": "./dist/plugins/syntax/root.js"
		},
		"./plugins/syntax/current": { "...": "..." }
		// ... all other plugin subpaths
	}
}
```

#### 3.3 Update main index.ts

```typescript
// packages/jsonpath/plugin-rfc-9535/src/index.ts
import { createPlugin, PluginPhases } from '@jsonpath/core';

// Re-export individual plugin factories
export { createSyntaxRootPlugin } from './plugins/syntax/root';
export { createSyntaxCurrentPlugin } from './plugins/syntax/current';
// ... all other exports

// Bundle array (order does NOT encode semantics)
export const rfc9535Plugins = [
	createSyntaxRootPlugin(),
	createSyntaxCurrentPlugin(),
	// ... all plugins
] as const;

// Convenience engine factory
export function createRfc9535Engine(options?: Rfc9535EngineOptions) {
	return createEngine({
		plugins: rfc9535Plugins,
		options: {
			/* ... */
		},
	});
}

// Preset meta-plugin
export const plugin = createPlugin({
	meta: {
		id: '@jsonpath/plugin-rfc-9535',
		phases: [], // Meta-plugin has no phases
		capabilities: ['preset:rfc9535'],
		dependsOn: rfc9535Plugins.map((p) => p.meta.id),
	},
	setup: () => undefined,
});
```

**Acceptance criteria:**

- [ ] All RFC plugin source code lives under `plugin-rfc-9535/src/plugins/`
- [ ] Each plugin uses `createPlugin` helper
- [ ] Each plugin declares appropriate phase(s)
- [ ] Subpath exports work: `import { createSyntaxRootPlugin } from '@jsonpath/plugin-rfc-9535/plugins/syntax/root'`
- [ ] `rfc9535Plugins` array is exported and non-empty
- [ ] All existing `@jsonpath/plugin-rfc-9535` tests pass
- [ ] New smoke tests verify plugin meta stability

**Testing:**

```bash
pnpm --filter @jsonpath/plugin-rfc-9535 test
```

---

### Step 4: Delete old RFC plugin packages (workspace cleanup)

**Commit message:** `chore(jsonpath): delete consolidated RFC plugin packages`

**Directories to delete:**

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

> **Note:** `plugin-result-parent/` and `plugin-result-types/` are NOT deleted. They remain as separate extension plugins (not RFC 9535 standard).

**Files to update:**

- `pnpm-workspace.yaml` (if it enumerates packages explicitly)
- Any Turbo filters referencing deleted packages
- Any root-level scripts referencing deleted packages

**What:**

- Remove all consolidated plugin directories
- Remove `@jsonpath/complete` (replaced by `@jsonpath/jsonpath`)
- Ensure workspace resolves cleanly

**Acceptance criteria:**

- [ ] All listed directories are deleted
- [ ] `pnpm install` succeeds
- [ ] `pnpm -w -r build --filter @jsonpath/*` succeeds
- [ ] No remaining references to deleted package names in workspace

**Testing:**

```bash
pnpm install
pnpm -w -r build --filter @jsonpath/*
```

---

### Step 5: Introduce `@jsonpath/jsonpath` (zero-config engine entrypoint)

**Commit message:** `feat(jsonpath): add @jsonpath/jsonpath as main entrypoint`

**Files to create:**

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

**What:**

#### 5.1 Create package.json

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

```typescript
// packages/jsonpath/jsonpath/src/index.ts
import {
	createEngine as coreCreateEngine,
	type JsonPathEngine,
} from '@jsonpath/core';
import { rfc9535Plugins, createRfc9535Engine } from '@jsonpath/plugin-rfc-9535';

// Re-export commonly needed types/errors
export { JsonPathError, JsonPathErrorCodes } from '@jsonpath/core';
export type {
	JsonPathEngine,
	CompileResult,
	EvaluateOptions,
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

// Default engine export (lazy)
export const engine: JsonPathEngine = new Proxy({} as JsonPathEngine, {
	get(_, prop) {
		return (getDefaultEngine() as any)[prop];
	},
});

export default engine;

// Factory for custom engines (RFC defaults + extra plugins)
export interface CreateEngineOptions {
	plugins?: readonly JsonPathPlugin<any>[];
	components?: CreateEngineComponentOverrides;
	options?: CreateEngineRuntimeOptions;
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
	options?: EvaluateOptions,
): unknown[] {
	const eng = getDefaultEngine();
	const compiled = eng.compile(expression);
	return eng.evaluateSync(compiled, json, options);
}

export async function evaluateAsync(
	expression: string,
	json: unknown,
	options?: EvaluateOptions,
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

**Acceptance criteria:**

- [ ] Package builds successfully
- [ ] `import engine from '@jsonpath/jsonpath'` works
- [ ] `import { evaluateSync } from '@jsonpath/jsonpath'` works
- [ ] `createEngine({ plugins: [myPlugin] })` appends to RFC plugins
- [ ] Default engine is RFC 9535 compliant
- [ ] Convenience helpers work correctly

**Testing:**

```bash
pnpm --filter @jsonpath/jsonpath test
```

---

### Step 6: Move compliance apparatus into `@jsonpath/jsonpath`

**Commit message:** `chore(jsonpath): move compliance harness into @jsonpath/jsonpath`

**Files to create/move:**

```
packages/jsonpath/jsonpath/src/__tests__/
├── compliance/
│   ├── corpus.ts      # Migrated from conformance/src/corpus.ts
│   ├── harness.ts     # Migrated from conformance/src/harness.ts
│   ├── cts.ts         # Migrated from conformance/src/cts.ts
│   └── index.ts
└── compliance.spec.ts
```

**Directories to delete:**

```
packages/jsonpath/conformance/
```

**Files to update:**

- `packages/jsonpath/compat-harness/src/compat.spec.ts` (update imports)

**What:**

- Move compliance corpus + harness into `@jsonpath/jsonpath` as **test-only modules**
- Keep `napa` configuration in `package.json` for fetching external test suite
- The compliance code lives under `src/__tests__/` and is NOT exported
- Update `compat-harness` to import from the new location (or inline what it needs)

**Acceptance criteria:**

- [ ] `packages/jsonpath/conformance/` is deleted
- [ ] Compliance harness lives under `@jsonpath/jsonpath/src/__tests__/compliance/`
- [ ] Compliance code is NOT exported from the package
- [ ] `napa` fetch still works via `postinstall`
- [ ] Basic compliance test runs and passes

**Testing:**

```bash
pnpm --filter @jsonpath/jsonpath test
```

---

### Step 7: Update ecosystem packages

**Commit message:** `refactor(jsonpath): update ecosystem to use @jsonpath/jsonpath`

**Files to update:**

- `packages/jsonpath/cli/src/run.ts`
- `packages/jsonpath/cli/package.json`
- `packages/jsonpath/compat-jsonpath/src/index.ts`
- `packages/jsonpath/compat-jsonpath/package.json`
- `packages/jsonpath/compat-jsonpath-plus/src/index.ts`
- `packages/jsonpath/compat-jsonpath-plus/package.json`
- `packages/jsonpath/compat-harness/src/compat.spec.ts`
- `packages/jsonpath/compat-harness/package.json`

**What:**

#### 7.1 Update CLI

```typescript
// packages/jsonpath/cli/src/run.ts
import { createEngine } from '@jsonpath/jsonpath';
// Previously: import { createCompleteEngine } from '@jsonpath/complete';

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

**Acceptance criteria:**

- [ ] No references to `@jsonpath/complete` remain
- [ ] No references to deleted plugin packages remain
- [ ] All updated packages build successfully
- [ ] All updated packages' tests pass

**Testing:**

```bash
pnpm --filter @jsonpath/cli test
pnpm --filter @jsonpath/compat-jsonpath test
pnpm --filter @jsonpath/compat-jsonpath-plus test
pnpm --filter @jsonpath/compat-harness test
```

---

### Step 8: Final workspace integrity pass

**Commit message:** `chore(jsonpath): finalize workspace after restructure`

**Files to review/update:**

- `turbo.json` (remove any filters referencing deleted packages)
- Root `package.json` (update any jsonpath-related scripts)
- `README.md` files in jsonpath packages
- `specs/jsonpath.md` (update package references)
- `docs/api/jsonpath.md` (if exists)

**What:**

- Verify all workspace packages build and test
- Update documentation to reflect new package structure
- Ensure no dangling references to deleted packages

**Acceptance criteria:**

- [ ] `pnpm -w -r build --filter @jsonpath/*` succeeds
- [ ] `pnpm -w -r test --filter @jsonpath/*` succeeds
- [ ] No references to deleted packages in docs
- [ ] README files are updated with new import paths

**Testing:**

```bash
pnpm -w -r build --filter @jsonpath/*
pnpm -w -r test --filter @jsonpath/*
```

---

## Risk Mitigation

| Risk                                | Mitigation                                                   |
| ----------------------------------- | ------------------------------------------------------------ |
| Breaking existing consumers         | v0 implementation; no backward compat required               |
| Plugin ordering regression          | Comprehensive tests for phase ordering                       |
| Missing imports after consolidation | Grep for all old package names before merging                |
| Build failures                      | Incremental commits allow rollback to specific step          |
| Test failures in compat packages    | May have pre-existing issues; document and skip if unrelated |

---

## Success Criteria

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

## Post-Implementation Follow-up

After this plan is complete, consider:

1. **Publish to npm** - Publish all `@jsonpath/*` packages
2. **Update specs** - Sync `specs/jsonpath.md` with final implementation
3. **Migration guide** - Document migration from old imports
4. **Performance testing** - Benchmark the consolidated plugin bundle
5. **Compliance suite** - Run full RFC 9535 compliance tests
