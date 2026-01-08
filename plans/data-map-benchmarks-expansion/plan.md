# DataMap Benchmarks Expansion

**Branch:** `feat/data-map-benchmarks-expansion`
**Description:** Expand `@data-map/benchmarks` into a comprehensive, exhaustive benchmark suite comparing all `@data-map/*` packages against competing libraries across multiple categories.

## Goal

Transform the existing minimal `@data-map/benchmarks` package into a production-grade, comparative benchmark suite modeled after the successful `@jsonpath/benchmarks` architecture. This will enable rigorous performance validation, regression tracking, and competitive positioning of the DataMap library suite against industry-standard alternatives.

---

## Current State Analysis

### Existing Benchmark Files (6 files)

| File                     | What it tests                              | Gap                     |
| ------------------------ | ------------------------------------------ | ----------------------- |
| `signals.bench.ts`       | signal read/write, computed, batch, effect | No external comparisons |
| `storage.bench.ts`       | FlatStore get/set/has/delete/toObject      | No external comparisons |
| `subscriptions.bench.ts` | pointer/pattern subscribe, notify          | No external comparisons |
| `arrays.bench.ts`        | SmartArray, GapBuffer, PersistentVector    | No external comparisons |
| `scale.bench.ts`         | Medium dataset operations                  | Limited scope           |
| `memory.bench.ts`        | Memory measurement                         | Minimal implementation  |

### Existing Infrastructure

- ✅ Vitest bench with browser support (Playwright)
- ✅ Fixture generators (SMALL, MEDIUM, LARGE datasets)
- ✅ Memory measurement utilities
- ✅ Baseline JSON for regression tracking
- ❌ No adapter pattern for competitors
- ❌ No smoke tests for adapters
- ❌ No comprehensive README
- ❌ No feature matrices

---

## Competitor Library Categories

### Category 1: Signal Reactivity

| Library              | npm Package            | Priority                       |
| -------------------- | ---------------------- | ------------------------------ |
| @preact/signals-core | `@preact/signals-core` | HIGH                           |
| @maverick-js/signals | `@maverick-js/signals` | HIGH                           |
| @vue/reactivity      | `@vue/reactivity`      | MEDIUM                         |
| nanostores           | `nanostores`           | MEDIUM                         |
| solid-js signals     | `solid-js`             | MEDIUM (included per decision) |

### Category 2: State Management

| Library           | npm Package       | Priority |
| ----------------- | ----------------- | -------- |
| zustand (vanilla) | `zustand/vanilla` | HIGH     |
| jotai             | `jotai`           | MEDIUM   |
| valtio            | `valtio`          | MEDIUM   |

### Category 3: Immutable Updates

| Library             | npm Package           | Priority |
| ------------------- | --------------------- | -------- |
| immer               | `immer`               | HIGH     |
| mutative            | `mutative`            | HIGH     |
| immutability-helper | `immutability-helper` | LOW      |

### Category 4: Path-Based Access

| Library        | npm Package   | Priority |
| -------------- | ------------- | -------- |
| lodash.get/set | `lodash`      | HIGH     |
| dot-prop       | `dot-prop`    | HIGH     |
| object-path    | `object-path` | MEDIUM   |
| dlv/dset       | `dlv`, `dset` | MEDIUM   |

### Category 5: Subscription/Pub-Sub

| Library       | npm Package     | Priority |
| ------------- | --------------- | -------- |
| mitt          | `mitt`          | HIGH     |
| eventemitter3 | `eventemitter3` | MEDIUM   |
| nanoevents    | `nanoevents`    | MEDIUM   |

---

## Implementation Steps

### Step 1: Adapter Infrastructure Foundation

**Files:**

- `src/adapters/types.ts`
- `src/adapters/index.ts`
- `src/utils/adapter-helpers.ts`

**What:** Create the normalized adapter interface layer following `@jsonpath/benchmarks` patterns. Define base interfaces for each category (SignalAdapter, StateAdapter, ImmutableAdapter, PathAdapter, SubscriptionAdapter) with feature matrices and smokeTest requirements.

**Testing:** Unit tests for adapter helper utilities; type checking passes.

---

### Step 2: Baseline Benchmarks (All Categories)

**Files:**

- `src/baselines/signals.baseline.bench.ts`
- `src/baselines/storage.baseline.bench.ts`
- `src/baselines/subscriptions.baseline.bench.ts`
- `src/baselines/arrays.baseline.bench.ts`
- `src/baselines/path.baseline.bench.ts`
- `src/baselines/core.baseline.bench.ts`
- `baseline.json` (update)

**What:** Establish comprehensive baselines for all @data-map packages before adding competitors. Run benchmarks, capture ops/sec metrics, and store in `baseline.json` for regression tracking.

**Testing:** Baselines captured and stored; `baseline.json` updated with current performance metrics.

---

### Step 3: Signal Adapters (Category 1)

**Files:**

- `src/adapters/signals.data-map.ts`
- `src/adapters/signals.data-map.spec.ts`
- `src/adapters/signals.preact.ts`
- `src/adapters/signals.preact.spec.ts`
- `src/adapters/signals.maverick.ts`
- `src/adapters/signals.maverick.spec.ts`
- `src/adapters/signals.vue.ts`
- `src/adapters/signals.vue.spec.ts`
- `src/adapters/signals.nanostores.ts`
- `src/adapters/signals.nanostores.spec.ts`
- `src/adapters/signals.solid.ts`
- `src/adapters/signals.solid.spec.ts`

**What:** Implement normalized SignalAdapter wrappers for @data-map/signals and competing libraries (including solid-js). Each adapter exposes: `createSignal()`, `createComputed()`, `createEffect()`, `batch()`, `dispose()`. Include smoke tests to verify correct operation.

**Testing:** Run smoke tests: `vitest run src/adapters/signals.*.spec.ts`

---

### Step 4: Comparative Signal Benchmarks

**Files:**

- `src/signals-comparative.bench.ts`
- `src/signals-scale.bench.ts`

**What:** Create comprehensive signal benchmarks comparing all adapters:

- Signal creation (1, 100, 10K signals)
- Signal read throughput
- Signal write throughput
- Computed value creation and caching
- Computed dirty recalculation
- Effect creation and triggering
- Batch write performance (10, 100, 1000 writes)
- Diamond dependency graph performance
- Deep dependency chain performance

**Testing:** Run benchmarks, verify all adapters execute correctly: `pnpm bench src/signals-comparative.bench.ts`

---

### Step 5: State Management Adapters (Category 2)

**Files:**

- `src/adapters/state.data-map.ts`
- `src/adapters/state.data-map.spec.ts`
- `src/adapters/state.zustand.ts`
- `src/adapters/state.zustand.spec.ts`
- `src/adapters/state.jotai.ts`
- `src/adapters/state.jotai.spec.ts`
- `src/adapters/state.valtio.ts`
- `src/adapters/state.valtio.spec.ts`

**What:** Implement StateAdapter wrappers exposing: `createStore()`, `get()`, `set()`, `subscribe()`, `getSnapshot()`. Focus on vanilla/core APIs without React bindings.

**Testing:** Smoke tests pass for all state adapters.

---

### Step 6: Comparative State Management Benchmarks

**Files:**

- `src/state-management.bench.ts`
- `src/state-scale.bench.ts`

**What:** Comprehensive state benchmarks:

- Store creation
- Get/set operations at various depths
- Subscription add/remove
- Subscription notification throughput
- Snapshot/getState performance
- Batch updates
- Scale testing (1K, 10K, 100K keys)

**Testing:** Benchmarks run successfully across all adapters.

---

### Step 7: Immutable Update Adapters (Category 3)

**Files:**

- `src/adapters/immutable.data-map.ts`
- `src/adapters/immutable.data-map.spec.ts`
- `src/adapters/immutable.immer.ts`
- `src/adapters/immutable.immer.spec.ts`
- `src/adapters/immutable.mutative.ts`
- `src/adapters/immutable.mutative.spec.ts`

**What:** Implement ImmutableAdapter wrappers exposing: `produce(base, recipe)` interface for immutable updates. Compare structural sharing and update performance.

**Testing:** Smoke tests verify immutable semantics (original unchanged, new object returned).

---

### Step 8: Comparative Immutable Benchmarks

**Files:**

- `src/immutable-updates.bench.ts`

**What:** Comprehensive immutable update benchmarks:

- Shallow property update
- Deep nested update (5 levels)
- Array push/splice/filter operations
- Multiple property updates in single produce
- Structural sharing verification
- Scale testing with large objects

**Testing:** Benchmarks execute, results show relative performance.

---

### Step 9: Path Access Adapters (Category 4)

**Files:**

- `src/adapters/path.data-map.ts`
- `src/adapters/path.data-map.spec.ts`
- `src/adapters/path.lodash.ts`
- `src/adapters/path.lodash.spec.ts`
- `src/adapters/path.dot-prop.ts`
- `src/adapters/path.dot-prop.spec.ts`
- `src/adapters/path.object-path.ts`
- `src/adapters/path.object-path.spec.ts`
- `src/adapters/path.dlv-dset.ts`
- `src/adapters/path.dlv-dset.spec.ts`

**What:** Implement PathAdapter wrappers exposing: `get(obj, path)`, `set(obj, path, value)`, `has(obj, path)`, `delete(obj, path)`. Normalize path syntax handling.

**Testing:** Smoke tests verify correct path resolution.

---

### Step 10: Comparative Path Access Benchmarks

**Files:**

- `src/path-access.bench.ts`
- `src/path-scale.bench.ts`

**What:** Comprehensive path benchmarks:

- Shallow access (1 level)
- Deep access (5, 10, 20 levels)
- Array index access
- Wildcard patterns (where supported)
- Path compilation/caching
- Scale testing with wide objects

**Testing:** Benchmarks run, clear performance comparisons available.

---

### Step 11: Subscription Adapters (Category 5)

**Files:**

- `src/adapters/pubsub.data-map.ts`
- `src/adapters/pubsub.data-map.spec.ts`
- `src/adapters/pubsub.mitt.ts`
- `src/adapters/pubsub.mitt.spec.ts`
- `src/adapters/pubsub.eventemitter3.ts`
- `src/adapters/pubsub.eventemitter3.spec.ts`
- `src/adapters/pubsub.nanoevents.ts`
- `src/adapters/pubsub.nanoevents.spec.ts`

**What:** Implement PubSubAdapter wrappers exposing: `on(event, handler)`, `off(event, handler)`, `emit(event, data)`. Compare with @data-map/subscriptions pattern matching.

**Testing:** Smoke tests verify event emission and handler invocation.

---

### Step 12: Comparative Subscription Benchmarks

**Files:**

- `src/subscriptions-comparative.bench.ts`

**What:** Comprehensive subscription benchmarks:

- Subscribe/unsubscribe throughput
- Emit to N listeners (1, 10, 100, 1000)
- Pattern matching performance (DataMap-specific)
- Wildcard subscription resolution
- Memory footprint per subscription

**Testing:** Benchmarks execute across all adapters.

---

### Step 13: Array Data Structure Benchmarks

**Files:**

- `src/arrays-comparative.bench.ts`

**What:** Expand array benchmarks to compare:

- SmartArray vs native Array for push/pop/splice
- GapBuffer vs Array for middle insertions
- PersistentVector vs Immer frozen arrays
- Scale testing (1K, 10K, 100K elements)

**Testing:** Benchmarks show relative performance of specialized structures.

---

### Step 14: Memory Profiling Suite

**Files:**

- `src/memory-signals.bench.ts`
- `src/memory-storage.bench.ts`
- `src/memory-subscriptions.bench.ts`
- `src/utils/memory-profiler.ts`

**What:** Comprehensive memory benchmarks:

- Memory per signal/computed/effect
- Memory per subscription
- Memory per stored key
- Heap growth over time
- GC pressure analysis

**Testing:** Memory metrics collected and reported.

---

### Step 15: Scale Testing Suite

**Files:**

- `src/scale-comprehensive.bench.ts`
- `src/fixtures/scale-generators.ts`

**What:** Unified scale testing across all categories:

- Small (1K entries)
- Medium (10K entries)
- Large (100K entries)
- XLarge (1M entries, optional)
- Deep nesting (10, 50, 100 levels)
- Wide objects (1K, 10K properties)

**Testing:** Scale benchmarks complete within reasonable time, results stored.

---

### Step 16: Browser Benchmark Suite

**Files:**

- `src/browser/index.bench.ts`
- `src/browser/signals.bench.ts`
- `src/browser/storage.bench.ts`
- `vitest.config.browser.ts` (update)

**What:** Create browser-specific benchmark suite:

- Critical path benchmarks for each category
- DOM integration overhead (where relevant)
- Cross-browser performance (Chromium, Firefox, WebKit)

**Testing:** Browser benchmarks run via Playwright: `pnpm bench:browser`

---

### Step 17: Performance Regression Testing

**Files:**

- `src/performance-regression.spec.ts`
- `baseline.json` (update)

**What:** Implement warn-only performance regression detection:

- Define baseline ops/sec for critical operations
- Create Vitest spec that checks against baselines
- Configure warn-only mode (never block CI)
- Add scripts for baseline updates

**Testing:** Regression spec runs, warnings emitted for performance drops.

---

### Step 18: Reporting & Visualization

**Files:**

- `scripts/generate-report.ts`
- `scripts/compare-results.ts` (update)
- `BENCHMARK_RESULTS.md` (auto-generated)

**What:** Create comprehensive reporting:

- Markdown table generation
- Category-by-category comparisons
- Historical trend tracking
- JSON output for CI integration

**Testing:** Reports generate correctly from benchmark output.

---

### Step 19: Documentation & README

**Files:**

- `README.md`
- `docs/METHODOLOGY.md`
- `docs/INTERPRETING_RESULTS.md`

**What:** Comprehensive documentation:

- Overview of benchmark categories
- How to run benchmarks
- How to add new adapters
- Methodology and statistical considerations
- Interpreting results
- Known limitations

**Testing:** Documentation is complete and accurate.

---

### Step 20: Package Configuration Updates

**Files:**

- `package.json`
- `tsconfig.json` (if needed)

**What:** Update package configuration:

- Add all competitor dependencies
- Add new scripts for category-specific runs
- Configure proper peer dependencies
- Update build configuration

**Testing:** `pnpm install` succeeds, all scripts work.

---

### Step 21: Final Validation & Smoke Tests

**Files:**

- `src/external-imports.smoke.spec.ts`

**What:** Final validation:

- Smoke test for all external imports
- Verify all adapters load correctly
- Run full benchmark suite end-to-end
- Generate final baseline and report

**Testing:** Full benchmark suite runs successfully; all smoke tests pass.

---

## Dependencies to Add

```json
{
	"devDependencies": {
		"@preact/signals-core": "^1.8.0",
		"@maverick-js/signals": "^6.0.0",
		"@vue/reactivity": "^3.5.0",
		"nanostores": "^0.11.0",
		"solid-js": "^1.9.0",
		"zustand": "^5.0.0",
		"jotai": "^2.10.0",
		"valtio": "^2.1.0",
		"immer": "^10.1.0",
		"mutative": "^1.1.0",
		"lodash": "^4.17.21",
		"@types/lodash": "^4.17.0",
		"dot-prop": "^9.0.0",
		"object-path": "^0.11.8",
		"dlv": "^1.1.3",
		"dset": "^3.1.4",
		"mitt": "^3.0.1",
		"eventemitter3": "^5.0.1",
		"nanoevents": "^9.1.0"
	}
}
```

---

## Success Criteria

1. **Coverage:** All 6 @data-map packages have comprehensive benchmarks
2. **Baselines:** @data-map baselines established before competitor comparisons
3. **Comparisons:** Each category has 3+ competitor library comparisons (including solid-js)
4. **Adapters:** All adapters have smoke tests verifying correct operation
5. **Scale:** Benchmarks run at multiple dataset sizes (1K, 10K, 100K)
6. **Memory:** Memory profiling available for key operations
7. **Browser:** Cross-browser benchmarks functional
8. **Regression:** Baseline-based regression detection in place
9. **Documentation:** Complete README and methodology docs
10. **Reporting:** Markdown reports generated from benchmark output

---

## Estimated Effort

| Step                                      | Complexity | Estimate  |
| ----------------------------------------- | ---------- | --------- |
| 1. Adapter Infrastructure                 | Medium     | 2-3 hours |
| 2. Baseline Benchmarks                    | Medium     | 2-3 hours |
| 3-4. Signal Adapters + Benchmarks         | High       | 5-7 hours |
| 5-6. State Adapters + Benchmarks          | Medium     | 3-4 hours |
| 7-8. Immutable Adapters + Benchmarks      | Medium     | 2-3 hours |
| 9-10. Path Adapters + Benchmarks          | Medium     | 3-4 hours |
| 11-12. Subscription Adapters + Benchmarks | Medium     | 2-3 hours |
| 13. Array Benchmarks                      | Low        | 1-2 hours |
| 14. Memory Profiling                      | Medium     | 2-3 hours |
| 15. Scale Testing                         | Medium     | 2-3 hours |
| 16. Browser Suite                         | Medium     | 2-3 hours |
| 17. Regression Testing                    | Low        | 1-2 hours |
| 18. Reporting                             | Medium     | 2-3 hours |
| 19. Documentation                         | Medium     | 2-3 hours |
| 20-21. Package Config + Final Validation  | Low        | 1-2 hours |

**Total Estimated:** 32-48 hours

---

## Decisions (Clarified)

1. **Scope Priority:** ✅ Implement all 5 categories in parallel
2. **Baseline Strategy:** ✅ Establish @data-map baselines first before adding competitors
3. **Visualization:** ✅ Markdown table output is sufficient
4. **CI Integration:** ✅ No CI integration required (manual runs only)
5. **solid-js Inclusion:** ✅ Include solid-js signals despite complex setup
