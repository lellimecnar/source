# Task Research Notes: @data-map/core Benchmarking Suite (Superseded)

This research note is superseded by `.copilot-tracking/research/20260107-data-map-benchmarks-research.md`, which consolidates monorepo benchmark patterns, test/bench commands, `@data-map/core` API mapping, and package-creation conventions for implementing `plans/data-map-benchmarks/plan.md`.

## Research Executed

### File Analysis

- [packages/data-map/core/src/datamap.ts](packages/data-map/core/src/datamap.ts)
  - Core `DataMap` class with ~900 lines of implementation
  - Reactive state store with JSON Pointer + JSONPath resolution via `json-p3` (now migrated to `@jsonpath/*`)
  - RFC 6902 JSON Patch mutation APIs with `.toPatch()` variants
  - Subscription system supporting static pointers and dynamic JSONPath patterns
  - Batch/transaction support with structural sharing
  - Computed definitions (getter/setter transforms)

- [packages/data-map/core/package.json](packages/data-map/core/package.json)
  - Dependencies: `@jsonpath/core`, `@jsonpath/jsonpath`, `@jsonpath/patch`, `@jsonpath/pointer`
  - Has existing `bench` script: `vitest bench`
  - Uses Vite for builds, Vitest for testing

- [packages/data-map/core/src/**benchmarks**/main.bench.ts](packages/data-map/core/src/__benchmarks__/main.bench.ts)
  - Existing benchmark file with 177 lines covering: resolve, get, peek, write, batch, subscriptions, pattern matching, definitions
  - Uses Vitest bench API

- [packages/jsonpath/benchmarks/](packages/jsonpath/benchmarks/)
  - Comprehensive reference benchmark package with adapters, fixtures, and multiple bench files
  - Pattern to follow for `@data-map/benchmarks` package

### Code Search Results

- `DataMap` class API surface identified:
  - Read: `get()`, `getAll()`, `resolve()`, `peek()`, `getSnapshot()`, `toJSON()`
  - Write: `set()`, `setAll()`, `map()`, `patch()`
  - Array: `push()`, `pop()`, `unshift()`, `shift()`, `splice()`, `sort()`, `shuffle()`
  - Batch: `batch()`, `batch.set()`, `batch.remove()`, `batch.merge()`, `batch.move()`, `batch.copy()`, `transaction()`
  - Subscriptions: `subscribe()`
  - Definitions: `define` option with getter/setter transforms
  - Utilities: `equals()`, `extends()`, `clone()`

### External Research

- #githubRepo:"mariocasciaro/object-path" - Deep property access with `get()`, `set()`, `del()`, `has()`, `empty()`, `ensureExists()`, `coalesce()`, `push()`, `insert()`
- #fetch:Context7/immer - Immutable state with `produce()`, structural sharing, patch support, ~2-3x slower than hand-written but excellent DX
- #fetch:Context7/lodash - `_.get()`, `_.set()`, `_.update()`, `_.unset()`, `_.has()` for path-based property access
- #fetch:Context7/zustand - Lightweight state management, explicit selectors with equality functions

### Project Conventions

- Standards referenced: Vitest benchmarking patterns from `@jsonpath/benchmarks`
- Instructions followed: Monorepo structure with workspace dependencies, shared configs

## Key Discoveries

### @data-map/core Purpose and API

**Purpose**: High-performance reactive data store combining:

1. **JSON Pointer + JSONPath read APIs** - Unified path-based data access
2. **RFC 6902 JSON Patch mutations** - All writes expressed as patches
3. **Reactive subscriptions** - Static pointers and dynamic JSONPath patterns
4. **Batch/transaction support** - Atomic multi-operation commits
5. **Computed definitions** - Getter/setter transforms per path

**Core Operations by Category**:

| Category    | Methods                                                                      | Benchmarkable Aspects                                 |
| ----------- | ---------------------------------------------------------------------------- | ----------------------------------------------------- |
| Read        | `get()`, `getAll()`, `resolve()`, `peek()`                                   | Path resolution, cache hits, large data               |
| Write       | `set()`, `setAll()`, `map()`, `patch()`                                      | Patch generation, deep paths, multiple targets        |
| Array       | `push()`, `pop()`, `shift()`, `unshift()`, `splice()`, `sort()`, `shuffle()` | Array manipulation overhead                           |
| Batch       | `batch()`, `batch.set()`, `transaction()`                                    | Multi-op atomicity, rollback cost                     |
| Subscribe   | `subscribe()`                                                                | Registration, notification dispatch, pattern matching |
| Definitions | `define` with `get`/`set`                                                    | Transform overhead, caching                           |
| Utility     | `clone()`, `equals()`, `extends()`, `getSnapshot()`                          | Deep comparison, cloning                              |

### Existing Benchmark Structure from @jsonpath/benchmarks

```
packages/jsonpath/benchmarks/
├── package.json              # Private package, dependencies on competing libs
├── vitest.config.ts          # Shared config + path aliases
├── src/
│   ├── adapters/             # Abstraction layer for comparing libraries
│   │   ├── types.ts          # AdapterKind, features interfaces
│   │   ├── index.ts          # Re-exports all adapters
│   │   ├── jsonpath.*.ts     # Individual library adapters
│   │   ├── pointer.*.ts
│   │   ├── patch.*.ts
│   │   └── merge-patch.*.ts
│   ├── fixtures/             # Reusable test data
│   │   ├── data-generators.ts  # generateLargeArray, generateDeepObject, etc.
│   │   ├── datasets.ts       # Pre-generated datasets (STORE_DATA, LARGE_ARRAY_*)
│   │   ├── queries.ts        # Common query patterns
│   │   └── index.ts
│   ├── utils/                # Helper utilities
│   ├── *.bench.ts            # Individual benchmark files by category
│   └── test/                 # Adapter verification tests
```

**Key Patterns**:

1. **Adapter Pattern**: Each library wrapped in uniform interface for fair comparison
2. **Feature Flags**: Adapters declare capabilities (`supportsFilter`, `mutatesInput`, etc.)
3. **Smoke Tests**: Each adapter has `smokeTest()` for validation
4. **Reusable Fixtures**: Data generators + pre-built datasets at various scales
5. **Categorized Benchmarks**: Separate files for different operation types

## Prioritized Library Comparison List

### Category 1: Immutable Data Libraries (Highest Priority)

These directly compete with @data-map/core's immutable update semantics.

| Priority | Library      | Package    | Weekly Downloads | Competes With                          | Why Include                                                                                           | Concerns                        |
| -------- | ------------ | ---------- | ---------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------- |
| **🥇 1** | **Mutative** | `mutative` | 117K             | Mutations, patches, immutability       | **10x faster than Immer**, full RFC 6902 patch support, claimed 2-6x faster than handcrafted reducers | Smaller ecosystem than Immer    |
| **🥇 2** | **Immer**    | `immer`    | 10.6M            | Mutations, patches, structural sharing | Industry standard, Redux Toolkit uses it, excellent DX with `produce()`                               | ~2-3x slower than Mutative      |
| **🥈 3** | **klona**    | `klona`    | 4.9M             | Deep cloning                           | Multiple modes (240B-501B), fastest in benchmarks, modular                                            | Clone-only, no update semantics |
| **🥈 4** | **rfdc**     | `rfdc`     | 13.5M            | Deep cloning                           | "Really Fast Deep Clone", constructor handlers, circular ref support                                  | Clone-only                      |

**Recommendation**: Benchmark Mutative and Immer as primary competitors for mutation API. Use klona/rfdc for clone operation baseline.

---

### Category 2: Path Access Libraries (High Priority)

These compete with @data-map/core's JSON Pointer path resolution.

| Priority | Library               | Package                          | Weekly Downloads | Competes With                        | Why Include                                                             | Concerns                         |
| -------- | --------------------- | -------------------------------- | ---------------- | ------------------------------------ | ----------------------------------------------------------------------- | -------------------------------- |
| **🥇 1** | **dot-prop**          | `dot-prop`                       | 12.7M            | get/set/has/delete                   | Array path support, escape handling, `unflatten()`, actively maintained | ESM-only in v10                  |
| **🥇 2** | **dlv**               | `dlv`                            | 10M              | get only                             | **130 bytes**, by Preact author, fastest get-only option                | Read-only, no set                |
| **🥇 3** | **dset**              | `dset`                           | 3.1M             | set only                             | **197 bytes**, pairs with dlv, supports merge mode                      | Write-only, no get               |
| **🥈 4** | **object-path**       | `object-path`                    | 870K             | Full CRUD + push/insert              | `coalesce()`, `ensureExists()`, immutable variant available             | Last publish 4 years ago         |
| **🥈 5** | **lodash**            | `lodash` (or `lodash-es`)        | 50M+             | `_.get`, `_.set`, `_.has`, `_.unset` | Universal baseline, everyone knows it                                   | Bundle size if using full lodash |
| **🥉 6** | **just-safe-get/set** | `just-safe-get`, `just-safe-set` | 11K/9K           | get/set                              | Zero-dependency, minimal footprint                                      | Lower adoption                   |

**Recommendation**: Use dlv+dset as lightweight baseline, dot-prop as feature-complete comparison, lodash as universal reference.

---

### Category 3: JSON Patch Libraries (High Priority)

These compete with @data-map/core's RFC 6902 patch operations.

| Priority | Library                  | Package                | Weekly Downloads | Competes With                           | Why Include                                                         | Concerns                 |
| -------- | ------------------------ | ---------------------- | ---------------- | --------------------------------------- | ------------------------------------------------------------------- | ------------------------ |
| **🥇 1** | **fast-json-patch**      | `fast-json-patch`      | 2M               | Patch apply, generate, observe, compare | Performance-optimized, observe API for change detection, validation | Last publish 4 years ago |
| **🥇 2** | **rfc6902**              | `rfc6902`              | 73K              | Patch apply, createPatch, diff          | Clean RFC 6902 implementation, diff generation, well-documented     | Smaller downloads        |
| **🥈 3** | **immutable-json-patch** | `immutable-json-patch` | 63K              | Immutable patch apply, revert           | **Immutable by design**, `revertJSONPatch()` for undo, hooks API    | Newer, smaller community |
| **🥉 4** | **@jsonpath/patch**      | internal               | N/A              | Full RFC 6902                           | Our own implementation - baseline for accuracy                      | Internal comparison      |

**Recommendation**: fast-json-patch as primary competitor (highest downloads), rfc6902 for RFC compliance reference, immutable-json-patch for immutability comparison.

---

### Category 4: Reactive State Libraries (Medium Priority)

These compete with @data-map/core's subscription system.

| Priority | Library     | Package   | Weekly Downloads | Competes With                         | Why Include                                                                      | Concerns                               |
| -------- | ----------- | --------- | ---------------- | ------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------- |
| **🥇 1** | **Valtio**  | `valtio`  | 490K             | Proxy-based reactivity, subscriptions | **Proxy-based**, mutable API feels natural, `subscribe()`, computed with getters | React-focused but has vanilla mode     |
| **🥇 2** | **Zustand** | `zustand` | 8.2M             | State subscriptions, selectors        | Minimal API, `subscribeWithSelector`, vanilla mode (`zustand/vanilla`)           | React hook-based primarily             |
| **🥈 3** | **MobX**    | `mobx`    | 1M               | Observable state, computed values     | Battle-tested, TFRP, automatic dependency tracking, `observe()`, `reaction()`    | Heavier, class-based API               |
| **🥈 4** | **Jotai**   | `jotai`   | 1M               | Atomic state, derived atoms           | Atomic model, derived values with `atom()`, minimal API                          | React-only, no vanilla                 |
| **🥉 5** | **Recoil**  | `recoil`  | 237K             | Atoms, selectors                      | Facebook experimental, atomic model                                              | Last publish 3 years ago, experimental |

**Recommendation**: Valtio for proxy-based comparison (closest model), Zustand for vanilla subscriptions, MobX for observable baseline. Skip Jotai/Recoil (React-only).

---

### Category 5: Proxy-based State (Medium Priority)

These compete with proxy-based reactivity patterns.

| Priority | Library           | Package         | Weekly Downloads | Competes With              | Why Include                                                                  | Concerns              |
| -------- | ----------------- | --------------- | ---------------- | -------------------------- | ---------------------------------------------------------------------------- | --------------------- |
| **🥇 1** | **Valtio**        | `valtio`        | 490K             | Proxy state, subscriptions | Direct mutation syntax, automatic tracking, `snapshot()` for immutable reads | Already in Category 4 |
| **🥈 2** | **proxy-memoize** | `proxy-memoize` | 17K              | Selector memoization       | Proxy-based memoization, tracks property access                              | Niche use case        |

**Recommendation**: Valtio is the primary proxy competitor. proxy-memoize is too niche for core benchmarks.

---

## Final Prioritized Benchmark Library List

### Tier 1: Must Include (Core Comparisons)

| Package           | npm install             | Category    | Primary Use Case                         |
| ----------------- | ----------------------- | ----------- | ---------------------------------------- |
| `mutative`        | `npm i mutative`        | Immutable   | Fastest Immer alternative, patch support |
| `immer`           | `npm i immer`           | Immutable   | Industry standard, Redux Toolkit         |
| `fast-json-patch` | `npm i fast-json-patch` | JSON Patch  | RFC 6902 apply/generate/observe          |
| `dot-prop`        | `npm i dot-prop`        | Path Access | Full-featured path operations            |
| `dlv`             | `npm i dlv`             | Path Access | Lightweight get baseline                 |
| `dset`            | `npm i dset`            | Path Access | Lightweight set baseline                 |
| `valtio`          | `npm i valtio`          | Reactive    | Proxy-based subscriptions                |

### Tier 2: Should Include (Extended Comparisons)

| Package                | npm install                  | Category    | Primary Use Case           |
| ---------------------- | ---------------------------- | ----------- | -------------------------- |
| `rfc6902`              | `npm i rfc6902`              | JSON Patch  | RFC compliance baseline    |
| `immutable-json-patch` | `npm i immutable-json-patch` | JSON Patch  | Immutable patch + revert   |
| `klona`                | `npm i klona`                | Clone       | Fast deep clone baseline   |
| `zustand`              | `npm i zustand`              | Reactive    | Vanilla subscription model |
| `object-path`          | `npm i object-path`          | Path Access | Full CRUD + extras         |

### Tier 3: Optional (Specialized Comparisons)

| Package         | npm install           | Category    | Primary Use Case           |
| --------------- | --------------------- | ----------- | -------------------------- |
| `rfdc`          | `npm i rfdc`          | Clone       | Alternative clone baseline |
| `mobx`          | `npm i mobx`          | Reactive    | TFRP baseline (heavier)    |
| `lodash`        | `npm i lodash`        | Path Access | Universal baseline         |
| `just-safe-get` | `npm i just-safe-get` | Path Access | Zero-dep alternative       |
| `just-safe-set` | `npm i just-safe-set` | Path Access | Zero-dep alternative       |

---

## Library Feature Matrix

| Feature            | @data-map/core             | Mutative       | Immer         | Valtio       | fast-json-patch |
| ------------------ | -------------------------- | -------------- | ------------- | ------------ | --------------- |
| Path get           | ✅ JSON Pointer + JSONPath | ❌             | ❌            | ❌           | ✅ JSON Pointer |
| Path set           | ✅                         | ✅ via draft   | ✅ via draft  | ✅ via proxy | ✅              |
| Immutable updates  | ✅                         | ✅             | ✅            | ✅ snapshot  | ❌ mutates      |
| Structural sharing | ✅                         | ✅             | ✅            | ❌           | ❌              |
| RFC 6902 patches   | ✅                         | ✅             | ✅            | ❌           | ✅              |
| Subscriptions      | ✅ static + dynamic        | ❌             | ❌            | ✅           | ❌              |
| Computed/derived   | ✅ definitions             | ❌             | ❌            | ✅ getters   | ❌              |
| Batch/transaction  | ✅                         | ❌             | ❌            | ❌           | ❌              |
| Auto-freeze        | ❌ optional                | ❌ default off | ✅ default on | ❌           | ❌              |

**Recommended Primary Comparisons**:

1. **Path Access**: dlv+dset (lightweight), dot-prop (feature-complete), lodash (universal)
2. **Immutable Updates**: Mutative (performance leader), Immer (industry standard)
3. **JSON Patch**: fast-json-patch (performance), rfc6902 (compliance)
4. **Reactivity**: Valtio (proxy-based), Zustand (subscriptions)

---

## Detailed Library Profiles

### Mutative (Top Priority - Immutable)

**Package**: `mutative` v1.3.0  
**Weekly Downloads**: 117,841  
**Size**: ~705 KB unpacked  
**License**: MIT

**Key Features**:

- 10x faster than Immer by default
- 2-6x faster than naive handcrafted reducers
- Full RFC 6902 JSON Patch compliance with `enablePatches: { arrayLengthAssignment: false }`
- `apply()` function for patch application
- `current()` and `original()` for draft introspection
- Custom shallow copy support via `mark` option
- Strict mode for safer mutable data access

**Benchmark Claims**:

```
Mutative - No Freeze: 6,783 ops/sec
Immer - Freeze: 392 ops/sec (17x slower with default config)
```

**API Comparison**:

```typescript
// Mutative
import { create, apply } from 'mutative';
const [newState, patches, inversePatches] = create(
	state,
	(draft) => {
		draft.foo = 'bar';
	},
	{ enablePatches: true },
);

// Immer
import { produce, applyPatches, enablePatches } from 'immer';
enablePatches();
const [newState, patches, inversePatches] = produce(
	state,
	(draft) => {
		draft.foo = 'bar';
	},
	(patches, inversePatches) => [patches, inversePatches],
);
```

**Benchmark Priority**: 🥇 **CRITICAL** - Primary competitor for mutation performance

---

### Valtio (Top Priority - Reactive)

**Package**: `valtio` v2.3.0  
**Weekly Downloads**: 490,097  
**Size**: ~101 KB unpacked  
**License**: MIT

**Key Features**:

- Proxy-based state: `const state = proxy({ count: 0 })`
- Mutable syntax: `state.count++` triggers subscribers
- `subscribe(state, callback)` for change notifications
- `subscribeKey(state, 'key', callback)` for specific keys
- `watch((get) => get(state))` for computed-like reactions
- `snapshot(state)` for immutable reads
- Vanilla mode: `import { proxy, subscribe } from 'valtio/vanilla'`

**API Comparison**:

```typescript
// Valtio
import { proxy, subscribe, snapshot } from 'valtio/vanilla';
const state = proxy({ count: 0, items: [] });
subscribe(state, () => console.log('changed:', snapshot(state)));
state.count++; // Triggers subscription

// @data-map/core
const dm = new DataMap({ count: 0, items: [] });
dm.subscribe({ path: '/count', callback: (e) => console.log('changed:', e) });
dm.set('/count', 1); // Triggers subscription
```

**Benchmark Priority**: 🥇 **CRITICAL** - Closest subscription model comparison

---

### Fast-JSON-Patch (Top Priority - JSON Patch)

**Package**: `fast-json-patch` v3.1.1  
**Weekly Downloads**: 2,028,909  
**Size**: ~159 KB unpacked  
**License**: MIT

**Key Features**:

- RFC 6902 compliant patch application
- `applyPatch()` and `applyOperation()` for mutations
- `observe()` for change detection
- `generate()` for patch generation from observed changes
- `compare()` for diff between two objects
- `validate()` for patch validation
- Invertible patches with test operations

**API Comparison**:

```typescript
// fast-json-patch
import * as jsonpatch from 'fast-json-patch';
const doc = { foo: 'bar' };
const ops = [{ op: 'replace', path: '/foo', value: 'baz' }];
const result = jsonpatch.applyPatch(doc, ops);

// @data-map/core
const dm = new DataMap({ foo: 'bar' });
dm.patch([{ op: 'replace', path: '/foo', value: 'baz' }]);
```

**Benchmark Priority**: 🥇 **CRITICAL** - Primary JSON Patch performance baseline

---

### Dot-Prop (High Priority - Path Access)

**Package**: `dot-prop` v10.1.0  
**Weekly Downloads**: 12,776,510  
**Size**: ~30.3 KB unpacked  
**License**: MIT

**Key Features**:

- `getProperty()`, `setProperty()`, `hasProperty()`, `deleteProperty()`
- Array path support: `['users', 0, 'name']`
- Bracket notation: `'users[0].name'`
- `escapePath()` and `parsePath()` utilities
- `deepKeys()` for all paths in object
- `unflatten()` for dot paths to nested object

**API Comparison**:

```typescript
// dot-prop
import { getProperty, setProperty } from 'dot-prop';
const obj = { users: [{ name: 'Alice' }] };
getProperty(obj, 'users[0].name'); // 'Alice'
setProperty(obj, 'users[0].role', 'admin');

// @data-map/core
const dm = new DataMap({ users: [{ name: 'Alice' }] });
dm.get('/users/0/name'); // 'Alice'
dm.set('/users/0/role', 'admin');
```

**Benchmark Priority**: 🥇 **HIGH** - Feature-complete path access comparison

---

### dlv + dset (High Priority - Lightweight Path)

**Packages**: `dlv` v1.1.3 + `dset` v3.1.4  
**Weekly Downloads**: 10M + 3.1M  
**Combined Size**: ~130B + 197B = **327 bytes**

**Key Features**:

- **dlv**: Get deep property, 130 bytes
- **dset**: Set deep property, 197 bytes
- Array/string paths supported
- Default value support in dlv
- Merge mode in dset/merge

**API Comparison**:

```typescript
// dlv + dset
import dlv from 'dlv';
import { dset } from 'dset';
const obj = { a: { b: { c: 1 } } };
dlv(obj, 'a.b.c'); // 1
dset(obj, 'a.b.d', 2); // mutates obj

// @data-map/core
const dm = new DataMap({ a: { b: { c: 1 } } });
dm.get('/a/b/c'); // 1
dm.set('/a/b/d', 2); // immutable update
```

**Benchmark Priority**: 🥇 **HIGH** - Lightweight baseline for path operations

---

## Benchmark Test Categories by Library

### 1. Path Access Benchmarks

| Operation                              | Libraries to Compare                                |
| -------------------------------------- | --------------------------------------------------- |
| Get shallow (`/foo`)                   | dlv, dot-prop, object-path, lodash, @data-map/core  |
| Get deep (`/a/b/c/d/e`)                | dlv, dot-prop, object-path, lodash, @data-map/core  |
| Get with array index (`/items/0/name`) | dlv, dot-prop, object-path, @data-map/core          |
| Set shallow                            | dset, dot-prop, object-path, lodash, @data-map/core |
| Set deep (create intermediate)         | dset, dot-prop, object-path, @data-map/core         |
| Has/exists check                       | dot-prop, object-path, @data-map/core               |
| Delete                                 | dot-prop, object-path, lodash, @data-map/core       |

### 2. Immutable Update Benchmarks

| Operation                | Libraries to Compare                    |
| ------------------------ | --------------------------------------- |
| Single property update   | Mutative, Immer, @data-map/core         |
| Deep nested update       | Mutative, Immer, @data-map/core         |
| Array push               | Mutative, Immer, @data-map/core         |
| Array splice             | Mutative, Immer, @data-map/core         |
| Multiple updates (batch) | Mutative, Immer, @data-map/core.batch() |
| With patch generation    | Mutative, Immer, @data-map/core         |
| With freeze enabled      | Mutative, Immer, @data-map/core         |

### 3. JSON Patch Benchmarks

| Operation              | Libraries to Compare                                           |
| ---------------------- | -------------------------------------------------------------- |
| Apply single `add`     | fast-json-patch, rfc6902, immutable-json-patch, @data-map/core |
| Apply single `replace` | fast-json-patch, rfc6902, immutable-json-patch, @data-map/core |
| Apply single `remove`  | fast-json-patch, rfc6902, immutable-json-patch, @data-map/core |
| Apply `move`           | fast-json-patch, rfc6902, immutable-json-patch, @data-map/core |
| Apply `copy`           | fast-json-patch, rfc6902, immutable-json-patch, @data-map/core |
| Apply `test`           | fast-json-patch, rfc6902, immutable-json-patch, @data-map/core |
| Apply batch (10 ops)   | fast-json-patch, rfc6902, @data-map/core                       |
| Apply batch (100 ops)  | fast-json-patch, rfc6902, @data-map/core                       |
| Generate patch (diff)  | fast-json-patch, rfc6902, @data-map/core                       |
| Revert patches         | immutable-json-patch, @data-map/core                           |

### 4. Subscription/Reactivity Benchmarks

| Operation                       | Libraries to Compare            |
| ------------------------------- | ------------------------------- |
| Subscribe single path           | Valtio, Zustand, @data-map/core |
| Notify single subscriber        | Valtio, Zustand, @data-map/core |
| Notify 100 subscribers          | Valtio, Zustand, @data-map/core |
| Subscribe with selector/pattern | Valtio, @data-map/core          |
| Unsubscribe                     | Valtio, Zustand, @data-map/core |

### 5. Clone Benchmarks

| Operation                     | Libraries to Compare                                      |
| ----------------------------- | --------------------------------------------------------- |
| Clone JSON-only data          | klona/json, rfdc, structuredClone, @data-map/core.clone() |
| Clone with Date/RegExp        | klona/lite, rfdc, @data-map/core.clone()                  |
| Clone with Map/Set            | klona, rfdc, @data-map/core.clone()                       |
| Clone large array (10K items) | klona, rfdc, @data-map/core.clone()                       |
| Clone deep object (20 levels) | klona, rfdc, @data-map/core.clone()                       |

### Benchmarking Framework

- **Framework**: Vitest Bench (already used in both packages)
- **Configuration**: Extends `@lellimecnar/vitest-config` with path aliases
- **Output**: JSON results for comparison (`--reporter=json --outputFile=results.json`)

## Recommended Approach

### Package Structure for @data-map/benchmarks

```
packages/data-map/benchmarks/
├── AGENTS.md
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── baseline.json                    # Stored baseline for regression detection
├── src/
│   ├── adapters/
│   │   ├── types.ts                 # DataMapAdapter interface
│   │   ├── index.ts
│   │   ├── datamap.lellimecnar.ts   # @data-map/core adapter
│   │   ├── lodash.ts                # lodash get/set adapter
│   │   ├── object-path.ts           # object-path adapter
│   │   ├── dot-prop.ts              # dot-prop adapter
│   │   ├── immer.ts                 # immer adapter
│   │   └── fast-json-patch.ts       # fast-json-patch adapter
│   ├── fixtures/
│   │   ├── data-generators.ts       # Reusable data generators
│   │   ├── datasets.ts              # Pre-generated datasets
│   │   └── index.ts
│   ├── path-access.bench.ts         # get/set operations
│   ├── immutable-updates.bench.ts   # set with structural sharing
│   ├── json-patch.bench.ts          # RFC 6902 operations
│   ├── array-operations.bench.ts    # push/pop/splice etc.
│   ├── batch-operations.bench.ts    # Transaction/batch performance
│   ├── subscriptions.bench.ts       # Subscribe/notify overhead
│   ├── definitions.bench.ts         # Computed values
│   ├── scale-testing.bench.ts       # Large data performance
│   └── memory-profiling.bench.ts    # Memory usage tracking
└── scripts/
    └── compare-results.js           # Result comparison utility
```

### Benchmark Categories

1. **Path Access Performance**
   - Simple pointer resolution: `/a/b/c`
   - JSONPath queries: `$.store.book[*].title`
   - Filter expressions: `$.items[?@.active == true]`
   - Recursive descent: `$..name`
   - Compare: lodash, object-path, dot-prop

2. **Immutable Update Performance**
   - Single value set
   - Deep nested set
   - Multiple values in batch
   - Compare: Immer `produce()`

3. **JSON Patch Performance**
   - Single operation apply
   - Batch operations (10, 100 ops)
   - Complex patch sequences (add, remove, replace, move, copy)
   - Compare: fast-json-patch, rfc6902

4. **Array Operation Performance**
   - push/unshift (append)
   - pop/shift (remove)
   - splice (insert/delete)
   - sort/shuffle (reorder)
   - Compare: Immer array operations

5. **Batch/Transaction Performance**
   - Multiple sets in batch
   - Transaction with rollback
   - Fluent batch API overhead

6. **Subscription Performance**
   - Static pointer subscription
   - Wildcard pattern subscription
   - Recursive descent subscription
   - Notification dispatch with N subscribers
   - Pattern re-evaluation on structural change

7. **Definition/Computed Performance**
   - Getter transform overhead
   - Setter transform overhead
   - Definition lookup cost

8. **Scale Testing**
   - Large arrays (100, 1K, 10K, 100K items)
   - Deep objects (5, 10, 20 levels)
   - Wide objects (10, 100, 1000 properties)
   - Many subscriptions (10, 100, 1000)

9. **Memory Profiling**
   - Structural sharing efficiency
   - Subscription memory overhead
   - Clone memory usage

### Adapter Interface Design

```typescript
export type DataMapAdapterKind = 'path' | 'immutable' | 'patch' | 'reactive';

export interface PathAccessFeatures {
	supportsGet: boolean;
	supportsSet: boolean;
	supportsDelete: boolean;
	supportsHas: boolean;
	supportsDeepPath: boolean;
	supportsJsonPath: boolean;
	mutatesInput: boolean;
}

export interface PathAccessAdapter {
	kind: 'path';
	name: string;
	features: PathAccessFeatures;
	get: <T>(obj: unknown, path: string) => T;
	set?: (obj: unknown, path: string, value: unknown) => unknown;
	has?: (obj: unknown, path: string) => boolean;
	delete?: (obj: unknown, path: string) => unknown;
	smokeTest: () => boolean;
}

export interface ImmutableUpdateFeatures {
	supportsStructuralSharing: boolean;
	supportsPatches: boolean;
	supportsRollback: boolean;
}

export interface ImmutableUpdateAdapter {
	kind: 'immutable';
	name: string;
	features: ImmutableUpdateFeatures;
	update: <T>(state: T, recipe: (draft: T) => void) => T;
	smokeTest: () => boolean;
}
```

## Implementation Guidance

- **Objectives**: Create comprehensive benchmark suite comparing @data-map/core against established alternatives
- **Key Tasks**:
  1. Create `packages/data-map/benchmarks` package with proper workspace config
  2. Implement adapter pattern for each comparison library
  3. Port data generators from jsonpath/benchmarks
  4. Create categorized benchmark files
  5. Add regression detection against baseline
- **Dependencies**: vitest, lodash, object-path, dot-prop, immer, fast-json-patch
- **Success Criteria**:
  - All benchmark categories covered
  - Fair comparisons via adapter abstraction
  - Reproducible results with baseline storage
  - CI integration for performance regression detection

## Gaps and Considerations

1. **Subscription Comparison**: Few alternatives have comparable subscription systems—may need custom measurement approaches
2. **Definition/Computed**: Unique to DataMap—benchmark as standalone performance characterization
3. **Memory Profiling**: Vitest bench doesn't natively track memory—may need custom instrumentation
4. **Browser Benchmarks**: Consider adding browser config like jsonpath/benchmarks has
5. **Warm-up Runs**: Ensure JIT compilation effects are accounted for in benchmarks
6. **Statistical Significance**: Use sufficient iterations for stable results
