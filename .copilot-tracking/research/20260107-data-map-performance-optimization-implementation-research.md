<!-- markdownlint-disable-file -->

# Task Research Notes: plans/data-map-performance-optimization/plan.md

## Research Executed

### File Analysis

- structured-autonomy-generate.prompt.md
  - Not found in this workspace via file search or text search.
  - This research therefore uses the plan file + package AGENTS + source code as the authoritative inputs.

- plans/data-map-performance-optimization/plan.md
  - 11-step performance optimization plan targeting @data-map/core (clone performance, path caching, subscription fast paths, pointer fast path, batch optimizations).
  - Mentions files that all exist in the workspace under packages/data-map/core/src/, except for the proposed new utility files.

- package.json (repo root)
  - Monorepo tooling: pnpm workspaces + Turborepo.
  - Versions: Node ^24.12.0, pnpm ^9.12.2, TypeScript ~5.5, Vite ^7.3.0, Vitest ^4.0.16.
  - Root scripts are Turbo-driven (build/lint/test/type-check), and workspace targeting is done with `turbo run -F ...` or `pnpm --filter ...`.

- packages/data-map/core/package.json
  - Test runner: Vitest (`test`, `test:watch`, `test:coverage`).
  - Bench runner: Vitest benchmarks (`bench: vitest bench`).
  - Build: Vite (`vite build`) + DTS generation (`vite-plugin-dts` implied by Vite config).
  - Dependencies are workspace-local @jsonpath/\* packages.

- packages/data-map/benchmarks/package.json
  - Bench runner: Vitest benchmarks with category scripts (e.g., `bench:path`, `bench:subs`, etc.).
  - Reporting scripts: `bench:full` (JSON output), plus `report` / `run-all` helpers built via `tsc -p tsconfig.scripts.json`.
  - Includes `rfdc` already as a dependency (v^1.4.1) for competitor/clone benchmarks.

- packages/data-map/core/src/index.ts
  - Public export surface: `DataMap` and types (`Operation`, `CallOptions`, `DataMapOptions`, `ResolvedMatch`, subscription types, definition types).

- packages/data-map/core/src/datamap.ts
  - Current cloning uses `structuredClone` via a local `cloneSnapshot()` helper.
  - Subscription manager is eagerly instantiated: `private readonly _subs = new SubscriptionManagerImpl<T, Ctx>(this);`.
  - `get()` and `resolve()` schedule notifications even when there are no subscribers.
  - Transactions implemented via snapshot rollback (`getSnapshot()` clones) + `batch()`.

- packages/data-map/core/src/utils/jsonpath.ts
  - Core integration points:
    - JSONPath query: `@jsonpath/jsonpath` (`query`, `stream`, `compileQuery`).
    - JSON Pointer: `@jsonpath/pointer` (`JSONPointer` class).
    - JSON Patch: `@jsonpath/patch` (`applyPatch`).
  - Error normalization pattern: wraps errors into `DataMapPathError` including `code`, `path`, and `cause`.

- packages/data-map/core/src/subscription/manager.ts
  - Subscription storage uses reverse index maps plus a Bloom filter.
  - JSONPath subscriptions can precompile with `compileQuery()` when there are no filters (`compiledPattern.hasFilters === false`) and `noPrecompile` not set.
  - `scheduleNotify()` always enqueues work via `NotificationScheduler`.

- packages/data-map/core/src/subscription/scheduler.ts
  - Microtask batching via `queueMicrotask()`.
  - Error handling/logging pattern: catches handler exceptions and logs with `console.error('Error in scheduled notification:', e)`.

- packages/data-map/core/src/path/detect.ts
  - Path-type detection is deliberately minimal and spec-linked (comment: “Spec §4.3 (must match exactly)”).
  - No caching today.

- packages/data-map/core/src/path/compile.ts and packages/data-map/core/src/path/predicate.ts
  - Caching patterns already exist:
    - `patternCache: Map<string, CompiledPathPattern>` in `compile.ts`.
    - `predicateCache: Map<string, { predicate; hash }>` in `predicate.ts`.

- packages/data-map/core/src/patch/builder.ts
  - `ensureParentContainers()` clones `currentData` via `structuredClone` and also clones container values with `structuredClone(container)`.

- packages/data-map/core/src/patch/apply.ts
  - Delegates immutably to `@jsonpath/patch` via `utils/jsonpath.applyOperations` with `{ mutate: false }`.
  - Computes `affectedPointers` and `structuralPointers` sets used for subscription invalidation.

- packages/data-map/core/src/batch/manager.ts
  - Tracks nested batches and collects operations + affected/structural pointers.

- packages/data-map/docs/architecture/\*
  - Architecture explanations for path, patch, subscription systems exist.
  - Note: patch docs contain older references to `json-p3`, while current implementation uses `@jsonpath/patch`.

### Code Search Results

- structuredClone usage in @data-map/core
  - packages/data-map/core/src/datamap.ts (local `cloneSnapshot`)
  - packages/data-map/core/src/patch/builder.ts
  - packages/data-map/core/src/batch/builder.ts
  - packages/data-map/core/src/**fixtures**/helpers.ts (test helper uses structuredClone on fixture data)

- Caching patterns already in core
  - packages/data-map/core/src/path/compile.ts: `patternCache` Map
  - packages/data-map/core/src/path/predicate.ts: `predicateCache` Map (hash-based)
  - packages/data-map/core/src/definitions/registry.ts: getter output caching using WeakMap

- Logging pattern (rare)
  - packages/data-map/core/src/subscription/scheduler.ts uses `console.error` inside microtask flush to avoid breaking notification processing.

### External Research

- #githubRepo:"davidmarkclements/rfdc README options proto circles constructorHandlers"
  - Not executed (official docs were fetched directly from npm + GitHub pages via #fetch).

- #fetch:https://www.npmjs.com/package/rfdc
  - API: `require('rfdc')(opts) => clone(obj)`.
  - Options include `proto`, `circles`, `constructorHandlers`.
  - Types cloned: JSON types + `Date`, `undefined`, `Buffer`, `TypedArray`, `Map`, `Set`; functions are referenced.
  - Security note: like `Object.assign`, cloning objects with `__proto__` can set target prototype (prototype poisoning risk).

- #fetch:https://github.com/davidmarkclements/rfdc
  - README documents:
    - `proto: true` can provide a small (~2%) performance boost but changes prototype-copy behavior.
    - `circles: true` preserves circular references at ~25% overhead.
    - `constructorHandlers` supports custom clone behavior for specific classes.
  - “default import”: `require('rfdc/default')` yields clone fn with default options.

### Project Conventions

- Standards referenced: AGENTS.md (repo root), packages/data-map/core/AGENTS.md, packages/data-map/benchmarks/AGENTS.md
- Instructions followed: workspace dependency protocol (`workspace:*`), run commands from repo root (no `cd`), Vitest for tests/benchmarks

## Key Discoveries

### Project Structure

Relevant workspaces:

- packages/data-map/core
  - src/datamap.ts (main class)
  - src/types.ts (exported types)
  - src/utils/jsonpath.ts (JSONPath/Pointer/Patch integration + error normalization)
  - src/subscription/\* (subscription manager, bloom filter, scheduler)
  - src/patch/_ and src/batch/_ (patching and batching)

- packages/data-map/benchmarks
  - src/\*.bench.ts files (Vitest benchmark suites)
  - scripts (`report`, `run-all`) compiled from TS via `tsconfig.scripts.json`

Docs:

- packages/data-map/docs/architecture/path-system.md
- packages/data-map/docs/architecture/subscription-system.md
- packages/data-map/docs/architecture/patch-system.md

Existing adjacent research (do not duplicate here):

- .copilot-tracking/research/20260107-datamap-core-performance-optimization-research.md
- .copilot-tracking/research/20260107-data-map-benchmarks-research.md

### Implementation Patterns

#### 1) Dependency management & workspace conventions

- All internal packages depend on each other using `workspace:*`.
- Workspace-local task execution patterns:
  - Turbo filters: `turbo run -F <workspace>` (e.g., `turbo run -F @data-map/core test`).
  - pnpm filters: `pnpm --filter <workspace> <script>`.

#### 2) Error handling

- Path/engine errors are normalized in packages/data-map/core/src/utils/jsonpath.ts via `DataMapPathError`:

```ts
export class DataMapPathError extends Error {
	readonly code: string;
	readonly path?: string;
	override readonly cause?: Error;

	constructor(message: string, options = { code: 'PATH_ERROR' }) {
		super(message);
		this.name = 'DataMapPathError';
		this.code = options.code;
		this.path = options.path;
		this.cause = options.cause;
		Object.setPrototypeOf(this, new.target.prototype);
	}
}
```

- DataMap runtime “strict mode” behavior:
  - In resolve(): pointer missing or invalid JSONPath throws in strict mode, returns [] when not strict.

#### 3) Logging

- Notification flushing catches handler errors and logs:

```ts
try {
	fn();
} catch (e) {
	console.error('Error in scheduled notification:', e);
}
```

This is the only verified logging path in core.

#### 4) Caching

- Path compilation cache: `patternCache: Map<string, CompiledPathPattern>` (compile-time caching).
- Predicate compilation cache: `predicateCache: Map<hash, compiled predicate>`.
- Definition getter cache: WeakMap keyed by definition object.

Plan Step 2 (Path Detection Cache) should align with this existing “module-level Map cache” pattern.

#### 5) Subscription architecture integration points

- DataMap always calls `this._subs.scheduleNotify(...)` for `resolve()`/`get()`.
- Subscription manager uses:
  - reverseIndex: pointer -> subscription ids
  - bloomFilter: fast negative pointer check
  - scheduler: microtask batching
  - dynamicSubscriptions: compiled patterns expanded against current data snapshot (`dataMap.toJSON()`)

#### 6) Patch + batch interaction

- Patch application is immutable and returns a new object (via `@jsonpath/patch` with `mutate: false`).
- BatchManager collects ops and pointer sets across nested batches and flushes at the end.

### Complete Examples

#### Public API surface (verified)

```ts
// packages/data-map/core/src/index.ts
export { DataMap } from './datamap';
export type {
	Operation,
	CallOptions,
	DataMapOptions,
	ResolvedMatch,
} from './types';
export type {
	Subscription,
	SubscriptionConfig,
	SubscriptionEvent,
	SubscriptionEventInfo,
	SubscriptionManager,
} from './subscription/types';
export type { Definition, DefinitionFactory } from './definitions/types';
```

#### Key DataMap signatures (verified)

```ts
// packages/data-map/core/src/datamap.ts
export class DataMap<T = unknown, Ctx = unknown> {
	constructor(initialValue: T, options: DataMapOptions<T, Ctx> = {});

	subscribe(config: SubscriptionConfig<T, Ctx>): Subscription;

	resolve(pathOrPointer: string, options: CallOptions = {}): ResolvedMatch[];
	resolveStream(
		pathOrPointer: string,
		options: CallOptions = {},
	): Generator<ResolvedMatch>;

	get(pathOrPointer: string, options: CallOptions = {}): unknown;
	getAll(pathOrPointer: string, options: CallOptions = {}): unknown[];
	peek(pointer: string): unknown;

	readonly set: (
		pathOrPointer: string,
		value: unknown | ((current: unknown) => unknown),
		options?: CallOptions,
	) => this;

	batch<R>(fn: (dm: this) => R): R;
	transaction<R>(fn: (dm: this) => R): R;
}
```

Note: the performance plan’s Step 4 references a `GetOptions` type; currently `get()` only accepts `CallOptions` from packages/data-map/core/src/types.ts. Any `clone?: boolean` addition will require a new public options type or extending `CallOptions`.

#### rfdc official usage (verified from npm/github docs)

```js
const clone = require('rfdc')({ proto: false, circles: false });
const out = clone({ a: 1, b: { c: 2 } });
```

#### DataMap’s current cloning wrapper (verified)

```ts
// packages/data-map/core/src/datamap.ts
function cloneSnapshot<T>(value: T): T {
	return structuredClone(value);
}
```

### API and Schema Documentation

Architecture docs that describe how core interacts with JSONPath/patching/subscriptions/batching:

- packages/data-map/docs/architecture/path-system.md
  - Explains unified pointer + JSONPath model; highlights caching (`patternCache` concept).
  - Note: the algorithm snippet in docs differs from actual detect logic; source of truth is packages/data-map/core/src/path/detect.ts.

- packages/data-map/docs/architecture/subscription-system.md
  - Describes microtask scheduling model and Bloom-filter negative checks.
  - Note: code snippets are conceptual; actual implementation is packages/data-map/core/src/subscription/manager.ts.

- packages/data-map/docs/architecture/patch-system.md
  - Explains RFC6902 operations; contains outdated references to `json-p3`.
  - Source of truth for implementation: packages/data-map/core/src/patch/apply.ts and packages/data-map/core/src/utils/jsonpath.ts.

### Configuration Examples

#### @data-map/core scripts (verified)

```json
{
	"scripts": {
		"bench": "vitest bench",
		"build": "vite build",
		"dev": "vite build --watch",
		"test": "vitest run",
		"test:coverage": "vitest run --coverage",
		"test:watch": "vitest",
		"type-check": "tsgo --noEmit"
	}
}
```

#### @data-map/benchmarks scripts (verified)

```json
{
	"scripts": {
		"bench": "vitest bench",
		"bench:full": "vitest bench --reporter=json --outputFile=results.json",
		"report": "tsc -p tsconfig.scripts.json && node dist/report.js",
		"run-all": "tsc -p tsconfig.scripts.json && node dist/run-all.js"
	}
}
```

### Technical Requirements

- Test runner for @data-map/core is Vitest (package-local scripts).
  - Documented in packages/data-map/core/AGENTS.md.

- Benchmark runner for @data-map/benchmarks is Vitest Bench.
  - Documented in packages/data-map/benchmarks/AGENTS.md.

- Cloning replacement target locations (verified `structuredClone` usage):
  - packages/data-map/core/src/datamap.ts
  - packages/data-map/core/src/patch/builder.ts
  - packages/data-map/core/src/batch/builder.ts
  - packages/data-map/core/src/**fixtures**/helpers.ts

- Subscription scheduling optimization target:
  - packages/data-map/core/src/subscription/manager.ts::scheduleNotify
  - packages/data-map/core/src/subscription/scheduler.ts::NotificationScheduler

## Recommended Approach

Implement the performance plan using the existing project patterns:

- Introduce a single cloning utility for @data-map/core (plan Step 1), replacing all `structuredClone` call sites.
  - Align with existing module-level utility pattern: packages/data-map/core/src/utils/\*.
  - Consider `rfdc/default` vs `rfdc(opts)` depending on whether you need non-default settings.
  - Be explicit about `proto`/`circles` and document the security implication around `__proto__` cloning (prototype poisoning), since DataMap can clone user-provided objects.

- For caching additions (plan Step 2), follow existing `patternCache` / `predicateCache` style: module-level `Map` with deterministic key and small footprint.

- For subscription fast paths (plan Steps 3, 5, 7, 10), treat “no subscribers” as a common case:
  - Today notifications schedule microtasks even with zero subscriptions.
  - `SubscriptionManagerImpl` already owns the data structures needed to implement `hasSubscribers()` without extra allocations.

- For pointer fast path (plan Step 6), the current hot spot is verified: every pointer resolve instantiates `new JSONPointer(pointer)` in packages/data-map/core/src/utils/jsonpath.ts.

## Implementation Guidance

- **Objectives**: Produce a copy-paste-ready `plans/data-map-performance-optimization/implementation.md` that references real script names, real file paths, and real APIs.
- **Key Tasks**:
  - Map each plan step to verified file locations listed above.
  - Explicitly record current signatures (notably `get(..., options: CallOptions)`), and plan any public type changes.
  - Use @data-map/core and @data-map/benchmarks scripts for validation.
- **Dependencies**:
  - New runtime dep likely needed in @data-map/core: `rfdc` (currently only present in @data-map/benchmarks).
  - Ensure dependencies remain `workspace:*` for internal packages; external deps use semver.
- **Success Criteria**:
  - `pnpm --filter @data-map/core test` passes.
  - `pnpm --filter @data-map/core bench` and `pnpm --filter @data-map/benchmarks bench:full` run successfully and show measurable improvements in clone/pointer/path/subscription microbenchmarks.
