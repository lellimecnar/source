# JSONPath Benchmark Expansion - Exhaustive Multi-Library Comparison

**Branch:** `feat/jsonpath-benchmark-expansion`
**Description:** Exhaustively benchmark every shared functionality between `@jsonpath/*`, `json-p3`, `jsonpath-plus`, `jsonpath`, `fast-json-patch`, and other relevant libraries.

## Goal

Establish comprehensive, reproducible benchmarks that compare the performance of the `@jsonpath/*` package suite against all major JSONPath and JSON manipulation libraries in the ecosystem. This will provide data-driven insights for optimization opportunities and demonstrate competitive positioning.

---

## Current State Analysis

### Existing Benchmarks

| File                   | Coverage                       | External Libraries          |
| ---------------------- | ------------------------------ | --------------------------- |
| `basic.bench.ts`       | Basic & filter queries         | `jsonpath`, `jsonpath-plus` |
| `compiler.bench.ts`    | Compilation/caching            | None                        |
| `expressions.bench.ts` | Arithmetic, logical, functions | None                        |
| `patch.bench.ts`       | RFC 6902 patch ops             | None                        |
| `pointer.bench.ts`     | RFC 6901 pointer               | None                        |
| `query.bench.ts`       | queryValues                    | None                        |

### Identified Gaps

1. **Missing Libraries:** `json-p3`, `fast-json-patch`, `json-pointer`
2. **Missing Query Types:** Slices, unions, recursive descent, nested filters
3. **Missing Scale Tests:** Large arrays (10K+), deep nesting, wide objects
4. **Missing Comparisons:** Pointer ops, patch ops, merge patch, streaming
5. **Missing Metrics:** Memory usage, compilation cache effectiveness

---

## Implementation Steps

### Step 1: Add External Library Dependencies

**Files:**

- `packages/jsonpath/benchmarks/package.json`

**What:**
Install all external libraries required for exhaustive comparison benchmarking:

- `json-p3` - JSONPath implementation (argument order differs: path first)
- `fast-json-patch` - RFC 6902 JSON Patch
- `json-pointer` - RFC 6901 JSON Pointer
- `rfc6902` - Alternative RFC 6902 implementation
- `json-merge-patch` - RFC 7386 Merge Patch

**Testing:**

- Run `pnpm install` in the benchmarks package
- Verify imports work: create a smoke test that imports each library

---

### Step 2: Create Benchmark Fixtures & Data Generators

**Files:**

- `packages/jsonpath/benchmarks/src/fixtures/index.ts` (new)
- `packages/jsonpath/benchmarks/src/fixtures/data-generators.ts` (new)
- `packages/jsonpath/benchmarks/src/fixtures/datasets.ts` (new)
- `packages/jsonpath/benchmarks/src/fixtures/queries.ts` (new)

**What:**
Create a comprehensive fixtures system:

1. **Data Generators:**
   - `generateLargeArray(size: number)` - Arrays of 100 to 100K elements
   - `generateDeepObject(depth: number)` - Objects nested 5-50 levels
   - `generateWideObject(width: number)` - Objects with 10-1000 properties
   - `generateMixedData()` - Realistic store/book/product data

2. **Datasets:**
   - `STORE_DATA` - Classic JSONPath store/book example
   - `LARGE_ARRAY_100`, `LARGE_ARRAY_1K`, `LARGE_ARRAY_10K`, `LARGE_ARRAY_100K`
   - `DEEP_OBJECT_5`, `DEEP_OBJECT_10`, `DEEP_OBJECT_20`
   - `WIDE_OBJECT_10`, `WIDE_OBJECT_100`, `WIDE_OBJECT_1000`

3. **Queries by Category:**
   - Basic path queries
   - Filter expression queries
   - Slice/union queries
   - Recursive descent queries
   - Complex nested queries

**Testing:**

- Unit test that generators produce expected shapes
- Verify all datasets are JSON-serializable

---

### Step 3: Create Library Wrapper Abstractions

**Files:**

- `packages/jsonpath/benchmarks/src/adapters/index.ts` (new)
- `packages/jsonpath/benchmarks/src/adapters/jsonpath-adapter.ts` (new)
- `packages/jsonpath/benchmarks/src/adapters/jsonpath-plus-adapter.ts` (new)
- `packages/jsonpath/benchmarks/src/adapters/json-p3-adapter.ts` (new)
- `packages/jsonpath/benchmarks/src/adapters/lellimecnar-adapter.ts` (new)
- `packages/jsonpath/benchmarks/src/adapters/pointer-adapters.ts` (new)
- `packages/jsonpath/benchmarks/src/adapters/patch-adapters.ts` (new)

**What:**
Create normalized adapter interfaces for fair comparison:

```typescript
interface QueryAdapter {
	name: string;
	query(path: string, data: unknown): unknown[];
	paths?(path: string, data: unknown): string[];
	supportsFeature(feature: string): boolean;
}

interface PointerAdapter {
	name: string;
	resolve(pointer: string, data: unknown): unknown;
	set(pointer: string, data: unknown, value: unknown): unknown;
}

interface PatchAdapter {
	name: string;
	apply(patch: Operation[], data: unknown): unknown;
	diff?(source: unknown, target: unknown): Operation[];
}
```

Each adapter normalizes the API differences between libraries (e.g., json-p3's `query(path, data)` vs jsonpath's `query(data, path)`).

**Testing:**

- Each adapter should pass a basic smoke test with the store data
- Verify feature detection works correctly

---

### Step 4: Implement JSONPath Query Benchmarks (Fundamentals)

**Files:**

- `packages/jsonpath/benchmarks/src/query-fundamentals.bench.ts` (new)

**What:**
Comprehensive query benchmarks covering all fundamental operations:

```typescript
// Category 1.1: Basic Path Access
describe('Basic Path Access', () => {
  bench('@jsonpath/jsonpath - single value', () => { ... });
  bench('jsonpath - single value', () => { ... });
  bench('jsonpath-plus - single value', () => { ... });
  bench('json-p3 - single value', () => { ... });

  // Tests: $.store.book[0].title, $.store.book[*].title, $..author
});

// Category 1.2: Index Operations
describe('Index Operations', () => {
  // Tests: $[0], $[-1], $[0,2,4] (union), $[0:5] (slice), $[::2] (step)
});

// Category 1.3: Complex Paths
describe('Complex Paths', () => {
  // Tests: $.store..price, $..book[*].author, 10+ level deep access
});
```

**Testing:**

- Run `pnpm --filter @jsonpath/benchmarks bench` and verify all tests execute
- Results should be consistent across multiple runs (±10% variance acceptable)

---

### Step 5: Implement Filter Expression Benchmarks

**Files:**

- `packages/jsonpath/benchmarks/src/filter-expressions.bench.ts` (new)

**What:**
Extensive filter expression benchmarks:

```typescript
// Category 2.1: Simple Comparisons
describe('Simple Filter Comparisons', () => {
	// $.items[?(@.price < 10)]
	// $.items[?(@.name == "test")]
	// $.items[?(@.active == true)]
});

// Category 2.2: Logical Operators
describe('Logical Operators', () => {
	// $.items[?(@.a > 5 && @.b < 10)]
	// $.items[?(@.x || @.y)]
	// $.items[?(!@.disabled)]
});

// Category 2.3: Functions in Filters
describe('Filter Functions', () => {
	// $.items[?length(@.tags) > 0]
	// $.items[?match(@.name, "^test.*")]
	// $.items[?search(@.desc, "keyword")]
});

// Category 2.4: Arithmetic in Filters
describe('Arithmetic in Filters', () => {
	// $.items[?(@.a + @.b > 100)]
	// $.items[?(@.price * @.quantity > 500)]
});

// Category 2.5: Nested Filters
describe('Nested Filters', () => {
	// $.items[?(@.tags[?(@.priority > 5)])]
});
```

**Testing:**

- Verify libraries that don't support specific features are skipped gracefully
- Document which features each library supports/fails on

---

### Step 6: Implement Scale Testing Benchmarks

**Files:**

- `packages/jsonpath/benchmarks/src/scale-testing.bench.ts` (new)

**What:**
Performance benchmarks at various data scales:

```typescript
// Category 3.1: Large Arrays
describe('Large Array Performance', () => {
	describe.each([100, 1_000, 10_000, 100_000])('Array size: %d', (size) => {
		// Query: $[*].value
		// Query: $[?(@.active)]
		// Query: $[-1]
	});
});

// Category 3.2: Deep Nesting
describe('Deep Nesting Performance', () => {
	describe.each([5, 10, 20])('Depth: %d', (depth) => {
		// Query: $.a.b.c... (full path)
		// Query: $..value (recursive)
	});
});

// Category 3.3: Wide Objects
describe('Wide Object Performance', () => {
	describe.each([10, 100, 1000])('Width: %d', (width) => {
		// Query: $.* (all properties)
		// Query: $.propN (specific property)
	});
});
```

**Testing:**

- Monitor for timeouts on very large datasets (100K elements may take time)
- Consider adding a `--scale` flag to optionally skip largest tests

---

### Step 7: Implement Compilation & Caching Benchmarks

**Files:**

- `packages/jsonpath/benchmarks/src/compilation-caching.bench.ts` (new)

**What:**
Measure compilation overhead and cache effectiveness:

```typescript
// Category 4.1: Cold Start (No Cache)
describe('Cold Start Performance', () => {
	// Compile + execute on first run
	// Compare interpreted vs compiled modes
});

// Category 4.2: Warm Cache
describe('Warm Cache Performance', () => {
	// Pre-compile query, then benchmark execution only
	// Measure cache hit performance
});

// Category 4.3: Compiled Query Reuse
describe('Compiled Query Reuse', () => {
	// compileQuery() once, execute 1000x
	// Compare against fresh parse each time
});

// Category 4.4: Cache Contention
describe('Cache Contention', () => {
	// 100 unique queries (cache miss rate)
	// LRU eviction impact
});
```

**Testing:**

- Verify cache is actually being used (should see significant speedup on warm runs)
- Test with cache disabled to measure baseline

---

### Step 8: Implement Output Format Benchmarks

**Files:**

- `packages/jsonpath/benchmarks/src/output-formats.bench.ts` (new)

**What:**
Benchmark different output format options:

```typescript
// Category 5.1: Values Only
describe('Values Output', () => {
	// query().values() vs queryValues()
	// Compare all libraries
});

// Category 5.2: Paths
describe('Paths Output', () => {
	// query().paths() / normalizedPaths()
	// jsonpath.paths() / jsonpath-plus resultType:"path"
});

// Category 5.3: Pointers
describe('Pointer Output', () => {
	// query().pointers()
	// jsonpath-plus toPointer()
});

// Category 5.4: Full Nodes
describe('Full Node Output', () => {
	// query().nodes() - includes parent, path, pointer
	// jsonpath.nodes() - includes path, value
});
```

**Testing:**

- Verify output formats are equivalent across libraries (normalize for comparison)

---

### Step 9: Implement JSON Pointer Benchmarks (RFC 6901)

**Files:**

- `packages/jsonpath/benchmarks/src/pointer-rfc6901.bench.ts` (new)

**What:**
Comprehensive JSON Pointer benchmarks:

```typescript
// Category 6.1: Resolution
describe('Pointer Resolution', () => {
  bench('@jsonpath/pointer - shallow', () => { ... });
  bench('fast-json-patch - shallow', () => { ... });
  bench('json-pointer - shallow', () => { ... });
  // Tests: /name, /store/book/0/title, /a/b/c/d/e/f/g/h
});

// Category 6.2: Mutation Operations
describe('Pointer Mutations', () => {
  // set(), remove(), exists()
});

// Category 6.3: Special Cases
describe('Pointer Edge Cases', () => {
  // Root pointer ""
  // Escaped characters ~/~0/~1
  // URI fragment encoding
});
```

**Testing:**

- Verify all libraries produce identical results for resolution
- Test edge cases with escaped characters

---

### Step 10: Implement JSON Patch Benchmarks (RFC 6902)

**Files:**

- `packages/jsonpath/benchmarks/src/patch-rfc6902.bench.ts` (new)

**What:**
Comprehensive JSON Patch benchmarks:

```typescript
// Category 7.1: Single Operations
describe('Single Patch Operations', () => {
  describe.each(['add', 'remove', 'replace', 'move', 'copy', 'test'])('%s', (op) => {
    bench('@jsonpath/patch', () => { ... });
    bench('fast-json-patch', () => { ... });
    bench('rfc6902', () => { ... });
  });
});

// Category 7.2: Batch Operations
describe('Batch Operations', () => {
  describe.each([10, 100, 1000])('%d operations', (count) => {
    // Apply batch of operations
  });
});

// Category 7.3: Diff Generation
describe('Diff Generation', () => {
  // Small, medium, large object diffs
  // Array diff with additions/removals
});

// Category 7.4: Validation
describe('Patch Validation', () => {
  // validate() performance
  // Invalid patch detection
});
```

**Testing:**

- Verify patch application produces identical results across libraries
- Test immutable vs mutable modes

---

### Step 11: Implement JSON Merge Patch Benchmarks (RFC 7386)

**Files:**

- `packages/jsonpath/benchmarks/src/merge-patch-rfc7386.bench.ts` (new)

**What:**
JSON Merge Patch benchmarks:

```typescript
// Category 8.1: Apply Merge Patch
describe('Apply Merge Patch', () => {
	// Simple merge
	// Nested merge
	// Array replacement
	// Property deletion (null values)
});

// Category 8.2: Create Merge Patch
describe('Create Merge Patch', () => {
	// Small diff
	// Large diff
});
```

**Testing:**

- Verify RFC 7386 compliance (null removes properties)
- Compare against json-merge-patch npm package

---

### Step 12: Implement Streaming & Memory Benchmarks

**Files:**

- `packages/jsonpath/benchmarks/src/streaming-memory.bench.ts` (new)

**What:**
Streaming performance and memory efficiency:

```typescript
// Category 9.1: Streaming vs Eager
describe('Streaming vs Eager Evaluation', () => {
	// stream() generator performance
	// query().values() eager performance
	// Early termination benefit (first N results)
});

// Category 9.2: Large Dataset Processing
describe('Large Dataset Memory', () => {
	// 1MB JSON processing
	// 10MB JSON processing
	// Measure memory pressure (if possible via Node.js metrics)
});
```

**Testing:**

- Use Node.js `process.memoryUsage()` to track heap usage
- Verify streaming doesn't materialize entire result set

---

### Step 13: Implement Advanced Features Benchmarks

**Files:**

- `packages/jsonpath/benchmarks/src/advanced-features.bench.ts` (new)

**What:**
Benchmarks for advanced @jsonpath/\* features:

```typescript
// Category 10.1: Transform
describe('Transform Operations', () => {
	// transform() with simple mapping
	// transformAll() with multiple transforms
});

// Category 10.2: QuerySet
describe('QuerySet Performance', () => {
	// 5 queries in single pass
	// 20 queries in single pass
	// Compare against 20 individual queries
});

// Category 10.3: Plugin Performance
describe('Plugin Overhead', () => {
	// Query without plugins
	// Query with arithmetic plugin
	// Query with extras plugin
	// Query with all plugins enabled
});

// Category 10.4: Security Features
describe('Security Features', () => {
	// secureQuery() overhead vs standard query
	// Sandbox performance impact
});
```

**Testing:**

- Compare plugin-enabled vs plugin-disabled performance
- Document overhead of security features

---

### Step 14: Implement Browser Environment Benchmarks

**Files:**

- `packages/jsonpath/benchmarks/src/browser/index.bench.ts` (new)
- `packages/jsonpath/benchmarks/src/browser/setup.ts` (new)
- `packages/jsonpath/benchmarks/vitest.config.browser.ts` (new)
- `packages/jsonpath/benchmarks/playwright.config.ts` (new)

**What:**
Create browser-based benchmarks to compare Node.js vs browser performance:

1. **Browser Test Setup:**
   - Configure Vitest with `@vitest/browser` provider
   - Use Playwright for browser automation
   - Support Chrome, Firefox, and Safari (WebKit)

2. **Core Benchmarks in Browser:**

   ```typescript
   // Run subset of critical benchmarks in browser
   describe('Browser: Query Performance', () => {
   	// Basic queries
   	// Filter expressions
   	// Scale tests (up to 10K elements - browser memory limits)
   });

   describe('Browser: Pointer/Patch Performance', () => {
   	// JSON Pointer resolution
   	// JSON Patch application
   });
   ```

3. **Environment Comparison Report:**
   - Side-by-side Node.js vs Chromium vs Firefox vs WebKit
   - Identify platform-specific performance characteristics
   - Document any feature differences (e.g., regex performance)

**Testing:**

- Run `pnpm bench:browser` and verify tests execute in browser
- Compare results against Node.js benchmarks

---

### Step 16: Create Benchmark Reporting Infrastructure

**Files:**

- `packages/jsonpath/benchmarks/src/utils/reporter.ts` (new)
- `packages/jsonpath/benchmarks/src/utils/comparisons.ts` (new)
- `packages/jsonpath/benchmarks/vitest.config.ts` (update)

**What:**
Create comprehensive reporting utilities:

1. **Custom Reporter:**
   - Generate Markdown comparison tables
   - Output JSON results for CI tracking
   - Create historical comparison charts (if previous results exist)

2. **Comparison Utilities:**
   - `compareLibraries(results)` - Rank libraries by performance
   - `generateFeatureMatrix()` - Which library supports what
   - `highlightRegressions(current, baseline)` - Track performance changes

3. **Configuration Updates:**
   - Add reporter plugins to vitest config
   - Configure output directories
   - Add npm scripts for different benchmark modes

**Testing:**

- Run benchmarks and verify reports are generated correctly
- Validate JSON output schema

---

### Step 17: Update Package Scripts & Documentation

**Files:**

- `packages/jsonpath/benchmarks/package.json` (update scripts)
- `packages/jsonpath/benchmarks/README.md` (new)
- `packages/jsonpath/benchmarks/RESULTS.md` (new - generated)

**What:**

1. **Package Scripts:**

   ```json
   {
   	"scripts": {
   		"bench": "vitest bench",
   		"bench:query": "vitest bench --testNamePattern='Query|Filter'",
   		"bench:scale": "vitest bench --testNamePattern='Scale'",
   		"bench:pointer": "vitest bench --testNamePattern='Pointer'",
   		"bench:patch": "vitest bench --testNamePattern='Patch'",
   		"bench:browser": "vitest bench --config vitest.config.browser.ts",
   		"bench:browser:chromium": "vitest bench --config vitest.config.browser.ts --browser.name=chromium",
   		"bench:browser:firefox": "vitest bench --config vitest.config.browser.ts --browser.name=firefox",
   		"bench:browser:webkit": "vitest bench --config vitest.config.browser.ts --browser.name=webkit",
   		"bench:full": "vitest bench --reporter=json --outputFile=results.json",
   		"bench:compare": "node scripts/compare-results.js"
   	}
   }
   ```

2. **README.md:**
   - Overview of benchmark categories
   - How to run benchmarks
   - How to interpret results
   - How to add new benchmarks

3. **RESULTS.md:**
   - Auto-generated comparison tables
   - Feature support matrix
   - Performance rankings

**Testing:**

- Run each npm script to verify it works
- Generate and review RESULTS.md output

---

## Summary Table

| Step  | Commits | Description                              |
| ----- | ------- | ---------------------------------------- |
| 1     | 1       | Add external library dependencies        |
| 2     | 1       | Create fixtures & data generators        |
| 3     | 1       | Create library wrapper abstractions      |
| 4-5   | 1       | Query & filter expression benchmarks     |
| 6-7   | 1       | Scale testing & compilation benchmarks   |
| 8-9   | 1       | Output format & pointer benchmarks       |
| 10-11 | 1       | Patch & merge patch benchmarks           |
| 12-13 | 1       | Streaming & advanced feature benchmarks  |
| 14    | 1       | Browser environment benchmarks           |
| 15-17 | 1       | Reporting infrastructure & documentation |

**Total: 10 commits** in the PR

---

## Libraries Being Compared

| Library            | npm Package          | RFC Coverage               | Primary Use Case      |
| ------------------ | -------------------- | -------------------------- | --------------------- |
| `@jsonpath/*`      | `@jsonpath/jsonpath` | RFC 9535, 6901, 6902, 7386 | Full JSONPath suite   |
| `jsonpath`         | `jsonpath`           | None                       | Legacy JSONPath       |
| `jsonpath-plus`    | `jsonpath-plus`      | Partial 6901               | Extended JSONPath     |
| `json-p3`          | `json-p3`            | RFC 9535                   | Python-style JSONPath |
| `fast-json-patch`  | `fast-json-patch`    | RFC 6902, 6901             | JSON Patch operations |
| `json-pointer`     | `json-pointer`       | RFC 6901                   | JSON Pointer only     |
| `rfc6902`          | `rfc6902`            | RFC 6902                   | JSON Patch only       |
| `json-merge-patch` | `json-merge-patch`   | RFC 7386                   | Merge Patch only      |

---

## Success Criteria

1. **Coverage:** Every category in the research findings is benchmarked
2. **Fairness:** All libraries use equivalent operations (normalized via adapters)
3. **Reproducibility:** Results are consistent across multiple runs (±10%)
4. **Documentation:** Clear README explaining how to run and interpret results
5. **CI-Ready:** JSON output format for tracking performance over time
6. **Feature Matrix:** Clear documentation of which library supports what features

---

## Design Decisions (Resolved)

| Decision                 | Resolution                         | Rationale                                                                                                |
| ------------------------ | ---------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Memory Benchmarking**  | Use Vitest benchmark functionality | Built-in vitest bench metrics are sufficient; avoid deep profiling complexity                            |
| **Historical Tracking**  | No                                 | Not required for this iteration; can be added later if needed                                            |
| **Additional Libraries** | Use identified list                | `jsonpath`, `jsonpath-plus`, `json-p3`, `fast-json-patch`, `json-pointer`, `rfc6902`, `json-merge-patch` |
| **Timeout Limits**       | Run all regardless of duration     | Capture complete performance data even for slow operations                                               |
| **Browser Testing**      | Both Node.js and browser           | Compare runtime environments to identify platform-specific performance characteristics                   |
