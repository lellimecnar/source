# JSONPath Benchmarks Comprehensive Audit Report

**Date:** January 2026 (v4.0)
**Auditor:** AI Engineering Agent
**Scope:** `@jsonpath/benchmarks` package
**Status:** ✅ Complete

---

## Executive Summary

This comprehensive audit covers the entire `@jsonpath/benchmarks` package, identifying issues, fixing problems, analyzing performance gaps, researching competitor implementations, and proposing concrete optimization solutions with the goal of outperforming all existing JSONPath packages.

### Key Findings

| Category             | Finding                                                                                |
| -------------------- | -------------------------------------------------------------------------------------- |
| **Test Status**      | ✅ All 21 tests pass                                                                   |
| **Adapter Coverage** | ✅ 17 adapters covering 4 library types                                                |
| **Benchmark Files**  | 17 benchmark files analyzed                                                            |
| **Issues Fixed**     | 2 type safety issues resolved                                                          |
| **Performance Wins** | Simple paths (1.14x), deep nesting (1.14x), wide objects (1.35x), pointer (1.32-1.47x) |
| **Performance Gaps** | Wildcards (7.78x slower), recursion (4.72x slower), large arrays (7.09-7.90x slower)   |

### Current Performance Scorecard

| Package                            | Status        | Performance vs Best Competitor       |
| ---------------------------------- | ------------- | ------------------------------------ |
| `@jsonpath/jsonpath` (simple)      | ✅ **Winner** | 1.14x faster than jsonpath-plus      |
| `@jsonpath/jsonpath` (deep nest)   | ✅ **Winner** | 1.14x faster than jsonpath-plus      |
| `@jsonpath/jsonpath` (wide obj)    | ✅ **Winner** | 1.35x faster than jsonpath-plus      |
| `@jsonpath/jsonpath` (wildcards)   | ⚠️ **Slower** | 7.78x slower than jsonpath-plus      |
| `@jsonpath/jsonpath` (recursive)   | ⚠️ **Slower** | 4.72x slower than jsonpath-plus      |
| `@jsonpath/jsonpath` (large array) | ⚠️ **Slower** | 7.09-7.90x slower than jsonpath-plus |
| `@jsonpath/pointer`                | ✅ **Winner** | 1.32-1.47x faster than json-pointer  |
| `@jsonpath/patch`                  | ⚠️ **Slower** | ~2x slower than fast-json-patch      |
| `@jsonpath/merge-patch`            | ≈ **Parity**  | Near-equivalent to json-merge-patch  |

---

## Part 1: Benchmark Quality Audit

### 1.1 Files Reviewed

| File                           | Purpose                  | Quality Rating | Issues                     |
| ------------------------------ | ------------------------ | -------------- | -------------------------- |
| `query-fundamentals.bench.ts`  | Core JSONPath operations | A              | None                       |
| `filter-expressions.bench.ts`  | Filter/comparison ops    | A              | None (fixed in v3)         |
| `scale-testing.bench.ts`       | Large data scaling       | A              | None                       |
| `pointer-rfc6901.bench.ts`     | Pointer resolution       | A              | None                       |
| `patch-rfc6902.bench.ts`       | Patch operations         | A              | None (fixed in v3)         |
| `merge-patch-rfc7386.bench.ts` | Merge-patch ops          | A              | None                       |
| `compilation-caching.bench.ts` | Query compilation        | A              | None (fixed in v3)         |
| `basic.bench.ts`               | Basic queries            | B+             | Overlaps with fundamentals |
| `advanced-features.bench.ts`   | Advanced ops             | A              | None                       |
| `expressions.bench.ts`         | Expression eval          | B+             | Limited coverage           |
| `streaming-memory.bench.ts`    | Streaming perf           | B              | Single library only        |
| `query.bench.ts`               | General queries          | B+             | Overlaps with fundamentals |
| `pointer.bench.ts`             | General pointer          | B+             | Overlaps with rfc6901      |
| `patch.bench.ts`               | General patch            | B+             | Overlaps with rfc6902      |
| `compiler.bench.ts`            | Compiler perf            | A              | None                       |
| `output-formats.bench.ts`      | Output modes             | A              | **Fixed: Type safety**     |
| `browser/index.bench.ts`       | Browser subset           | A              | **Fixed: Type safety**     |

### 1.2 Issues Fixed in This Audit

#### Issue 1: Type Safety in output-formats.bench.ts

**Problem:** File used `as any` casts with eslint-disable comments, masking potential type errors.

**Before:**

```typescript
for (const adapter of adapters) {
	bench(
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		(adapter as any).name,
		() => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			void (adapter as any).queryValues(STORE_DATA, q);
		},
	);
}
```

**After:**

```typescript
const adapters: JsonPathAdapter[] = [...];
for (const adapter of adapters) {
  bench(adapter.name, () => {
    void adapter.queryValues(STORE_DATA, q);
  });
}
```

#### Issue 2: Type Safety in browser/index.bench.ts

**Problem:** Same pattern of `as any` casts in browser benchmark.

**Fix:** Applied identical type annotation pattern.

### 1.3 Test Verification Results

```
Test Files  16 passed (16)
     Tests  21 passed (21)
  Duration  760ms

Performance Regression Warnings (non-blocking):
⚠️ filter query: 65044 ops/s < 72000 ops/s baseline
⚠️ recursive query: 37563 ops/s < 45000 ops/s baseline
```

### 1.4 Benchmark Redundancy Analysis

The following benchmarks have significant overlap and could be consolidated:

| Redundant Set                                    | Recommendation                     |
| ------------------------------------------------ | ---------------------------------- |
| `basic.bench.ts` + `query-fundamentals.bench.ts` | Keep fundamentals, deprecate basic |
| `pointer.bench.ts` + `pointer-rfc6901.bench.ts`  | Keep rfc6901, deprecate pointer    |
| `patch.bench.ts` + `patch-rfc6902.bench.ts`      | Keep rfc6902, deprecate patch      |
| `query.bench.ts` + others                        | Keep for specific scenarios        |

---

## Part 2: Detailed Performance Analysis

### 2.1 JSONPath Query Performance (Latest Benchmark Data)

#### Simple Path Access ($.store.bicycle.color)

| Library                | ops/sec       | Relative           |
| ---------------------- | ------------- | ------------------ |
| **@jsonpath/jsonpath** | **2,240,055** | **1.00x (Winner)** |
| jsonpath-plus          | 1,970,932     | 1.14x slower       |
| json-p3                | 1,042,550     | 2.15x slower       |
| jsonpath               | 157,965       | 14.18x slower      |

✅ **@jsonpath WINS** - Fast path optimization is effective for simple property chains.

#### Array Index Access ($.store.book[0].title)

| Library                | ops/sec       | Relative           |
| ---------------------- | ------------- | ------------------ |
| **@jsonpath/jsonpath** | **1,844,998** | **1.00x (Winner)** |
| jsonpath-plus          | 1,660,368     | 1.11x slower       |
| json-p3                | 807,785       | 2.28x slower       |
| jsonpath               | 114,779       | 16.07x slower      |

✅ **@jsonpath WINS** - Fast path handles index access efficiently.

#### Wildcard Iteration ($.store.book[*].title)

| Library                | ops/sec     | Relative         |
| ---------------------- | ----------- | ---------------- |
| jsonpath-plus          | 1,130,429   | 1.00x (fastest)  |
| json-p3                | 502,320     | 2.25x slower     |
| **@jsonpath/jsonpath** | **145,279** | **7.78x slower** |
| jsonpath               | 111,446     | 10.14x slower    |

❌ **@jsonpath LOSES** - Major performance gap due to generator overhead.

#### Recursive Descent ($..author)

| Library                | ops/sec    | Relative         |
| ---------------------- | ---------- | ---------------- |
| jsonpath-plus          | 348,161    | 1.00x (fastest)  |
| jsonpath               | 96,859     | 3.59x slower     |
| **@jsonpath/jsonpath** | **73,835** | **4.72x slower** |
| json-p3                | 22,423     | 15.53x slower    |

❌ **@jsonpath LOSES** - Generator-based recursion creates significant overhead.

#### Deep Nesting ($.next.next.next.value)

| Library                | ops/sec       | Relative           |
| ---------------------- | ------------- | ------------------ |
| **@jsonpath/jsonpath** | **1,493,164** | **1.00x (Winner)** |
| jsonpath-plus          | 1,309,067     | 1.14x slower       |
| json-p3                | 573,619       | 2.60x slower       |
| jsonpath               | 93,879        | 15.91x slower      |

✅ **@jsonpath WINS** - Fast path optimization handles deep chains efficiently.

#### Wide Objects ($.prop999 from 1000-property object)

| Library                | ops/sec       | Relative           |
| ---------------------- | ------------- | ------------------ |
| **@jsonpath/jsonpath** | **3,760,620** | **1.00x (Winner)** |
| jsonpath-plus          | 2,788,267     | 1.35x slower       |
| json-p3                | 2,474,874     | 1.52x slower       |
| jsonpath               | 442,058       | 8.51x slower       |

✅ **@jsonpath WINS** - Direct property access without iteration.

### 2.2 Large Array Scaling

| Array Size | @jsonpath | jsonpath-plus | Gap          |
| ---------- | --------- | ------------- | ------------ |
| 100 items  | 13,220    | 103,308       | 7.81x slower |
| 1K items   | 1,329     | 10,497        | 7.90x slower |
| 10K items  | 138       | 977           | 7.09x slower |

**Observation:** The performance gap is consistent (~7-8x) across scales, confirming the overhead is per-element rather than per-query initialization.

### 2.3 JSON Pointer Performance

| Library               | ops/sec (path 1) | ops/sec (path 2) |
| --------------------- | ---------------- | ---------------- |
| **@jsonpath/pointer** | **2,657,053**    | **2,134,764**    |
| json-pointer          | 1,804,286        | 1,613,260        |

✅ **@jsonpath/pointer WINS** - 1.32-1.47x faster due to lean implementation.

---

## Part 3: Root Cause Analysis

### 3.1 Why @jsonpath Wins on Simple Paths

The evaluator implements a fast-path detection in `evaluateSimpleChain()`:

```typescript
// From evaluator.ts lines 73-138
private evaluateSimpleChain(ast: QueryNode): QueryResult | null {
  if (ast.type !== NodeType.Query) return null;
  if (ast.segments.length === 0) return null;

  // Only for pure name/index selectors
  if (!ast.segments.every(seg =>
    seg.type === NodeType.ChildSegment &&
    seg.selectors.length === 1 &&
    (seg.selectors[0]!.type === NodeType.NameSelector ||
     seg.selectors[0]!.type === NodeType.IndexSelector)
  )) {
    return null;
  }

  // Direct traversal without generator overhead
  let current = this.root;
  for (const seg of ast.segments) {
    const sel = seg.selectors[0]!;
    if (sel.type === NodeType.NameSelector) {
      current = current[sel.name];
    } else {
      current = current[sel.index];
    }
  }
  // ... return single result
}
```

This optimization:

- Skips generator allocation
- Skips path tracking
- Uses direct property access
- Creates minimal QueryResultNode objects

### 3.2 Why @jsonpath Loses on Wildcards

The wildcard implementation in `streamSelector()` (lines 415-450):

```typescript
case NodeType.WildcardSelector:
  if (Array.isArray(val)) {
    for (let i = 0; i < val.length; i++) {
      const result = this.pool.acquire({
        value: val[i],
        root: node.root,
        parent: val,
        parentKey: i,
        pathParent: node,
        pathSegment: i,
      });
      if (this.isNodeAllowed(result)) {
        this.checkLimits(result._depth ?? 0);
        yield result;
      }
    }
  }
```

**Performance Killers:**

1. **Generator suspension per element** - Each `yield` has overhead
2. **Object allocation per element** - `pool.acquire()` creates/reuses PooledNode
3. **Path tracking overhead** - `pathParent` and `pathSegment` stored for lazy path computation
4. **Limit checks per element** - `checkLimits()` called on every iteration
5. **Security checks per element** - `isNodeAllowed()` called on every iteration

### 3.3 Why @jsonpath Loses on Recursive Descent

The `streamDescendants()` method (lines 235-290) compounds the wildcard issues:

1. **Recursive generator calls** - Each level yields up to parent
2. **Circular reference tracking** - Set allocation and lookups
3. **Repeated iteration** - Visits all children at all levels
4. **No pruning** - Cannot skip branches that won't match selectors

### 3.4 How jsonpath-plus Achieves Better Performance

Based on GitHub source analysis:

#### Direct Loop Iteration

```javascript
// jsonpath-plus uses direct iteration in _walk method
JSONPath.prototype._walk = function (val, f) {
	if (Array.isArray(val)) {
		const n = val.length;
		for (let i = 0; i < n; i++) {
			f(i);
		}
	} else if (val && typeof val === 'object') {
		Object.keys(val).forEach((m) => {
			f(m);
		});
	}
};
```

#### Minimal Object Allocation

```javascript
// _trace method returns arrays, not wrapped objects
JSONPath.prototype._trace = function (expr, val, path, parent, parentPropName) {
	// Returns: { path, value, parent, parentProperty }
	// Only allocates when result is found
};
```

#### Deferred Path Construction

```javascript
// Paths built only when needed for final output
if (resultType === 'all') {
	ret = {
		path: toPathString(path), // Only computed here
		value: val,
		parent: parent,
		parentProperty: parentPropName,
	};
}
```

#### Expression Caching

```javascript
// toPathArray caches parsed expressions
JSONPath.toPathArray = function (expr) {
	if (cache[expr]) return cache[expr];
	// Parse and cache
	cache[expr] = result;
	return result;
};
```

---

## Part 4: Proposed Optimizations

### Priority 1: Critical (5-10x Impact Potential)

#### Optimization 1.1: Wildcard Fast Path

**Goal:** Eliminate generator overhead for simple wildcard queries.

**Implementation:**

```typescript
// Add to Evaluator class
private evaluateWildcardFastPath(
  ast: QueryNode
): QueryResult | null {
  // Detect pattern: $ followed by single-segment wildcard
  if (ast.segments.length !== 1) return null;
  const seg = ast.segments[0];
  if (seg.selectors.length !== 1) return null;
  const sel = seg.selectors[0];
  if (sel.type !== NodeType.WildcardSelector) return null;

  const val = this.root;
  if (!Array.isArray(val)) return null;

  // Direct iteration without generators
  const results: QueryResultNode[] = new Array(val.length);
  for (let i = 0; i < val.length; i++) {
    results[i] = {
      value: val[i],
      root: this.root,
      parent: val,
      parentKey: i,
      path: [i],  // Eager path for simple case
    };
  }
  return new QueryResult(results);
}
```

**Expected Impact:** 5-7x improvement on `$[*]` patterns.

#### Optimization 1.2: Batch Wildcard Collection

**Goal:** Avoid per-element generator suspension.

**Implementation:**

```typescript
private *streamWildcardBatched(
  node: QueryResultNode,
  batchSize = 100
): Generator<QueryResultNode[]> {
  const val = node.value;
  if (!Array.isArray(val)) return;

  const batch: QueryResultNode[] = [];
  for (let i = 0; i < val.length; i++) {
    batch.push(this.pool.acquire({
      value: val[i],
      root: node.root,
      parent: val,
      parentKey: i,
      pathParent: node,
      pathSegment: i,
    }));

    if (batch.length >= batchSize) {
      yield batch.splice(0, batch.length);
    }
  }

  if (batch.length > 0) {
    yield batch;
  }
}
```

**Expected Impact:** 2-3x improvement for large arrays.

### Priority 2: High (2-5x Impact Potential)

#### Optimization 2.1: Lazy Path Computation with Deferred Materialization

**Goal:** Only compute paths when explicitly requested.

**Current State:** QueryResultPool already implements lazy path computation, but still tracks `pathParent` and `pathSegment` for every node.

**Enhancement:**

```typescript
class UltraLazyNode implements QueryResultNode {
	value: any;
	root: any;
	parent?: any;
	parentKey?: PathSegment;

	// Only store direct parent reference, not full chain
	private _parentNode?: UltraLazyNode;
	private _mySegment?: PathSegment;
	private _cachedPath?: PathSegment[];

	get path(): readonly PathSegment[] {
		if (!this._cachedPath) {
			// Walk up chain only when needed
			const segments: PathSegment[] = [];
			let node: UltraLazyNode | undefined = this;
			while (node?._parentNode) {
				if (node._mySegment !== undefined) {
					segments.unshift(node._mySegment);
				}
				node = node._parentNode;
			}
			this._cachedPath = segments;
		}
		return this._cachedPath;
	}
}
```

**Expected Impact:** 2-3x improvement when paths aren't used.

#### Optimization 2.2: Skip Security Checks When Not Configured

**Goal:** Eliminate per-element security check overhead.

**Implementation:**

```typescript
// In constructor
if (!allowPaths?.length && !blockPaths?.length) {
  // Use optimized iteration without checks
  this.streamWildcard = this.streamWildcardUnchecked;
  this.streamDescendants = this.streamDescendantsUnchecked;
}

private *streamWildcardUnchecked(
  val: any[],
  node: QueryResultNode
): Generator<QueryResultNode> {
  // No isNodeAllowed checks
  for (let i = 0; i < val.length; i++) {
    yield this.pool.acquire({...});
  }
}
```

**Expected Impact:** 10-20% improvement when security features unused.

#### Optimization 2.3: Pre-allocated Result Arrays

**Goal:** Avoid dynamic array growth.

**Implementation:**

```typescript
evaluate(ast: QueryNode): QueryResult {
  // Estimate result size based on AST
  const estimatedSize = this.estimateResultSize(ast, this.root);

  // Pre-allocate with capacity hint
  const results = new Array(estimatedSize);
  let count = 0;

  for (const node of this.stream(ast)) {
    results[count++] = this.pool.ownFrom(node);
  }

  // Trim to actual size
  results.length = count;
  return new QueryResult(results);
}
```

**Expected Impact:** 10-30% improvement for predictable result sizes.

### Priority 3: Medium (20-50% Impact)

#### Optimization 3.1: Recursive Descent with Pruning

**Goal:** Skip branches that cannot match.

**Implementation:**

```typescript
private *streamDescendantsWithPruning(
  segment: SegmentNode,
  node: QueryResultNode,
  requiredKeys?: Set<string>
): Generator<QueryResultNode> {
  // If we know we need specific keys, skip objects without them
  if (requiredKeys && typeof node.value === 'object') {
    const hasAnyKey = Object.keys(node.value).some(k =>
      requiredKeys.has(k)
    );
    if (!hasAnyKey && !Array.isArray(node.value)) {
      // Skip this subtree entirely
      return;
    }
  }

  yield* this.streamSelectors(segment.selectors, node);
  // Continue with children...
}
```

**Expected Impact:** Variable, up to 50% for sparse matches.

#### Optimization 3.2: Inline Limit Checking

**Goal:** Eliminate function call overhead in hot paths.

**Implementation:**

```typescript
// Instead of:
this.checkLimits(result._depth ?? 0);

// Use inline check:
if (++this.nodesVisited > this.options.maxNodes ||
    (result._depth ?? 0) > this.options.maxDepth) {
  throw new JSONPathLimitError(...);
}
```

**Expected Impact:** 5-10% improvement in tight loops.

### Priority 4: Architectural (Long-term)

#### Optimization 4.1: Compiled Query Mode

**Goal:** Generate optimized JavaScript for repeated queries.

**Concept:**

```typescript
const compiledQuery = compile('$.store.book[*].title');

// Generates something like:
function query_abc123(root) {
	const results = [];
	const store = root.store;
	if (store) {
		const book = store.book;
		if (Array.isArray(book)) {
			for (let i = 0; i < book.length; i++) {
				if (book[i].title !== undefined) {
					results.push(book[i].title);
				}
			}
		}
	}
	return results;
}
```

**Expected Impact:** Could achieve parity or exceed jsonpath-plus.

#### Optimization 4.2: WebAssembly Core

**Goal:** Move hot paths to WASM for maximum performance.

**Candidates for WASM:**

- Wildcard iteration
- Recursive descent traversal
- Filter expression evaluation

**Expected Impact:** 2-5x for compute-bound operations.

---

## Part 5: Implementation Roadmap

### Phase 1: Quick Wins (1-2 weeks)

| Task                                   | Est. Impact | Effort |
| -------------------------------------- | ----------- | ------ |
| Wildcard fast path for `$[*]` patterns | 5-7x        | Small  |
| Inline limit checking                  | 5-10%       | Small  |
| Skip security checks when unused       | 10-20%      | Small  |
| Update regression baselines            | N/A         | Small  |

### Phase 2: Core Optimizations (2-4 weeks)

| Task                           | Est. Impact | Effort |
| ------------------------------ | ----------- | ------ |
| Batch wildcard collection      | 2-3x        | Medium |
| Enhanced lazy path computation | 2-3x        | Medium |
| Pre-allocated result arrays    | 10-30%      | Medium |
| Recursive descent pruning      | Up to 50%   | Medium |

### Phase 3: Architectural (1-2 months)

| Task                                     | Est. Impact | Effort |
| ---------------------------------------- | ----------- | ------ |
| Compiled query mode                      | 5-10x       | Large  |
| Benchmarking infrastructure improvements | N/A         | Medium |
| WebAssembly prototype                    | 2-5x        | Large  |

---

## Part 6: Benchmark Infrastructure Recommendations

### 6.1 Consolidate Redundant Benchmarks

```bash
# Deprecate overlapping files
mv src/basic.bench.ts src/_deprecated/basic.bench.ts
mv src/pointer.bench.ts src/_deprecated/pointer.bench.ts
mv src/patch.bench.ts src/_deprecated/patch.bench.ts
mv src/query.bench.ts src/_deprecated/query.bench.ts
```

### 6.2 Add Missing Benchmarks

| Scenario                                   | Priority |
| ------------------------------------------ | -------- |
| Edge cases (empty results, null values)    | Medium   |
| Error path performance                     | Low      |
| Memory allocation tracking                 | High     |
| First-result latency (time to first yield) | High     |
| Concurrent query execution                 | Low      |

### 6.3 Improve Baseline Management

```json
// baseline.json
{
	"version": "4.0",
	"date": "2026-01-XX",
	"environment": {
		"node": "24.x",
		"os": "darwin-arm64"
	},
	"baselines": {
		"simple-path": { "min": 1800000, "target": 2000000 },
		"wildcard": { "min": 200000, "target": 500000 },
		"recursive": { "min": 80000, "target": 150000 },
		"pointer": { "min": 2000000, "target": 2500000 }
	}
}
```

---

## Part 7: Appendix

### A. Test Execution Commands

```bash
# Run all tests
pnpm --filter @jsonpath/benchmarks exec vitest run

# Run specific benchmark
pnpm --filter @jsonpath/benchmarks bench src/query-fundamentals.bench.ts

# Run all benchmarks
pnpm --filter @jsonpath/benchmarks bench

# Type-check
pnpm --filter @jsonpath/benchmarks type-check
```

### B. Adapter Feature Matrix

| Adapter       | Filter | Script | Arithmetic | Nodes |
| ------------- | ------ | ------ | ---------- | ----- |
| @jsonpath     | ✅     | ✅     | ✅         | ❌    |
| jsonpath      | ✅     | ✅     | ✅         | ❌    |
| jsonpath-plus | ✅     | ✅     | ✅         | ✅    |
| json-p3       | ✅     | ❌     | ❌         | ✅    |

### C. Files Modified in This Audit

1. `src/output-formats.bench.ts` - Fixed type safety issues
2. `src/browser/index.bench.ts` - Fixed type safety issues

### D. Performance Summary Table

| Scenario       | @jsonpath | jsonpath-plus | Ratio        | Winner           |
| -------------- | --------- | ------------- | ------------ | ---------------- |
| Simple path    | 2,240,055 | 1,970,932     | 1.14x faster | ✅ @jsonpath     |
| Array index    | 1,844,998 | 1,660,368     | 1.11x faster | ✅ @jsonpath     |
| Deep nesting   | 1,493,164 | 1,309,067     | 1.14x faster | ✅ @jsonpath     |
| Wide object    | 3,760,620 | 2,788,267     | 1.35x faster | ✅ @jsonpath     |
| Wildcard       | 145,279   | 1,130,429     | 7.78x slower | ❌ jsonpath-plus |
| Recursive      | 73,835    | 348,161       | 4.72x slower | ❌ jsonpath-plus |
| 100-item array | 13,220    | 103,308       | 7.81x slower | ❌ jsonpath-plus |
| 10K-item array | 138       | 977           | 7.09x slower | ❌ jsonpath-plus |

---

## Conclusion

The `@jsonpath/benchmarks` package is well-structured with comprehensive coverage, but identifies clear performance gaps in wildcard and recursive operations. The root cause is generator-based iteration with per-element object allocation.

**To achieve the goal of outperforming all existing packages:**

1. **Immediate:** Implement wildcard fast path for simple patterns
2. **Short-term:** Add batch collection and inline optimizations
3. **Medium-term:** Implement compiled query mode
4. **Long-term:** Consider WebAssembly for maximum performance

With the proposed optimizations, @jsonpath can realistically achieve:

- **Simple paths:** Maintain 1.1-1.4x lead ✅
- **Wildcards:** Improve from 7.8x slower to 1-2x slower (or parity)
- **Recursive:** Improve from 4.7x slower to 2x slower (or parity)
- **Large arrays:** Improve from 7x slower to 2-3x slower

---

_Report generated by AI Engineering Agent - v4.0_
