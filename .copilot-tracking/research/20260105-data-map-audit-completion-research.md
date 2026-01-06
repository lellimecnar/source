<!-- markdownlint-disable-file -->

# Task Research Notes: @data-map/core Audit Completion (plans/data-map-audit-completion/plan.md)

## Research Executed

### File Analysis

- plans/data-map-audit-completion/plan.md
  - Lists 11 audit gaps and target files for fluent batch, move semantics, subscription ordering, resolved metadata, benchmarks, schema typing, SubscriptionManager export, relative pointer support, predicate cache hashing, and test expansion.
- packages/data-map/core/AGENTS.md
  - Defines package-level build/test/type-check commands and mandates using workspace-native `@jsonpath/*` packages only; defines test locations and coverage thresholds.
- packages/data-map/core/package.json
  - Confirms ESM package (`type: "module"`), Vite build, Vitest test runner, `tsgo` type-check.
- packages/data-map/core/vitest.config.ts
  - Sets coverage thresholds and uses local path aliases to `packages/jsonpath/*/src/index.ts` so tests run against workspace sources.
- vitest.config.ts (repo root)
  - Vitest multi-project setup, writes `test-output.json` and `coverage/` at the repo root.
- package.json (repo root)
  - Turborepo scripts: `pnpm test`, `pnpm test:coverage`, `pnpm type-check`, etc.
- turbo.json
  - Test tasks depend on `^build`; persistent watch tasks are not cached.
- packages/data-map/core/src/datamap.ts
  - Central DataMap implementation: resolve/get/getAll/resolveStream; mutation APIs (`set`, `setAll`, `map`, `patch`); callback-based `batch(fn)` and `transaction(fn)`.
- packages/data-map/core/src/patch/apply.ts
  - Applies RFC6902 operations via `@jsonpath/patch` wrapper and computes `affectedPointers` + `structuralPointers`.
- packages/data-map/core/src/subscription/manager.ts
  - Subscription registration and notification pipeline; reverse index + bloom filter; dynamic match checking; structural and filter watcher re-expansion.
- packages/data-map/core/src/path/\*
  - Path type detection, JSONPath compilation into segment patterns, matching and expansion, predicate compilation/caching.
- packages/data-map/core/src/**tests**/_ and co-located `_.spec.ts`
  - Test patterns, fixtures, microtask flushing helper, spec-compliance/integration/errors suites.
- packages/data-map/core/README.md
  - Documents callback-based batch API (no fluent `.batch` accessor described).

### Code Search Results

- `BatchManager` / `batch(` (packages/data-map/core/src/datamap.ts)
  - Found callback-based `batch<R>(fn)` and internal `_batch: BatchManager` (stack-based batch collector).
- `op: 'move'` usage in tests
  - Found only in packages/data-map/core/src/**tests**/spec-compliance.spec.ts (functional move correctness) but no subscription semantics tests.
- `relative-pointer` handling
  - Found in packages/data-map/core/src/datamap.ts: throws in strict mode and returns `[]` in non-strict mode (no relative resolution logic).
- `predicateCache.get(expression)` (packages/data-map/core/src/path/predicate.ts)
  - Cache key is raw expression string; a hash is computed but not used as the key.

### External Research

- #fetch:(not used)
  - Project specs under `spec/` and `specs/` were sufficient for this pass.

### Project Conventions

- Standards referenced: packages/data-map/core/AGENTS.md, repo root turbo.json + vitest.config.ts
- Instructions followed: workspace monorepo rules in AGENTS.md + `.github/copilot-instructions.md` (pnpm/turbo usage); package-local `@data-map/core` testing conventions.

## Key Discoveries

### 1) Project-wide: stack, tests, build commands, structure, conventions

**Monorepo tooling**

- Package manager: pnpm (root package.json `packageManager: pnpm@9.12.2`)
- Build orchestrator: Turborepo (`turbo.json`)
- Language/runtime: TypeScript (~5.5), Node ^24

**Test runner(s)**

- Vitest is the primary runner.
- Repo root uses Vitest multi-project mode (vitest.config.ts) targeting per-package vitest configs.
- `@data-map/core` uses Vitest with v8 coverage provider (`@vitest/coverage-v8`).

**Key commands (root + package)**

- Root:
  - `pnpm build` → `turbo build`
  - `pnpm test` → `turbo test` (depends on `^build`)
  - `pnpm test:coverage` → `turbo test:coverage`
  - `pnpm type-check` → `turbo type-check`
- Package (`packages/data-map/core/AGENTS.md` + `packages/data-map/core/package.json`):
  - Build: `pnpm turbo -F @data-map/core build` (internally `vite build`)
  - Test: `pnpm --filter @data-map/core test` (internally `vitest run`)
  - Coverage: `pnpm --filter @data-map/core test:coverage` (internally `vitest run --coverage`)
  - Type-check: `pnpm turbo -F @data-map/core type-check` (internally `tsgo --noEmit`)

**Folder structure relevant to `packages/data-map/core`**

- packages/data-map/core/src/
  - datamap.ts / datamap.spec.ts: main class + broad unit tests
  - batch/: internal batch stack/collection (`BatchManager`)
  - patch/: patch building and application (`applyOperations`, array builders)
  - subscription/: subscription manager, scheduler, bloom filter, and tests
  - path/: JSONPath compilation/matching/expansion, predicate compilation/cache, and tests
  - definitions/: definition registry (getters/setters, deps invalidation) and types
  - utils/: `@jsonpath/*` wrappers + pointer helpers + tests
  - **tests**/: integration/errors/spec-compliance suites
  - **fixtures**/: test helpers (`flushMicrotasks`, `createDataMap`, etc.)

**Conventions / constraints**

- `packages/data-map/core/AGENTS.md` mandates: “This package MUST use the workspace-native `@jsonpath/*` packages as the sole JSONPath/Pointer/Patch engine.”
- ESM: package.json `type: "module"`.
- Tests are co-located (`*.spec.ts`) + structured suites in `src/__tests__/`.
- Async notification delivery uses microtasks (`queueMicrotask`) and tests generally `await flushMicrotasks()`.

### 2) Code patterns library for data-map/core

#### 2.1 Existing batch API (callback-based)

- File: packages/data-map/core/src/datamap.ts
  - `batch<R>(fn: (dm: this) => R): R`
    - Starts internal `BatchManager` scope (`this._batch.start()`), runs callback, merges nested contexts, flushes once at outermost end.
  - `transaction<R>(fn)` wraps `batch(fn)` with snapshot rollback on error.
- File: packages/data-map/core/src/batch/manager.ts
  - `BatchManager` is a stack of `BatchContext` values collecting:
    - `operations: Operation[]`
    - `affectedPointers: Set<string>`
    - `structuralPointers: Set<string>`
- File: packages/data-map/core/src/datamap.ts
  - `_flushBatch(context: BatchContext)`
    - Calls `SubscriptionManagerImpl.handleStructuralChange()` for structural pointers.
    - Calls `SubscriptionManagerImpl.handleFilterCriteriaChange()` for affected pointers.
    - Notifies `patch` `on` + `after` for each affected pointer.

**Gap vs plan/spec**: there is no fluent `.batch` accessor today; `README.md` documents only the callback-based batch.

#### 2.2 Patch application

- File: packages/data-map/core/src/patch/apply.ts
  - `applyOperations(currentData, ops)`
    - Applies patch via `../utils/jsonpath.applyOperations` → `@jsonpath/patch.applyPatch` with `{ mutate: false }`.
    - Computes:
      - `affectedPointers`: includes `op.path` for all ops, and includes `op.from` for `move`/`copy`.
      - `structuralPointers`: includes parent pointer of `op.path` for `add/remove/move/copy`, plus parent pointer of `op.from` for `move/copy`.

#### 2.3 Subscription manager

- File: packages/data-map/core/src/subscription/manager.ts
  - Storage/indexing:
    - `reverseIndex: Map<pointer, Set<subscriptionId>>` (static pointer → subscriptions)
    - `bloomFilter` optimization for pointer existence checks
    - `dynamicSubscriptions: Map<id, InternalSubscription>` for patterns requiring match checks
    - `structuralWatchers` and `filterWatchers` to re-expand dynamic subscriptions
  - Registration:
    - Pointer path: expandedPaths = `{ config.path }`, index directly
    - JSONPath path: compiles `CompiledPathPattern` and may precompile query via `compileQuery()` (only when no filters)
    - Expands to concrete pointers via compiled query or pattern expansion; indexes each pointer
  - Notification delivery:
    - `notify(pointer, event, stage, value, previousValue, operation, originalPath)`
      - `before` stage executes synchronously
      - `on`/`after` stage schedules via `NotificationScheduler` (microtask)
    - `invokeHandlers(ids: Set<string>, ...)` runs handlers in the iteration order of `ids`.

**Gap vs plan/spec**: there is no specificity ordering implemented; current order is whatever `Set` iteration yields (based on insertion order from indexing).

#### 2.4 Path parsing / resolve

- File: packages/data-map/core/src/path/detect.ts
  - `detectPathType(input)` follows the mandatory regex/heuristics from the spec.
- File: packages/data-map/core/src/datamap.ts
  - `resolve(pathOrPointer, options)`
    - `pointer` mode:
      - Normalizes fragment pointers (`#/a/b`) and root pointers (`''`/`'#'`).
      - Uses `utils/jsonpath.resolvePointer` and `pointerExists`.
    - `jsonpath` mode:
      - Uses `utils/jsonpath.queryWithPointers`.
    - `relative-pointer` mode:
      - Currently unsupported: throws in strict, returns `[]` in non-strict.

#### 2.5 Predicate caching

- File: packages/data-map/core/src/path/predicate.ts
  - `compilePredicate(expression)`
    - Caches by `predicateCache.get(expression)`
    - Computes an FNV-1a-like hash string (`hashString(expression)`) but does not use it as the cache key.
    - Does not normalize whitespace before hashing.

#### 2.6 Index exports

- File: packages/data-map/core/src/index.ts
  - Exports: `DataMap`, types (`Operation`, `CallOptions`, `DataMapOptions`, `ResolvedMatch`), subscription types, definition types.
  - Does not export any subscription manager interface/type beyond `Subscription` and config types.

### 3) Architecture: DataMap, patch application, subscription notifications, metadata

**High-level flow (write path)**

- `DataMap.set` / `setAll` / `map`:
  - Resolve target pointers via `resolve()`.
  - Apply definition setters via `DefinitionRegistry.applySetter()`.
  - Build patch operations via patch builders (`buildSetPatch`, array patch builders).
  - Call `DataMap.patch(ops)`.

- `DataMap.patch(ops)`:
  - Clones incoming ops to avoid mutating caller-provided list.
  - For each op:
    - Computes `previousValue = this.get(op.path)`.
    - Notifies `before` stage via `SubscriptionManagerImpl.notify(op.path, 'patch', 'before', nextValue, previousValue, op, op.path)`.
    - Applies `before.transformedValue` back into op.value when present.
  - Applies all operations via `patch/apply.applyOperations()` to produce next data and pointer sets.
  - If in a callback batch (`_batch.isBatching`): collects and returns (flush deferred).
  - Otherwise:
    - Calls `handleStructuralChange()` for structural pointers.
    - Calls `handleFilterCriteriaChange()` for affected pointers.
    - For each op, notifies `patch` `on` and `after` (using `this.get(op.path)` again).

**Key gotcha: nested read events during write notifications**

- `DataMap.patch()` uses `this.get(op.path)` for values during notifications, and `get()` itself triggers `resolve` + `get` events. This means “patch notifications” can indirectly cause `resolve`/`get` notifications to schedule.
  - This is observable in packages/data-map/core/src/subscription/manager.spec.ts (“fires get and resolve events”).

**Move/copy semantics today**

- Patch application tracks both `op.path` and `op.from` in `affectedPointers`, but `DataMap.patch()` only notifies for `op.path` (destination).
- There is no special-case decomposition of `move` into `remove` + `add` events for subscription purposes.

**Where timestamps/metadata “should” live (per spec)**

- Specs in spec/spec-data-datamap.md and specs/data-map.md describe a sparse metadata Map keyed by JSON pointer, including fields like `lastUpdated`, `previousValue`, `readOnly`, `type`.
- Current state in code:
  - Type surface: packages/data-map/core/src/types.ts defines `ResolvedMatch` with `readOnly`, `lastUpdated`, `previousValue`, `type` optional fields.
  - Implementation: `DataMap.resolve()` currently returns only `{ pointer, value }` and does not populate metadata fields.
  - Definitions: `Definition` supports `readOnly` but does not include a `type` annotation field.

### 4) Existing tests: locations, patterns, helpers, assertions, coverage

**Test locations and suites**

- Unit tests: co-located `*.spec.ts` throughout `src/` (e.g., batch/batch.spec.ts, subscription/_.spec.ts, path/_.spec.ts).
- Suites called out in `packages/data-map/core/AGENTS.md`:
  - src/**tests**/integration.spec.ts
  - src/**tests**/errors.spec.ts
  - src/**tests**/spec-compliance.spec.ts

**Helpers and fixture conventions**

- packages/data-map/core/src/**fixtures**/helpers.ts
  - `createDataMap()` convenience builder
  - `createEventSpy()` to collect event/value sequences
  - `flushMicrotasks()` uses `queueMicrotask` to advance async notification scheduling

**Assertion style**

- Vitest style: `describe/it/expect`.
- Async tests frequently `await flushMicrotasks()` to observe on/after stage notifications.

**Coverage tooling**

- Coverage via v8 provider (`@vitest/coverage-v8`).
- Thresholds (AGENTS.md + packages/data-map/core/vitest.config.ts):
  - statements 90%, lines 90%, branches 85%, functions 95%

### 5) Files mentioned by the plan: existence and likely impact

**Direct plan targets (verified existing unless marked new)**

- Step 1 (Fluent Batch API)
  - packages/data-map/core/src/batch/types.ts (exists)
  - packages/data-map/core/src/datamap.ts (exists)
  - packages/data-map/core/src/index.ts (exists)
  - packages/data-map/core/src/batch/batch.spec.ts (exists)
  - packages/data-map/core/src/batch/fluent.ts (NEW — does not exist)

- Step 2 (Move semantics)
  - packages/data-map/core/src/patch/apply.ts (exists)
  - packages/data-map/core/src/subscription/manager.ts (exists)
  - packages/data-map/core/src/**tests**/move-semantics.spec.ts (NEW — does not exist)

- Step 3 (Subscription specificity ordering)
  - packages/data-map/core/src/subscription/manager.ts (exists)
  - packages/data-map/core/src/subscription/types.ts (exists)
  - packages/data-map/core/src/subscription/manager.spec.ts (exists)

- Step 4 (ResolvedMatch metadata)
  - packages/data-map/core/src/types.ts (exists; fields already declared)
  - packages/data-map/core/src/datamap.ts (exists; does not populate fields)
  - packages/data-map/core/src/definitions/registry.ts (exists)
  - packages/data-map/core/src/path/resolve.spec.ts (NEW — does not exist)

- Step 5 (Benchmarks)
  - packages/data-map/core/src/**benchmarks**/ (NEW directory — does not exist)
  - packages/data-map/core/vitest.config.ts (exists)
  - vitest.config.ts + package.json (repo root exist)

- Step 6 (schema option typing)
  - packages/data-map/core/src/types.ts (exists; `schema?: unknown` missing from `DataMapOptions` today)
  - packages/data-map/core/README.md (exists)

- Step 7 (SubscriptionManager interface export)
  - packages/data-map/core/src/subscription/types.ts (exists; no manager interface)
  - packages/data-map/core/src/index.ts (exists)

- Step 8 (Relative JSON pointer)
  - packages/data-map/core/src/path/detect.ts (exists)
  - packages/data-map/core/src/datamap.ts (exists; currently unsupported)
  - packages/data-map/core/src/path/relative.ts (NEW — does not exist)
  - packages/data-map/core/src/path/relative.spec.ts (NEW — does not exist)

- Step 9 (Predicate caching by hash)
  - packages/data-map/core/src/path/predicate.ts (exists)
  - packages/data-map/core/src/path/predicate.spec.ts (exists)

- Step 10/11 (Test expansion)
  - packages/data-map/core/src/**tests**/integration.spec.ts (exists)
  - packages/data-map/core/src/**tests**/errors.spec.ts (exists)
  - packages/data-map/core/src/**tests**/spec-compliance.spec.ts (exists)

**Additional likely impacted files (based on current implementation)**

- packages/data-map/core/src/patch/builder.ts
  - Central patch builder used by `.set`; likely reused by fluent batch implementation.
- packages/data-map/core/src/subscription/scheduler.ts
  - Controls microtask scheduling semantics; any benchmark/tests around notification batching should account for it.
- packages/data-map/core/src/definitions/types.ts
  - If the spec truly requires definition-level `type` annotations, this type surface likely needs an extension.
- packages/data-map/core/src/utils/jsonpath.ts
  - All JSONPath/Pointer/Patch errors are normalized into `DataMapPathError`; strict-mode tests often depend on this.

### 6) Constraints from packages/data-map/core/AGENTS.md

- MUST use workspace-native `@jsonpath/*` packages as the sole engine.
- Tests: unit tests co-located (`*.spec.ts`), plus specific suites in `src/__tests__/`.
- Coverage thresholds are enforced (statements/lines/branches/functions).

## Recommended Approach

The plan in plans/data-map-audit-completion/plan.md is aligned with the _current_ code reality (callback batch exists; fluent batch does not; relative pointers are detected but unsupported; move semantics for subscriptions are not implemented; specificity ordering is not implemented).

Important discrepancy to resolve before implementation:

- packages/data-map/core/SPEC_COMPLIANCE_REPORT.md claims fluent batch is implemented, but current code + README show only callback-based `batch(fn)` and no `.batch` accessor. Treat SPEC_COMPLIANCE_REPORT as stale relative to current `src/datamap.ts`.
- packages/data-map/core/src/types.ts already declares `ResolvedMatch` metadata fields; the missing work is populating them in `DataMap.resolve()` and adding a metadata sidecar (as the spec describes).

## Implementation Guidance

- **Objectives**: Implement fluent batch accessor, correct move subscription semantics, add specificity ordering, implement metadata map population in resolve, add schema option to DataMapOptions (type-only), export SubscriptionManager interface, add relative pointer resolution, improve predicate caching keying/normalization, and expand tests/benchmarks to hit coverage thresholds.
- **Key Tasks**:
  - Confirm intended public API change for relative pointers (new method vs options) to avoid breaking `resolve(pathOrPointer)`.
  - Implement move subscription semantics by emitting source `remove` and destination `set` notifications (subscriptions should remain bound to pointers, not moved values).
  - Add deterministic handler ordering based on path specificity and registration order.
  - Add metadata sidecar map keyed by pointer for `lastUpdated`/`previousValue` and derive `readOnly` from definitions.
  - Add benchmarks using Vitest bench only if supported in current Vitest version and repo patterns.
- **Dependencies**: `@jsonpath/*` workspace packages (already used via utils/jsonpath.ts); subscription scheduler (queueMicrotask).
- **Success Criteria**:
  - All new/updated tests pass with coverage thresholds met for @data-map/core.
  - Spec-compliance suite covers new requirements (move semantics, specificity ordering, relative pointers, metadata).
  - No introduction of non-workspace JSONPath/Pointer/Patch dependencies.
