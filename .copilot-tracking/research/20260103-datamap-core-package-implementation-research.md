<!-- markdownlint-disable-file -->

# Task Research Notes: @data-map/core Spec-Compliance Planning Inputs (packages/data-map/core)

## Research Executed

### File Analysis

- package.json (repo root)
  - Defines monorepo scripts: `pnpm test` runs `turbo test -- --passWithNoTests`; `pnpm type-check` runs `turbo type-check`.
- vitest.config.ts (repo root)
  - Root Vitest “projects” points at per-workspace `vitest.config.ts` files.
- packages/config-vitest/base.ts
  - Shared Vitest defaults for packages (globals, coverage defaults, and `setupFiles`).
- packages/config-typescript/base.json
  - Shared TS compiler defaults; most workspaces extend this via `@lellimecnar/typescript-config`.
- packages/data-map/core/package.json
  - Confirms this package is ESM (`type: "module"`) and uses Vitest (`test: vitest run`).
- packages/data-map/core/tsconfig.json
  - Confirms this package compiles as `module: ESNext` with `moduleResolution: Bundler` and excludes tests from builds.
- packages/data-map/core/src/datamap.ts
  - Primary implementation for Read API + Write API + patch + array helpers + batch + transaction.
- packages/data-map/core/src/subscription/manager.ts
  - Subscription manager: static + dynamic matching, bloom filter optimization, structural watcher re-expansion.
- packages/data-map/core/src/definitions/registry.ts and packages/data-map/core/src/definitions/types.ts
  - Definition registration (pointer + JSONPath), getter/setter transforms, deps handling, `defaultValue` type presence.
- packages/data-map/core/src/path/compile.ts and packages/data-map/core/src/path/predicate.ts
  - JSONPath subset compiler with caching, match + expand, filter predicate compilation and hashing.
- packages/data-map/core/src/patch/array.ts and packages/data-map/core/src/patch/apply.ts
  - Patch builders for array operations and RFC6902 application + affected/structural pointer tracking.

### Code Search Results

- `queueMicrotask`
  - Found in packages/data-map/core/src/**fixtures**/helpers.ts (test utility `flushMicrotasks`).
- `transformedValue`
  - Found in packages/data-map/core/src/subscription/manager.ts (`NotificationResult` and handler return chaining).
- `defaultValue`
  - Only present in packages/data-map/core/src/definitions/types.ts (not used in registry implementation).

### External Research

- (Not needed for this pass)

### Project Conventions

- Standards referenced: packages/config-vitest/base.ts, packages/config-typescript/base.json
- Instructions followed: root AGENTS.md workspace commands, `.github/copilot-instructions.md` monorepo conventions

## Key Discoveries

### A) Project-wide: tests, organization, TS/module system

#### Commands to run tests for @data-map/core

- Workspace-local scripts are defined in packages/data-map/core/package.json:

```json
{
	"name": "@data-map/core",
	"scripts": {
		"test": "vitest run",
		"test:watch": "vitest",
		"test:coverage": "vitest run --coverage"
	}
}
```

- Recommended from repo root (no `cd`):
  - `pnpm --filter @data-map/core test`
  - `pnpm --filter @data-map/core test:watch`
  - `pnpm --filter @data-map/core test:coverage`
  - Or run through Turbo (repo root script): `pnpm test` (runs tests across workspaces).

#### How tests are organized (and setup files)

- Tests are co-located with source under packages/data-map/core/src/\*\*:
  - Top-level spec: packages/data-map/core/src/datamap.spec.ts
  - Feature-area specs: packages/data-map/core/src/subscription/_.spec.ts, packages/data-map/core/src/path/_.spec.ts, packages/data-map/core/src/patch/\*.spec.ts, etc.
  - Additional tests under packages/data-map/core/src/**tests**/\*\*.

- Vitest setup is inherited from @lellimecnar/vitest-config:

```ts
// packages/config-vitest/base.ts
export function vitestBaseConfig(): ViteUserConfig {
	return {
		test: {
			globals: true,
			passWithNoTests: true,
			setupFiles: [resolveLocalFile('./setup/reflect-metadata.ts')],
		},
	};
}
```

- @data-map/core extends base config and adds coverage thresholds:

```ts
// packages/data-map/core/vitest.config.ts
const base = vitestBaseConfig();
export default defineConfig({
	...base,
	test: {
		...(base.test ?? {}),
		coverage: {
			...((base.test as any)?.coverage ?? {}),
			thresholds: {
				statements: 90,
				lines: 90,
				branches: 85,
				functions: 95,
			},
		},
	},
});
```

#### TypeScript config patterns and module system

- Root TS config is minimal and extends the shared baseline:

```json
// tsconfig.json (repo root)
{ "extends": "@lellimecnar/typescript-config" }
```

- Shared baseline (`@lellimecnar/typescript-config`) is based on Vercel’s style guide and targets modern JS:

```json
// packages/config-typescript/base.json
{
	"extends": ["@vercel/style-guide/typescript/node20"],
	"compilerOptions": {
		"strict": true,
		"target": "ESNext",
		"lib": ["ESNext", "DOM", "Decorators"],
		"noEmit": true
	}
}
```

- @data-map/core overrides to match Vite/ESM library builds:

```jsonc
// packages/data-map/core/tsconfig.json
{
	"extends": "@lellimecnar/typescript-config",
	"compilerOptions": {
		"module": "ESNext",
		"moduleResolution": "Bundler",
	},
	"exclude": ["src/**/*.spec.ts", "src/**/__tests__/**"],
}
```

- @data-map/core is ESM at runtime:

```json
// packages/data-map/core/package.json
{ "type": "module" }
```

- Monorepo: pnpm workspaces + Turborepo.
  - Apps: `web/*` (Next.js 14+), `mobile/*` (Expo)
  - Packages:
    - Shared libraries: `packages/*`
    - Domain packages: `packages/card-stack/*`
- Workspace dependency policy:
  - Never use file-path dependencies.

### B) Package @data-map/core deep dive (actual behavior today)

#### 1) DataMap.patch(): before-hook notifications and transformed values

- Files: packages/data-map/core/src/datamap.ts, packages/data-map/core/src/subscription/manager.ts
- Key symbols: `DataMap.patch`, `SubscriptionManagerImpl.notify`, `SubscriptionManagerImpl.invokeHandlers`

`DataMap.patch()` runs `before` notifications synchronously for each op, and only checks cancel; it does not apply returned (transformed) values:

```ts
// packages/data-map/core/src/datamap.ts
for (const op of ops) {
	const before = this._subs.notify(
		op.path,
		'patch',
		'before',
		this.get(op.path),
		undefined,
		op,
		op.path,
	);
	if (before.cancelled) throw new Error('Patch cancelled by subscription');
}
```

The subscription manager _can_ accept transformed values via handler return, but `DataMap.patch()` currently ignores them:

```ts
// packages/data-map/core/src/subscription/manager.ts
const ret = sub.config.fn(
	currentValue,
	info,
	cancel,
	this.dataMap,
	this.dataMap.context as any,
);
if (ret !== undefined) {
	transformedValue = ret;
	currentValue = ret;
}
```

Gotcha: “set subscriptions catch patch events” is implemented as a stage-selection alias, not as changing `event.type`:

```ts
// packages/data-map/core/src/subscription/manager.ts
if (event === 'patch' && list.includes('set')) return true;
```

So handlers configured for `after: 'set'` will run on patch events, but receive `event.type === 'patch'` (see tests).

#### 2) Subscription manager: notify pipeline, cancel behavior, expandedPaths, filters, structural tracking

- Files: packages/data-map/core/src/subscription/manager.ts, packages/data-map/core/src/subscription/types.ts
- Key symbols: `SubscriptionManagerImpl.register`, `notify`, `invokeHandlers`, `handleStructuralChange`

**Notify pipeline:** DataMap calls `notify(..., 'before'|'on'|'after', ...)`. Manager selects subscriptions via bloom/reverse index + dynamic matching, then invokes handlers.

```ts
// packages/data-map/core/src/subscription/manager.ts
const staticIds = this.reverseIndex.get(pointer) ?? new Set<string>();
const dynamicIds = this.findDynamicMatches(pointer);
const all = new Set<string>([...staticIds, ...dynamicIds]);
return this.invokeHandlers(
	all,
	pointer,
	event,
	stage,
	value,
	previousValue,
	operation,
	originalPath,
);
```

**Cancel behavior:** `cancel()` only stops further handlers for the current notify call; only `before` stage cancels a patch end-to-end (because DataMap throws).

```ts
// packages/data-map/core/src/subscription/manager.ts
const cancel = () => { cancelled = true; };
...
if (cancelled) break;
```

**expandedPaths behavior:**

- Pointer subscription: `expandedPaths = new Set([config.path])`.
- JSONPath subscription: compiled pattern is expanded against current snapshot (`dataMap.toJSON()`), and those pointers are inserted into reverse index.

```ts
// packages/data-map/core/src/subscription/manager.ts
const pointers = compiledPattern.expand(data);
expandedPaths = new Set(pointers);
for (const p of pointers) this.addToReverseIndex(p, id);
```

**Filter subscriptions:** `compilePathPattern()` supports filter segments only for arrays in `expandSegments` and uses `compilePredicate()` (dynamic `Function`) for predicates.

```ts
// packages/data-map/core/src/path/compile.ts
if (head.type === 'filter') {
  const arr = Array.isArray(data) ? data : [];
  for (let idx = 0; idx < arr.length; idx++) {
    const v = arr[idx];
    if (head.predicate(v, idx, arr)) { ... }
  }
}
```

**Structural change tracking and re-expansion:**

- Patch application computes `structuralPointers` as parent pointers for `add/remove/move/copy` operations.
- DataMap calls `SubscriptionManagerImpl.handleStructuralChange(pointer)` for each structural pointer.

```ts
// packages/data-map/core/src/patch/apply.ts
if (isStructuralOp(op)) {
	structuralPointers.add(parentPointer(op.path));
}
```

`handleStructuralChange` recomputes `expandedPaths` for watchers, updates reverse index, and **only notifies newly-added matches** (no “removed match” notifications):

```ts
// packages/data-map/core/src/subscription/manager.ts
for (const p of removed) this.removeFromReverseIndex(p, id);
for (const p of added) {
	this.addToReverseIndex(p, id);
	this.bloomFilter.add(p);
	const v = this.dataMap.get(p);
	this.invokeHandlers(
		new Set([id]),
		p,
		'set',
		'after',
		v,
		undefined,
		{ op: 'add', path: p, value: v } as any,
		sub.config.path,
	);
}
```

Gotchas to reuse/consider:

- `structuralDependencies` for a pattern is currently computed as only the concrete prefix pointer (see path compiler), so re-expansion triggers are coarse.
- `replace` operations are _not_ treated as structural, so array `sort()` / `shuffle()` (which emit `replace`) won’t trigger `handleStructuralChange` even though indices conceptually shift.

#### 3) Definitions registry: registration, applyGetter/applySetter, deps/defaultValue usage

- Files: packages/data-map/core/src/definitions/registry.ts, packages/data-map/core/src/definitions/types.ts
- Key symbols: `DefinitionRegistry.registerAll`, `register`, `applyGetter`, `applySetter`

Registration supports:

- Pointer-targeted definitions: `{ pointer: '/x', ... }`
- JSONPath-targeted definitions: `{ path: '$.users[*].name', ... }` (compiled via `compilePathPattern`).

```ts
// packages/data-map/core/src/definitions/registry.ts
if ('path' in def && typeof def.path === 'string') {
	this.defs.push({ def, pattern: compilePathPattern(def.path) });
	return;
}
this.defs.push({ def, pattern: null });
```

Getter application is chained (multiple defs can target same pointer):

```ts
// packages/data-map/core/src/definitions/registry.ts
for (const def of defs) {
	if (!def.get) continue;
	const cfg = typeof def.get === 'function' ? { fn: def.get } : def.get;
	const depValues = (cfg.deps ?? def.deps ?? []).map((d) =>
		this.dataMap.get(d, { strict: false }),
	);
	v = cfg.fn(v, depValues, this.dataMap, ctx);
}
```

Setter behavior:

- Enforces `readOnly`.
- If multiple setters exist, the **first matching setter wins** (returns early).

```ts
// packages/data-map/core/src/definitions/registry.ts
for (const def of defs) {
  if (def.readOnly) throw new Error(`Read-only path: ${pointer}`);
  if (!def.set) continue;
  ...
  return cfg.fn(newValue, currentValue, depValues, this.dataMap, ctx);
}
return newValue;
```

Deps representation exists in two places:

- On the definition: `deps?: string[]`
- Per-get/per-set config: `{ deps?: string[]; fn: ... }`

`defaultValue?: unknown` is defined in the type but is not referenced in registry logic.

#### 4) Path compile: CompiledPathPattern + match result + concretePrefix + segment types + serialization helpers

- Files: packages/data-map/core/src/path/compile.ts, packages/data-map/core/src/path/segments.ts, packages/data-map/core/src/path/predicate.ts
- Key symbols: `CompiledPathPattern`, `compilePathPattern`, `compilePredicate`

`CompiledPathPattern` shape (highlights):

```ts
export interface CompiledPathPattern {
  readonly source: string;
  readonly segments: readonly PathSegment[];
  readonly isSingular: boolean;
  readonly hasRecursiveDescent: boolean;
  readonly hasFilters: boolean;
  readonly concretePrefix: readonly (StaticSegment | IndexSegment)[];
  readonly concretePrefixPointer: string;
  readonly structuralDependencies: readonly string[];
  match: (...) => {
    matches: boolean;
    reason?: string;
    matchDepth?: number;
    failedAtDepth?: number;
  };
  expand: (data: unknown) => string[];
}
```

Segment types are in packages/data-map/core/src/path/segments.ts:

- `static`, `index`, `wildcard`, `slice`, `filter` (with `predicate`, `expression`, `hash`), `recursive`.

Predicate compilation caches by filter expression:

```ts
// packages/data-map/core/src/path/predicate.ts
const cached = predicateCache.get(expression);
...
const fn = new Function('value','key','parent', `... return Boolean(${body}); ...`) as PredicateFn;
```

There is currently **no** `CompiledPathPattern.toJSON()` and no `SerializedPattern` type in the codebase.

#### 5) Array operations: which have .toPatch variants today

- Files: packages/data-map/core/src/datamap.ts, packages/data-map/core/src/patch/array.ts

In `DataMap`:

- Has `.toPatch`: `set.toPatch`, `setAll.toPatch`, `map.toPatch`, `patch.toPatch`, `push.toPatch`, `unshift.toPatch`, `sort.toPatch`, `shuffle.toPatch`.
- No `.toPatch`: `pop()`, `shift()`, `splice()` (these return removed values and apply immediately).

Patch builders exist for all of these in packages/data-map/core/src/patch/array.ts:

- `buildPopPatch`, `buildShiftPatch`, `buildSplicePatch` already return `{ ops, value/removed }`.

#### 6) get()/resolve(): whether subscription events fire and where

- File: packages/data-map/core/src/datamap.ts

`SubscriptionEvent` includes `'get'` and `'resolve'`:

```ts
// packages/data-map/core/src/subscription/types.ts
export type SubscriptionEvent = 'get' | 'set' | 'remove' | 'resolve' | 'patch';
```

But `DataMap.get()` and `DataMap.resolve()` currently do **not** call `this._subs.notify(...)`.
Only `patch()` (and batch flush) calls notify, always with `event: 'patch'`.

#### package.json patterns (libraries)

- Minimal library example: packages/utils/package.json
  - `type: "module"`
  - `exports["."] = { types: "./dist/index.d.ts", default: "./dist/index.js" }`
  - `main` + `types` mirror exports
  - devDeps include shared workspace configs:
    - `@lellimecnar/eslint-config` `workspace:*`
    - `@lellimecnar/typescript-config` `workspace:*`

- Library-with-tests example: packages/polymix/package.json and packages/card-stack/core/package.json
  - Adds scripts:
    - `test: vitest run`
    - `test:coverage: vitest run --coverage`
  - Includes `files: ["dist"]` when publishable.

Observed in packages/utils/vite.config.ts (also polymix, card-stack/core):

- Uses shared config: `mergeConfig(viteNodeConfig(), { ... })`
- Type declarations:
  - `vite-plugin-dts` with `entryRoot: 'src'`, `outDir: 'dist'`, `tsconfigPath: 'tsconfig.json'`
  - `build.lib.entry = 'src/index.ts'`, formats `['es']`
  - Rollup output:
    - `preserveModules: true`
    - `entryFileNames: '[name].js'`
- Externalization:
  - Externalize all `dependencies` and `peerDependencies` (plus `node:` builtins) via a function.

#### Vitest config pattern

- `vitestBaseConfig()` from packages/config-vitest/base.ts
  - `globals: true`
  - `passWithNoTests: true`
  - coverage provider `v8`, reporters include `text`, `html`, `lcov`, `json`
  - `setupFiles` loads optional `reflect-metadata`

- Root tsconfig.json extends `@lellimecnar/typescript-config`.
  - exclude `dist`, `node_modules`, often excludes `src/**/*.spec.ts`

#### Exports patterns

- “Granular exports” (tree-shakeable UI): packages/ui exports many subpaths and explicitly warns not to import from package root.
  - This granular pattern appears specific to `@lellimecnar/ui` and not required for generic packages.

#### Test naming and layout

- Co-located tests under `src/**` with `*.spec.ts` naming.
- Vitest is configured per-package, not at repo root.
  - Root: `pnpm build` → `turbo build`
  - Packages: `build` generally runs `vite build` for library packages.

- Test:
  - Root: `pnpm test` → `turbo test -- --passWithNoTests`
- Turbo execution model:
  - Filter a single workspace with `turbo run -F <workspace>` (also used in root scripts like `pnpm ui`).

## Complete Examples

```ts
// Minimal excerpts showing current behavior patterns

// 1) Test helper: flush microtasks
export async function flushMicrotasks(): Promise<void> {
  await new Promise<void>((resolve) => {
    queueMicrotask(resolve);
  });
}

// 2) Patch application returns (nextData, affectedPointers, structuralPointers)
export function applyOperations(currentData: unknown, ops: Operation[]): ApplyResult {
  const working = structuredClone(currentData);
  jsonpatch.apply(ops as any, working as any);
  ...
  return { nextData: working, affectedPointers, structuralPointers };
}
```

## Recommended Approach

Focus implementation work for spec-compliance in a way that reuses existing, already-central abstractions:

- Write/patch entrypoint: `DataMap.patch()` (packages/data-map/core/src/datamap.ts)
- Notification router: `SubscriptionManagerImpl` (packages/data-map/core/src/subscription/manager.ts)
- Definition transforms: `DefinitionRegistry` (packages/data-map/core/src/definitions/registry.ts)
- Path engine: `compilePathPattern()` (packages/data-map/core/src/path/compile.ts)
- Patch builder helpers: packages/data-map/core/src/patch/\*

## Implementation Guidance

### C) Testing patterns (exact files + helpers)

Requested test file paths (exact matches in repo):

- datamap.spec.ts
  - packages/data-map/core/src/datamap.spec.ts
- manager.spec.ts
  - packages/data-map/core/src/subscription/manager.spec.ts
- compile.spec.ts
  - packages/data-map/core/src/path/compile.spec.ts
- array.spec.ts
  - packages/data-map/core/src/patch/array.spec.ts

Requested but not present under that exact name:

- registry.spec.ts
  - No `*registry*.spec.ts` exists in packages/data-map/core/src.
  - Closest coverage is packages/data-map/core/src/definitions/definitions.spec.ts (exercises `DefinitionRegistry`).

Test helpers/utilities in package:

- packages/data-map/core/src/**fixtures**/data.ts
  - Provides `complexData` used by tests.
- packages/data-map/core/src/**fixtures**/helpers.ts
  - `createDataMap()` factory
  - `createEventSpy()`
  - `flushMicrotasks()` (uses `queueMicrotask`)

```ts
// packages/data-map/core/src/__fixtures__/helpers.ts
export async function flushMicrotasks(): Promise<void> {
	await new Promise<void>((resolve) => {
		queueMicrotask(resolve);
	});
}
```

### D) Implementation guidance inputs (repo-consistent, minimal hooks)

Below are planning inputs (not code) for the changes you listed.

#### before-hook transformedValue application

- Where it must hook: packages/data-map/core/src/datamap.ts `DataMap.patch()`.
- Existing building block: `SubscriptionManagerImpl.notify()` returns `{ transformedValue }`.
- Current gotcha: patch ignores `before.transformedValue`.

Plan input: if a `before` handler returns a value, only operations with a `value` field can be transformed (`add`, `replace`, maybe `test`). `remove/move/copy` do not have a `value` to rewrite. For multi-op patches, decide whether transformations are per-op only or can cascade.

#### defaultValue handling

- Where definition type exists: packages/data-map/core/src/definitions/types.ts (`defaultValue?: unknown`).
- Where values are produced: packages/data-map/core/src/datamap.ts `resolve()` calls `applyGetter(pointer, rawValue, ctx)`.
- Current gotcha: missing pointers in non-strict mode often return `[]` from `resolve()` and never reach `applyGetter()`.

Plan input: enable `defaultValue` by ensuring the “missing pointer” path still runs getter evaluation (or by teaching registry to substitute `defaultValue` when rawValue is `undefined`).

#### CompiledPathPattern.toJSON and SerializedPattern type

- Where to attach: packages/data-map/core/src/path/compile.ts (pattern object literal).
- Current gotcha: `segments` include `predicate` functions (not serializable), but also store `expression` and `hash` which are serializable.
- Existing abstraction to reuse: `compilePredicate(expression)` rebuilds predicate and caches by expression.

Plan input: `toJSON()` should likely serialize:

- `source`
- `segments` in a function-free representation (e.g., filter segments store `expression`/`hash` only)
- Derived fields (`concretePrefixPointer`, etc.) can be recomputed on deserialize or recompile.

#### computed caching + invalidation (where to store, keying)

- Where getter transforms currently run: packages/data-map/core/src/definitions/registry.ts `applyGetter()`.
- Where patch impacts can be observed: packages/data-map/core/src/patch/apply.ts returns `affectedPointers` and `structuralPointers`.

Plan input: store cache in `DefinitionRegistry` (per DataMap instance) keyed by pointer string; invalidate on `patch()` using `affectedPointers` and also dep pointers (see next item).

#### deps auto-subscription (avoid circular deps), where to hook

- Where deps are declared and read: packages/data-map/core/src/definitions/registry.ts reads deps via `this.dataMap.get(d, { strict: false })`.
- Current gotcha: deps are read synchronously during getter application; there is no subscription linkage.

Plan input: add a registry-level dependency graph at `register(def)` time and subscribe to dep pointers via `DataMap.subscribe` to invalidate cached computed pointers. To avoid circular deps, detect cycles when registering or when connecting dep edges (at minimum, ignore dep edges that point to self, and guard recursion in getter evaluation).

#### queueMicrotask batching (where to introduce scheduler)

- Existing batching today: packages/data-map/core/src/batch/manager.ts is explicit and synchronous.
- Test helper indicates microtask usage pattern but implementation does not schedule notifications.

Plan input: introduce a scheduler either:

- In `DataMap.patch()` to defer notification dispatch (collect affected pointers and flush in `queueMicrotask`), or
- In `SubscriptionManagerImpl` to queue invokes and coalesce per-pointer.

Keep it consistent with existing `BatchManager` API: collect operations/pointers during the tick and flush once.

#### filter re-expansion on criteria change

- Where filters exist: packages/data-map/core/src/path/compile.ts (`hasFilters`, filter segments) and match uses `getValue(fullPtr)`.
- Current gotcha: structural re-expansion is only triggered by add/remove/move/copy parent pointers; changes to fields that affect a filter predicate do not cause re-expansion.

Plan input: for patterns with `hasFilters`, treat certain non-structural updates as “re-expansion triggers” (e.g., any `affectedPointer` under `concretePrefixPointer`). This likely belongs where `structuralPointers` are currently handled (packages/data-map/core/src/datamap.ts) so it can call `handleStructuralChange` with the correct watched pointer.

#### add toPatch variants for pop/shift/splice

- Existing builders already return ops:
  - packages/data-map/core/src/patch/array.ts: `buildPopPatch`, `buildShiftPatch`, `buildSplicePatch`.
- Current DataMap API missing `.toPatch` on: `pop`, `shift`, `splice`.

Plan input: add `pop.toPatch`, `shift.toPatch`, `splice.toPatch` that return only `Operation[]` (consistent with existing `.toPatch` API), while the non-toPatch methods can continue returning removed values.

#### fire get/resolve subscription events

- Events exist in types: packages/data-map/core/src/subscription/types.ts includes `'get'` and `'resolve'`.
- Current gotcha: no notify calls exist in `get()` or `resolve()`.

Plan input: the most localized hook is inside:

- `DataMap.resolve()` for each matched pointer (event: `'resolve'`), and
- `DataMap.get()` as a wrapper around `resolve()` (event: `'get'`).

Decide whether these should support `before`/`after` semantics (including cancellation and transformed return values) the same way `patch()` does, and how to handle multi-match JSONPath resolve.
