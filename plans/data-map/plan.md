# DataMap: High-Performance Reactive State Library

**Branch:** `feat/data-map-implementation`
**Description:** Implement complete DataMap reactive state management library with O(1) access patterns, JSON Path subscriptions, and signal-based reactivity.

## Goal

Build a high-performance reactive state library that provides instant access and mutation of deeply nested state using JSON Path (RFC 9535) and JSON Pointer (RFC 6901). The library enables O(1) access patterns through flat storage, reactive subscriptions, computed values, and optimized array operations.

---

## Package Dependency Graph

```
                    ┌─────────────────────┐
                    │   @data-map/core    │  ← Integration facade
                    └─────────┬───────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌─────────────────┐   ┌─────────────────┐
│@data-map/path │   │@data-map/arrays │   │@data-map/computed│
└───────────────┘   └─────────────────┘   └─────────────────┘
        │                     │                     │
        └──────────┬──────────┴──────────┬──────────┘
                   │                     │
                   ▼                     ▼
         ┌─────────────────┐   ┌─────────────────────┐
         │@data-map/storage│   │@data-map/subscriptions│
         └─────────────────┘   └─────────────────────┘
                   │                     │
                   └──────────┬──────────┘
                              ▼
                    ┌─────────────────┐
                    │ @data-map/signals│
                    └─────────────────┘

External Dependencies:
- @jsonpath/pointer, @jsonpath/jsonpath
- mnemonist (TrieMap, LRUCache)

Future Packages (deferred):
- @data-map/react, @data-map/vue, @data-map/solid
- @data-map/devtools
```

---

## Implementation Steps

### Step 1: Workspace Setup & Foundation

**Files:**

- `packages/data-map/` directory structure
- `pnpm-workspace.yaml` (update)
- Root `package.json` (add workspace scripts)

**What:** Create the `packages/data-map/` directory structure and update pnpm workspace configuration to include the new packages. Add root-level convenience scripts for DataMap development.

**Testing:** Run `pnpm install` to verify workspace recognition. Confirm packages appear in `pnpm list --filter @data-map/*`.

---

### Step 2: Add External Dependency (mnemonist)

**Files:**

- Root `package.json` or individual package.json files

**What:** Add `mnemonist` library as a dependency for TrieMap and other high-performance data structures needed by the subscription engine. Version ^0.39.0 is recommended for TypeScript support.

**Testing:** Verify `import { TrieMap } from 'mnemonist'` compiles and runs in a test file.

---

### Step 3: @data-map/signals - Core Reactivity Primitives

**Files:**

- `packages/data-map/signals/package.json`
- `packages/data-map/signals/tsconfig.json`
- `packages/data-map/signals/vite.config.ts`
- `packages/data-map/signals/src/index.ts`
- `packages/data-map/signals/src/signal.ts`
- `packages/data-map/signals/src/computed.ts`
- `packages/data-map/signals/src/effect.ts`
- `packages/data-map/signals/src/batch.ts`
- `packages/data-map/signals/src/context.ts`
- `packages/data-map/signals/src/types.ts`
- `packages/data-map/signals/src/__tests__/*.spec.ts`

**What:** Implement the foundational signal-based reactivity system. This is a **zero-dependency** package that provides:

1. **Signal<T>**: Reactive value container with `.value` getter/setter
2. **Computed<T>**: Derived values with automatic dependency tracking
3. **Effect**: Side-effect runner that re-executes on dependency changes
4. **Batch**: Transaction wrapper for batching multiple updates
5. **Context**: Tracking context for automatic dependency collection

Key implementation details:

- Pull-based lazy evaluation for computed values
- Automatic dependency tracking via execution context
- Diamond dependency problem handling
- Glitch-free propagation (topological sort)
- Memory-efficient weak references where appropriate

**Testing:**

- Unit tests for Signal read/write/subscribe
- Unit tests for Computed dependency tracking and memoization
- Unit tests for Effect lifecycle (create, dispose, cleanup)
- Unit tests for Batch transaction semantics
- Integration tests for diamond dependency resolution
- Performance benchmarks for signal updates (target: 10M ops/sec)

---

### Step 4: @data-map/storage - Flat Store Implementation

**Files:**

- `packages/data-map/storage/package.json`
- `packages/data-map/storage/tsconfig.json`
- `packages/data-map/storage/vite.config.ts`
- `packages/data-map/storage/src/index.ts`
- `packages/data-map/storage/src/flat-store.ts`
- `packages/data-map/storage/src/pointer-utils.ts`
- `packages/data-map/storage/src/nested-converter.ts`
- `packages/data-map/storage/src/array-metadata.ts`
- `packages/data-map/storage/src/versioning.ts`
- `packages/data-map/storage/src/types.ts`
- `packages/data-map/storage/src/__tests__/*.spec.ts`

**What:** Implement the core flat storage layer that converts nested objects to pointer-keyed maps. Depends on `@jsonpath/pointer` for pointer operations.

1. **FlatStore**: Core `Map<string, unknown>` storage with O(1) get/set/delete
2. **Pointer Utils**: Wrappers around `@jsonpath/pointer` for segment operations
3. **Nested Converter**: Bidirectional conversion between nested objects and flat storage
4. **Array Metadata**: Track array lengths, indices, and physical/logical mappings
5. **Versioning**: Per-key version numbers for change detection

Key implementation details:

- Use `@jsonpath/pointer` for all pointer parsing/compilation
- Maintain separate metadata map for arrays
- Version counter per key for efficient dirty checking
- Support for `undefined` vs missing key distinction

**Testing:**

- Unit tests for get/set/delete at various depths
- Unit tests for nested object ingestion
- Unit tests for object reconstruction (`toObject()`)
- Unit tests for array metadata tracking
- Benchmarks for 1M get/set operations (target: 10M ops/sec)

---

### Step 5: @data-map/subscriptions - Subscription Engine

**Files:**

- `packages/data-map/subscriptions/package.json`
- `packages/data-map/subscriptions/tsconfig.json`
- `packages/data-map/subscriptions/vite.config.ts`
- `packages/data-map/subscriptions/src/index.ts`
- `packages/data-map/subscriptions/src/subscription-engine.ts`
- `packages/data-map/subscriptions/src/exact-index.ts`
- `packages/data-map/subscriptions/src/pattern-index.ts`
- `packages/data-map/subscriptions/src/pattern-compiler.ts`
- `packages/data-map/subscriptions/src/notification-batcher.ts`
- `packages/data-map/subscriptions/src/types.ts`
- `packages/data-map/subscriptions/src/__tests__/*.spec.ts`

**What:** Implement the subscription system with efficient pattern matching. Depends on `mnemonist` for TrieMap and `@jsonpath/jsonpath` for path parsing.

1. **SubscriptionEngine**: Central manager for all subscription types
2. **ExactIndex**: TrieMap-based index for exact pointer subscriptions
3. **PatternIndex**: Specialized index for wildcard patterns (`*`, `**`)
4. **PatternCompiler**: Compile JSON Path patterns to efficient matchers
5. **NotificationBatcher**: Debounce and batch notifications

Key implementation details:

- Three subscription types: exact, pattern, query
- TrieMap for O(m) exact matching (m = pointer length)
- Compiled regex + segment matchers for patterns
- Microtask-based notification batching
- Subscription cleanup on unsubscribe

**Testing:**

- Unit tests for exact pointer subscriptions
- Unit tests for wildcard pattern matching (`$.users[*].name`)
- Unit tests for recursive descent (`$..name`)
- Unit tests for notification batching
- Performance benchmarks (target: 1M subscriptions, 100k notifications/sec)

---

### Step 6: @data-map/arrays - Optimized Array Operations

**Files:**

- `packages/data-map/arrays/package.json`
- `packages/data-map/arrays/tsconfig.json`
- `packages/data-map/arrays/vite.config.ts`
- `packages/data-map/arrays/src/index.ts`
- `packages/data-map/arrays/src/smart-array.ts`
- `packages/data-map/arrays/src/indirection-layer.ts`
- `packages/data-map/arrays/src/gap-buffer.ts`
- `packages/data-map/arrays/src/persistent-vector.ts`
- `packages/data-map/arrays/src/array-operations.ts`
- `packages/data-map/arrays/src/types.ts`
- `packages/data-map/arrays/src/__tests__/*.spec.ts`

**What:** Implement optimized array data structures for O(1) mutations. Depends on `@data-map/storage`.

1. **SmartArray**: Adaptive array that selects optimal strategy
2. **IndirectionLayer**: Logical→physical index mapping for O(1) splice
3. **GapBuffer**: Optimized for sequential push/pop workloads
4. **PersistentVector**: Copy-on-write with structural sharing
5. **ArrayOperations**: push, pop, splice, sort, filter implementations

Key implementation details:

- Indirection layer is the default strategy
- Physical slots reused via free list
- Automatic strategy switching based on operation patterns
- Maintain compatibility with FlatStore pointers

**Testing:**

- Unit tests for push/pop/unshift/shift
- Unit tests for splice at various positions
- Unit tests for sort with indirection
- Benchmarks comparing strategies (target: 10x faster than naive splice)

---

### Step 7: @data-map/path - JSON Path Wrapper

**Files:**

- `packages/data-map/path/package.json`
- `packages/data-map/path/tsconfig.json`
- `packages/data-map/path/vite.config.ts`
- `packages/data-map/path/src/index.ts`
- `packages/data-map/path/src/query.ts`
- `packages/data-map/path/src/compiler.ts`
- `packages/data-map/path/src/cache.ts`
- `packages/data-map/path/src/pointer-bridge.ts`
- `packages/data-map/path/src/types.ts`
- `packages/data-map/path/src/__tests__/*.spec.ts`

**What:** Thin wrapper around `@jsonpath/*` packages optimized for DataMap's flat storage model. Provides query compilation, caching, and pointer interop.

1. **Query**: Execute JSON Path queries against flat storage
2. **Compiler**: Pre-compile queries for repeated execution
3. **Cache**: LRU cache for compiled queries
4. **PointerBridge**: Convert between JSON Path results and pointers

Key implementation details:

- Re-export essential `@jsonpath/jsonpath` APIs
- Add flat-storage-aware query execution
- Cache compiled ASTs for performance
- Bridge JSON Path matches to pointer format

**Testing:**

- Unit tests for basic queries
- Unit tests for filter expressions
- Unit tests for cache hit/miss behavior
- Benchmarks for query compilation and execution

---

### Step 8: @data-map/computed - Pointer-Based Computed Values

**Files:**

- `packages/data-map/computed/package.json`
- `packages/data-map/computed/tsconfig.json`
- `packages/data-map/computed/vite.config.ts`
- `packages/data-map/computed/src/index.ts`
- `packages/data-map/computed/src/pointer-computed.ts`
- `packages/data-map/computed/src/query-computed.ts`
- `packages/data-map/computed/src/dependency-tracker.ts`
- `packages/data-map/computed/src/types.ts`
- `packages/data-map/computed/src/__tests__/*.spec.ts`

**What:** Extend signals with pointer-aware computed values. Depends on `@data-map/signals`, `@data-map/storage`, `@data-map/path`.

1. **PointerComputed**: Computed values derived from specific pointers
2. **QueryComputed**: Computed values derived from JSON Path queries
3. **DependencyTracker**: Track pointer dependencies automatically

Key implementation details:

- Integrate with signal system for reactivity
- Support dynamic dependencies (query results can change)
- Lazy evaluation with memoization
- Invalidation on pointer changes

**Testing:**

- Unit tests for single-pointer computed
- Unit tests for multi-pointer computed
- Unit tests for query-based computed with changing results
- Unit tests for dependency invalidation

---

### Step 9: @data-map/core - Integration Facade

**Files:**

- `packages/data-map/core/package.json`
- `packages/data-map/core/tsconfig.json`
- `packages/data-map/core/vite.config.ts`
- `packages/data-map/core/src/index.ts`
- `packages/data-map/core/src/data-map.ts`
- `packages/data-map/core/src/create.ts`
- `packages/data-map/core/src/types.ts`
- `packages/data-map/core/src/__tests__/*.spec.ts`

**What:** The main integration package that combines all sub-packages into a unified API. This is what most users will import.

1. **DataMap class**: Full-featured store with all capabilities
2. **createDataMap()**: Factory function with type inference
3. **Re-exports**: All public APIs from sub-packages

Key implementation details:

- Compose FlatStore, SubscriptionEngine, SmartArray
- Unified API surface matching spec section 7.1
- Type-safe generics for state shape
- Batch transaction support

**Testing:**

- Integration tests matching all spec examples
- End-to-end workflow tests
- Type inference tests
- Full API coverage

---

### Step 10: @data-map/benchmarks - Performance Suite

**Files:**

- `packages/data-map/benchmarks/package.json`
- `packages/data-map/benchmarks/tsconfig.json`
- `packages/data-map/benchmarks/vite.config.ts`
- `packages/data-map/benchmarks/src/index.ts`
- `packages/data-map/benchmarks/src/get-set.bench.ts`
- `packages/data-map/benchmarks/src/subscriptions.bench.ts`
- `packages/data-map/benchmarks/src/arrays.bench.ts`
- `packages/data-map/benchmarks/src/computed.bench.ts`
- `packages/data-map/benchmarks/src/comparisons/*.ts`

**What:** Comprehensive benchmark suite to validate performance targets from spec section 8.3.

1. **Get/Set Benchmarks**: Validate O(1) access claims
2. **Subscription Benchmarks**: Pattern matching performance
3. **Array Benchmarks**: Compare strategies
4. **Computed Benchmarks**: Signal propagation overhead
5. **Comparisons**: Compare against Redux, Zustand, MobX, Valtio

Key implementation details:

- Use tinybench for consistent measurements
- CI integration for regression detection
- Generate markdown reports
- Compare against baseline and competitors

**Testing:** N/A (this is the test suite)

---

### Step 11: Documentation & Examples

**Files:**

- `packages/data-map/README.md`
- `docs/api/data-map.md`
- `docs/api/data-map-core.md`
- `packages/data-map/examples/basic-usage.ts`
- `packages/data-map/examples/computed-values.ts`
- `packages/data-map/examples/array-operations.ts`
- `packages/data-map/examples/subscriptions.ts`

**What:** Comprehensive documentation and runnable examples.

1. **Package READMEs**: Quick start for each package
2. **API Documentation**: Full API reference with types
3. **Examples**: Copy-paste ready code samples
4. **Migration Guide**: From Redux/Zustand/MobX (basic concepts only)

**Testing:** Run examples to verify they work.

---

### Step 12: CI/CD & Publishing Setup

**Files:**

- `.github/workflows/data-map-ci.yml`
- `packages/data-map/*/package.json` (version field)
- `packages/data-map/CHANGELOG.md`
- `turbo.json` (update)

**What:** Set up continuous integration and prepare for npm publishing.

1. **CI Workflow**: Build, test, lint, type-check all packages
2. **Benchmark CI**: Run benchmarks and comment on PRs
3. **Changesets**: Configure for version management
4. **Turbo Tasks**: Add data-map specific tasks

**Testing:** Open a test PR to verify CI runs correctly.

---

## Summary

| Package                   | Dependencies                      | Priority | Estimated Effort |
| ------------------------- | --------------------------------- | -------- | ---------------- |
| `@data-map/signals`       | None                              | P0       | 2-3 days         |
| `@data-map/storage`       | `@jsonpath/pointer`               | P0       | 2-3 days         |
| `@data-map/subscriptions` | `mnemonist`, `@jsonpath/jsonpath` | P1       | 3-4 days         |
| `@data-map/arrays`        | `@data-map/storage`               | P1       | 2-3 days         |
| `@data-map/path`          | `@jsonpath/*`                     | P1       | 1-2 days         |
| `@data-map/computed`      | `signals`, `storage`, `path`      | P2       | 2-3 days         |
| `@data-map/core`          | All above                         | P2       | 2-3 days         |
| `@data-map/benchmarks`    | `core`                            | P3       | 1-2 days         |
| Documentation             | -                                 | P4       | 2-3 days         |
| CI/CD                     | -                                 | P4       | 1 day            |

**Total Estimated Effort:** 18-26 days

---

## Design Decisions

The following decisions were made during planning:

1. **Framework Adapters Deferred**: React, Vue, and Solid bindings will be implemented in a follow-up PR after core functionality is complete.

2. **No Pointer Wrapper**: Use `@jsonpath/pointer` directly instead of creating a `@data-map/pointer` wrapper package. Reduces maintenance overhead and bundle size.

3. **DevTools Deferred**: Development tools (inspector, time-travel, visualizer) will be implemented in a follow-up PR.

4. **Bundle Size Priority**: Packages should be as small as reasonable. Use tree-shaking, avoid unnecessary abstractions, inline small utilities.

5. **Modern Target Only**: Target modern browsers and Node.js. Enables use of:
   - `WeakRef` and `FinalizationRegistry` for memory-efficient subscriptions
   - Native `Map`/`Set` without polyfills
   - ES2022+ features

6. **SSR Not Priority**: Server-side rendering support is not a priority for initial release. Can be added later without breaking changes.
