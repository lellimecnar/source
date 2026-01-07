# @data-map/core Benchmarking Suite

**Branch:** `feat/data-map-benchmarks`
**Description:** Comprehensive benchmarking package comparing @data-map/core performance against alternative data mapping and state management libraries

## Goal

Create a robust, exhaustive benchmarking test suite that objectively measures @data-map/core performance across all its capabilities (path access, mutations, subscriptions, batch operations, computed definitions) against industry-standard alternatives. This enables data-driven optimization decisions and provides confidence in the library's performance characteristics.

## Design Decisions

Based on clarifications and research:

1. **Subscription Comparison**: Compare against full state management libraries (MobX, Zustand, Valtio) for reactive subscription benchmarks
2. **JSONPath**: Compare performance with raw `@jsonpath/*` package calls to measure integration overhead
3. **Computed Definitions**: Treat as primary feature—comprehensive benchmarks required
4. **Benchmarking Tool**: Use Vitest's built-in benchmark functionality
5. **Memory Profiling**: Use Vitest benchmark memory measurements (no manual V8 heap snapshots)

## Comparison Libraries

| Category              | Libraries                                            | Notes                                       |
| --------------------- | ---------------------------------------------------- | ------------------------------------------- |
| **Path Access**       | `dot-prop`, `dlv`+`dset`, `lodash`                   | Baseline get/set performance                |
| **Immutable Updates** | `mutative`, `immer`                                  | Mutative claims 10x faster than Immer       |
| **JSON Patch**        | `fast-json-patch`, `rfc6902`, `immutable-json-patch` | RFC 6902 compliance comparison              |
| **JSONPath**          | `@jsonpath/*` (internal)                             | Measure @data-map/core integration overhead |
| **Reactive State**    | `valtio`, `zustand`                                  | Proxy-based reactivity comparison           |
| **Cloning**           | `klona`, `rfdc`                                      | Structural sharing baseline                 |

## Implementation Steps

### Step 1: Package Scaffolding & Infrastructure

**Files:**

- `packages/data-map/benchmarks/package.json`
- `packages/data-map/benchmarks/tsconfig.json`
- `packages/data-map/benchmarks/vitest.config.ts`
- `packages/data-map/benchmarks/AGENTS.md`
- `packages/data-map/benchmarks/README.md`
- `turbo.json` (add benchmark tasks)

**What:** Create the benchmark package structure following the established pattern from `@jsonpath/benchmarks`. Configure Vitest for benchmarking mode, set up TypeScript, and integrate with the monorepo's Turborepo pipeline.

**Testing:** Run `pnpm --filter @data-map/benchmarks build` successfully; verify package resolves in workspace.

---

### Step 2: Fixture Generators & Test Data

**Files:**

- `packages/data-map/benchmarks/src/fixtures/index.ts`
- `packages/data-map/benchmarks/src/fixtures/generators.ts`
- `packages/data-map/benchmarks/src/fixtures/datasets.ts`
- `packages/data-map/benchmarks/src/fixtures/types.ts`

**What:** Create reusable data generators for various scale scenarios:

- Small objects (10 keys, 2 levels deep)
- Medium objects (100 keys, 5 levels deep)
- Large objects (1000+ keys, 10+ levels deep)
- Wide arrays (10K, 100K, 1M elements)
- Deeply nested structures (50+ levels)
- Mixed complex structures (arrays of objects with nested arrays)

**Testing:** Unit tests verify generators produce expected shapes and sizes; smoke test data creation performance.

---

### Step 3: Adapter Interface & Core Adapter

**Files:**

- `packages/data-map/benchmarks/src/adapters/types.ts`
- `packages/data-map/benchmarks/src/adapters/data-map.adapter.ts`
- `packages/data-map/benchmarks/src/adapters/index.ts`
- `packages/data-map/benchmarks/src/adapters/adapter.spec.ts`

**What:** Define a unified adapter interface with feature flags declaring capabilities:

```typescript
interface BenchmarkAdapter {
	name: string;
	features: {
		get: boolean;
		set: boolean;
		immutableSet: boolean;
		jsonPatch: boolean;
		batchPatch: boolean;
		subscriptions: boolean;
		jsonPath: boolean;
		computed: boolean;
	};
	// Operation methods
	get(data: unknown, path: string): unknown;
	set(data: unknown, path: string, value: unknown): unknown;
	// ... etc
}
```

Implement the @data-map/core adapter first.

**Testing:** Adapter smoke tests verify all declared features work correctly.

---

### Step 4: Baseline Comparison Adapters (dot-prop, dlv/dset, lodash)

**Files:**

- `packages/data-map/benchmarks/src/adapters/lodash.adapter.ts`
- `packages/data-map/benchmarks/src/adapters/dot-prop.adapter.ts`
- `packages/data-map/benchmarks/src/adapters/dlv-dset.adapter.ts`

**What:** Implement adapters for baseline path access libraries:

- **lodash**: `_.get()`, `_.set()`, `_.cloneDeep()` for immutable operations
- **dot-prop**: Modern ESM path access with full CRUD, escape handling, unflatten
- **dlv + dset**: Ultra-lightweight (327 bytes combined) baseline

These provide baseline comparison for simple get/set operations.

**Testing:** Each adapter passes smoke tests for its declared features.

---

### Step 5: Immutable Update Adapters (Mutative, Immer)

**Files:**

- `packages/data-map/benchmarks/src/adapters/mutative.adapter.ts`
- `packages/data-map/benchmarks/src/adapters/immer.adapter.ts`

**What:** Implement adapters for immutable state update libraries:

- **Mutative**: Claims 10x faster than Immer, full RFC 6902 patch support with `{ arrayLengthAssignment: false }`
- **Immer**: Industry standard (10.6M weekly downloads), used by Redux Toolkit

Focus on comparing immutable set operations and batch updates.

**Testing:** Adapter smoke tests verify immutable update semantics (original unchanged, new reference returned).

---

### Step 6: JSON Patch Adapters (fast-json-patch, rfc6902, immutable-json-patch)

**Files:**

- `packages/data-map/benchmarks/src/adapters/fast-json-patch.adapter.ts`
- `packages/data-map/benchmarks/src/adapters/rfc6902.adapter.ts`
- `packages/data-map/benchmarks/src/adapters/immutable-json-patch.adapter.ts`

**What:** Implement adapters for RFC 6902 JSON Patch libraries:

- **fast-json-patch**: Popular (2M downloads), observe/generate/compare/validate APIs
- **rfc6902**: Strict RFC compliance
- **immutable-json-patch**: Immutable semantics with structural sharing

Compare patch application, batch patches, and diff generation.

**Testing:** Verify adapters correctly apply standard JSON Patch operations.

---

### Step 7: JSONPath Adapter (@jsonpath/\*)

**Files:**

- `packages/data-map/benchmarks/src/adapters/jsonpath-raw.adapter.ts`

**What:** Implement adapter for raw `@jsonpath/*` package calls:

- Direct usage of `@jsonpath/evaluator` and `@jsonpath/compiler`
- Compare against @data-map/core's integrated JSONPath usage
- Measure integration overhead and any optimization differences

This benchmark determines if @data-map/core adds meaningful overhead to JSONPath operations.

**Testing:** Verify adapter returns equivalent results to @data-map/core JSONPath queries.

---

### Step 8: Path Access Benchmarks

**Files:**

- `packages/data-map/benchmarks/src/path-access.bench.ts`

**What:** Benchmark path access operations:

- Simple shallow path (`/name`, `a.b`)
- Deep path access (`/deeply/nested/path/to/value`)
- Array index access (`/items/0`, `/items/-`)
- Missing path handling (return undefined gracefully)
- Path with special characters (escaped pointers)

Compare all adapters that support `get` feature.

**Testing:** Benchmarks run without errors; results are captured and comparable.

---

### Step 9: Mutation Benchmarks

**Files:**

- `packages/data-map/benchmarks/src/mutations.bench.ts`

**What:** Benchmark mutation operations:

- Shallow set operations
- Deep set operations (creating intermediate objects)
- Array element updates
- Immutable set (structural sharing verification)
- Delete operations

Compare mutable vs immutable approaches across all supporting adapters.

**Testing:** Verify mutations produce expected state; benchmark runs complete.

---

### Step 10: JSON Patch Benchmarks

**Files:**

- `packages/data-map/benchmarks/src/json-patch.bench.ts`

**What:** Benchmark RFC 6902 JSON Patch operations:

- Single patch application (add, remove, replace, move, copy)
- Batch patch application (10, 100, 1000 operations)
- Patch validation overhead
- Diff generation (comparing two objects)
- Immutable patch application

**Testing:** Patch results match expected RFC 6902 semantics.

---

### Step 11: Array Operation Benchmarks

**Files:**

- `packages/data-map/benchmarks/src/array-operations.bench.ts`

**What:** Benchmark array-specific operations:

- Push (append to end)
- Unshift (prepend to start)
- Splice (insert/remove in middle)
- Sort (in-place vs immutable)
- Filter/Map (if supported)
- Large array operations (10K, 100K elements)

**Testing:** Array state after operations is correct; performance scales predictably.

---

### Step 12: Batch & Transaction Benchmarks

**Files:**

- `packages/data-map/benchmarks/src/batch-operations.bench.ts`

**What:** Benchmark batch operation performance:

- Single operation baseline
- 10 operations in batch
- 100 operations in batch
- 1000 operations in batch
- Transaction rollback overhead
- Notification coalescing efficiency

This is a key differentiator for @data-map/core.

**Testing:** Batch operations produce same results as individual operations; notification counts are correct.

---

### Step 13: Subscription & Reactivity Benchmarks

**Files:**

- `packages/data-map/benchmarks/src/subscriptions.bench.ts`

**What:** Benchmark reactive subscription features against state management libraries:

- Subscription setup/teardown overhead
- Static pointer subscription notification latency
- Wildcard subscription matching performance
- JSONPath subscription matching
- Notification dispatch with many subscribers (10, 100, 1000)
- Selective notification (only affected paths notified)

Compare against:

- **Valtio**: Proxy-based subscriptions (closest model to @data-map/core)
- **Zustand**: Selector-based subscriptions

**Testing:** Subscriptions fire correct number of times; no memory leaks on unsubscribe.

---

### Step 13a: Reactive State Adapters (Valtio, Zustand)

**Files:**

- `packages/data-map/benchmarks/src/adapters/valtio.adapter.ts`
- `packages/data-map/benchmarks/src/adapters/zustand.adapter.ts`

**What:** Implement adapters for reactive state management:

- **Valtio**: Proxy-based state with automatic tracking, vanilla mode (no React required)
- **Zustand**: Lightweight state management with selectors, vanilla mode

These enable subscription performance comparison.

**Testing:** Adapters correctly track and notify on state changes.

---

### Step 14: Computed/Definition Benchmarks (Primary Feature)

**Files:**

- `packages/data-map/benchmarks/src/computed.bench.ts`

**What:** Comprehensive benchmarks for computed value features (primary feature focus):

- Definition setup overhead
- Lazy vs eager evaluation strategies
- Dependency tracking accuracy and overhead
- Recomputation on dependency change (single vs multiple deps)
- Circular dependency detection performance
- Deep dependency chains (10, 50, 100 levels)
- Many computed values (100, 1000 definitions)
- Computed values depending on other computed values

Compare against:

- **Valtio**: `derive()` computed values
- **Zustand**: Selector-based derived state

**Testing:** Computed values are correct; update precisely when dependencies change; no stale values.

---

### Step 15: Scale & Memory Benchmarks

**Files:**

- `packages/data-map/benchmarks/src/scale.bench.ts`

**What:** Benchmark performance at scale using Vitest benchmark memory measurements:

- Operations on objects with 10K, 100K, 1M keys
- Operations on deeply nested objects (50+ levels)
- Wide arrays (10K, 100K, 1M elements)
- Vitest `bench.memory()` for memory usage per operation
- Memory growth over repeated operations
- GC pressure via allocation rate

**Testing:** No OOM errors; memory usage documented; performance scales predictably.

---

### Step 15a: Cloning Baseline Adapters (klona, rfdc)

**Files:**

- `packages/data-map/benchmarks/src/adapters/klona.adapter.ts`
- `packages/data-map/benchmarks/src/adapters/rfdc.adapter.ts`

**What:** Implement adapters for high-performance cloning:

- **klona**: Multiple modes (json, lite, full), structural cloning
- **rfdc**: Really Fast Deep Clone, faster than JSON.parse(JSON.stringify())

Used as baseline for structural sharing comparisons.

**Testing:** Clones are deep copies; originals unmodified.

---

### Step 16: Results Aggregation & Reporting

**Files:**

- `packages/data-map/benchmarks/src/reporter.ts`
- `packages/data-map/benchmarks/src/run-all.ts`
- `packages/data-map/benchmarks/README.md` (update with results)

**What:** Create a comprehensive benchmark runner and reporter:

- Run all benchmark suites
- Aggregate results into markdown tables
- Generate comparison charts (optional: use chart library)
- Output CI-friendly JSON results
- Document methodology and caveats

**Testing:** Full benchmark suite runs; results are captured and formatted correctly.

---

### Step 17: CI Integration & Documentation

**Files:**

- `.github/workflows/benchmarks.yml` (if exists, update)
- `packages/data-map/benchmarks/README.md`
- `docs/api/data-map-benchmarks.md`
- `turbo.json` (ensure benchmark task caching)

**What:** Integrate benchmarks into CI/CD:

- Run benchmarks on PR (optional, can be heavy)
- Store baseline results for regression detection
- Document how to run benchmarks locally
- Document interpretation of results

**Testing:** CI workflow runs successfully; documentation is complete and accurate.

---

## Dependencies

```json
{
	"devDependencies": {
		"mutative": "^1.3.0",
		"immer": "^11.1.3",
		"fast-json-patch": "^3.1.1",
		"rfc6902": "^5.1.2",
		"immutable-json-patch": "^6.0.2",
		"dot-prop": "^10.1.0",
		"dlv": "^1.1.3",
		"dset": "^3.1.4",
		"klona": "^2.0.6",
		"rfdc": "^1.4.1",
		"valtio": "^2.3.0",
		"zustand": "^5.0.9",
		"lodash-es": "^4.17.21",
		"@types/lodash-es": "^4.17.12",
		"@types/dlv": "^1.1.4"
	}
}
```

## Success Criteria

- [ ] All adapters pass smoke tests
- [ ] Benchmarks cover all major @data-map/core features
- [ ] Computed definition benchmarks are comprehensive (primary feature)
- [ ] Subscription benchmarks compare against Valtio/Zustand
- [ ] JSONPath benchmarks compare against raw @jsonpath/\* calls
- [ ] Results are reproducible and documented
- [ ] CI integration captures regression baselines
- [ ] README provides clear instructions for running and interpreting benchmarks
