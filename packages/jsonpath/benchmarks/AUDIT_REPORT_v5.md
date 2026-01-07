# JSONPath Benchmarks Comprehensive Audit Report

**Date:** January 6, 2026 (v5.0)
**Auditor:** AI Engineering Agent (Claude Opus 4.5)
**Scope:** `@jsonpath/benchmarks` package - Full Performance Analysis
**Status:** ✅ Complete

---

## Executive Summary

This comprehensive audit analyzes the complete `@jsonpath/*` suite performance against industry-leading implementations. Through extensive benchmarking, code analysis, and competitor research, we identify **specific bottlenecks** and propose **actionable optimization strategies** with the goal of achieving best-in-class performance across all operations.

### Overall Performance Scorecard (January 2026 Benchmarks)

| Package                 | Operation                           | Status             | Performance vs Best Competitor                                 |
| ----------------------- | ----------------------------------- | ------------------ | -------------------------------------------------------------- |
| `@jsonpath/jsonpath`    | Simple path ($.store.bicycle.color) | ⚠️ **Slight Loss** | 0.88x vs jsonpath-plus (1,753,650 vs 1,984,087 ops/s)          |
| `@jsonpath/jsonpath`    | Array index ($.store.book[0].title) | ⚠️ **Slight Loss** | 0.94x vs jsonpath-plus (1,576,665 vs 1,682,308 ops/s)          |
| `@jsonpath/jsonpath`    | Wildcard ($.store.book[*].title)    | ✅ **WIN**         | 2.96x faster than jsonpath-plus (3,291,558 vs 1,112,123 ops/s) |
| `@jsonpath/jsonpath`    | Recursive descent ($..author)       | ✅ **WIN**         | 1.56x faster than jsonpath-plus (547,872 vs 351,136 ops/s)     |
| `@jsonpath/jsonpath`    | Deep nesting                        | ⚠️ **Loss**        | 0.80x vs jsonpath-plus (1,047,481 vs 1,306,629 ops/s)          |
| `@jsonpath/jsonpath`    | Wide objects ($.prop999)            | ✅ **WIN**         | 1.33x faster than jsonpath-plus (3,669,334 vs 2,751,843 ops/s) |
| `@jsonpath/jsonpath`    | Large array 100 items ($[*].value)  | ✅ **WIN**         | 1.68x faster than jsonpath-plus (170,696 vs 101,711 ops/s)     |
| `@jsonpath/jsonpath`    | Large array 1K items                | ✅ **WIN**         | 1.75x faster than jsonpath-plus (17,955 vs 10,243 ops/s)       |
| `@jsonpath/jsonpath`    | Large array 10K items               | ✅ **WIN**         | 2.22x faster than jsonpath-plus (2,219 vs 998 ops/s)           |
| `@jsonpath/jsonpath`    | Filter: simple comparison           | ✅ **WIN**         | 3.07x faster than jsonpath-plus (1,330,290 vs 433,571 ops/s)   |
| `@jsonpath/jsonpath`    | Filter: boolean check               | ✅ **WIN**         | 5.47x faster than jsonpath-plus (2,376,151 vs 434,385 ops/s)   |
| `@jsonpath/jsonpath`    | Filter: logical &&                  | ✅ **WIN**         | 6.30x faster than jsonpath-plus (1,935,927 vs 307,571 ops/s)   |
| `@jsonpath/jsonpath`    | Filter: arithmetic                  | ✅ **WIN**         | 5.79x faster than jsonpath-plus (2,120,956 vs 366,475 ops/s)   |
| `@jsonpath/pointer`     | Resolution                          | ✅ **WIN**         | 1.32-1.69x faster than json-pointer                            |
| `@jsonpath/patch`       | Single replace                      | ❌ **LOSS**        | 0.46x vs fast-json-patch (90,645 vs 197,259 ops/s)             |
| `@jsonpath/patch`       | Batch 10 adds                       | ❌ **LOSS**        | 0.54x vs fast-json-patch (74,754 vs 139,630 ops/s)             |
| `@jsonpath/merge-patch` | Apply                               | ✅ **Slight WIN**  | 1.02x vs json-merge-patch (189,447 vs 184,885 ops/s)           |
| `@jsonpath/merge-patch` | Generate                            | ❌ **LOSS**        | 0.68x vs json-merge-patch (1,693,286 vs 2,483,287 ops/s)       |

### Key Findings Summary

| Area                              | Status                                   | Priority              |
| --------------------------------- | ---------------------------------------- | --------------------- |
| **JSONPath Query (Simple Paths)** | Slight underperformance vs jsonpath-plus | Medium                |
| **JSONPath Query (Wildcards)**    | ✅ Significantly faster                  | N/A (already winning) |
| **JSONPath Query (Recursive)**    | ✅ Faster than most competitors          | N/A (already winning) |
| **JSONPath Query (Filters)**      | ✅ 3-6x faster than competitors          | N/A (already winning) |
| **JSON Pointer**                  | ✅ Fastest implementation                | N/A (already winning) |
| **JSON Patch**                    | 2x slower than fast-json-patch           | **Critical**          |
| **JSON Merge Patch (Generate)**   | 1.5x slower than json-merge-patch        | High                  |

---

## Part 1: Detailed Benchmark Analysis

### 1.1 JSONPath Query Performance

#### Category: Simple Property Access

| Query                   | @jsonpath/jsonpath | jsonpath-plus | jsonpath | json-p3 | Best          |
| ----------------------- | ------------------ | ------------- | -------- | ------- | ------------- |
| `$.store.bicycle.color` | 1,753,650          | **1,984,087** | 178,264  | 993,910 | jsonpath-plus |
| `$.store.book[0].title` | 1,576,665          | **1,682,308** | 124,857  | 813,980 | jsonpath-plus |

**Analysis:** For simple property chains, @jsonpath/jsonpath is ~6-12% slower than jsonpath-plus. This is within acceptable margins but represents an optimization opportunity.

**Root Cause:** The fast path in `evaluateSimpleChain()` still has overhead from:

1. Multiple condition checks before entering fast path
2. Pointer string computation (`_cachedPointer`) even when not needed
3. Object allocation for the result node

#### Category: Wildcard Operations

| Query                    | @jsonpath/jsonpath | jsonpath-plus | jsonpath | json-p3 | Best          |
| ------------------------ | ------------------ | ------------- | -------- | ------- | ------------- |
| `$.store.book[*].title`  | **3,291,558**      | 1,112,123     | 114,195  | 494,060 | **@jsonpath** |
| `$[*].value` (100 items) | **170,696**        | 101,711       | 27,478   | 43,805  | **@jsonpath** |
| `$[*].value` (1K items)  | **17,955**         | 10,243        | 1,894    | 4,489   | **@jsonpath** |
| `$[*].value` (10K items) | **2,219**          | 998           | 37       | 440     | **@jsonpath** |

**Analysis:** Excellent performance! The `evaluateWildcardChain()` fast path is highly effective, achieving 2-3x better performance than competitors. This is a major success.

**Victory Factors:**

1. Imperative iteration without generator overhead
2. Batch result collection
3. Direct array manipulation
4. Cached pointer strings

#### Category: Recursive Descent

| Query       | @jsonpath/jsonpath | jsonpath-plus | jsonpath | json-p3 | Best          |
| ----------- | ------------------ | ------------- | -------- | ------- | ------------- |
| `$..author` | **547,872**        | 351,136       | 100,940  | 18,135  | **@jsonpath** |

**Analysis:** Excellent recursive descent performance, 1.56x faster than jsonpath-plus. This was previously a weak point but has been significantly optimized.

#### Category: Filter Expressions

| Filter            | @jsonpath/jsonpath | jsonpath-plus | jsonpath | json-p3 | Best          |
| ----------------- | ------------------ | ------------- | -------- | ------- | ------------- |
| Simple comparison | **1,330,290**      | 433,571       | 107,612  | 366,520 | **@jsonpath** |
| Boolean check     | **2,376,151**      | 434,385       | 134,345  | 359,216 | **@jsonpath** |
| Logical &&        | **1,935,927**      | 307,571       | 114,486  | 254,854 | **@jsonpath** |
| Arithmetic        | **2,120,956**      | 366,475       | 109,809  | N/A     | **@jsonpath** |

**Analysis:** Outstanding filter performance! 3-6x faster than jsonpath-plus across all filter types. The removal of debug console.log and optimized filter evaluation pays dividends.

#### Category: Deep Nesting

| Query                              | @jsonpath/jsonpath | jsonpath-plus | jsonpath | json-p3 | Best          |
| ---------------------------------- | ------------------ | ------------- | -------- | ------- | ------------- |
| `$.next.next.next.next.next.value` | 1,047,481          | **1,306,629** | 91,409   | 573,688 | jsonpath-plus |

**Analysis:** 20% slower than jsonpath-plus for deep nesting. The fast path should handle this, but there may be overhead in condition checking.

### 1.2 JSON Pointer Performance

| Operation              | @jsonpath/pointer | json-pointer | Best          |
| ---------------------- | ----------------- | ------------ | ------------- |
| `/store/bicycle/color` | **2,701,855**     | 1,598,899    | **@jsonpath** |
| `/store/book/0/title`  | **2,175,729**     | 1,643,895    | **@jsonpath** |

**Analysis:** Excellent! 32-69% faster than json-pointer. The lean implementation without overhead pays off.

### 1.3 JSON Patch Performance

| Operation      | @jsonpath/patch | fast-json-patch | rfc6902 | Best            |
| -------------- | --------------- | --------------- | ------- | --------------- |
| Single replace | 90,645          | **197,259**     | 188,395 | fast-json-patch |
| Batch 10 adds  | 74,754          | **139,630**     | 109,695 | fast-json-patch |

**Analysis:** **Critical performance gap.** @jsonpath/patch is approximately 2x slower than fast-json-patch. This is the most significant underperformance in the suite.

### 1.4 JSON Merge Patch Performance

| Operation | @jsonpath/merge-patch | json-merge-patch | Best                   |
| --------- | --------------------- | ---------------- | ---------------------- |
| Apply     | **189,447**           | 184,885          | **@jsonpath** (slight) |
| Generate  | 1,693,286             | **2,483,287**    | json-merge-patch       |

**Analysis:** Apply performance is at parity. Generate is 32% slower than json-merge-patch - a notable gap.

---

## Part 2: Root Cause Analysis

### 2.1 Why @jsonpath/patch is 2x Slower Than fast-json-patch

#### Root Cause 1: structuredClone Overhead

**Location:** [patch/src/patch.ts:92-95](packages/jsonpath/patch/src/patch.ts#L92-L95)

```typescript
const workingRoot = atomicApply
	? structuredClone(target)
	: mutate
		? target
		: structuredClone(target);
```

**Problem:** `structuredClone()` is called on every patch application, even for simple operations. This is an O(n) operation where n is the document size.

**fast-json-patch approach:**

```javascript
// Only clones when mutateDocument is false
if (!mutateDocument) {
	document = _deepClone(document);
}
```

fast-json-patch uses a hand-optimized `_deepClone` function that is faster than `structuredClone` for typical JSON documents.

**Impact:** For the benchmark document (STORE_DATA), this adds ~0.005ms per operation.

#### Root Cause 2: Repeated Pointer Parsing

**Location:** [patch/src/patch.ts:104-106](packages/jsonpath/patch/src/patch.ts#L104-L106)

```typescript
const parseTokens = (ptr: string): string[] => {
	if (ptr === '') return [];
	if (!ptr.startsWith('/'))
		throw new JSONPathError(`Invalid JSON Pointer: ${ptr}`, 'PATCH_ERROR');
	return ptr.split('/').slice(1).map(unescapePointer);
};
```

**Problem:** `parseTokens` is defined inside the loop and called for every operation, but doesn't cache parsed pointers. For batch operations on similar paths, this is wasteful.

**fast-json-patch approach:**

```javascript
const keys = path.split('/');
// Direct iteration without intermediate array creation
```

#### Root Cause 3: Per-Operation Function Definitions

**Location:** [patch/src/patch.ts:114-192](packages/jsonpath/patch/src/patch.ts#L114-L192)

```typescript
const setAt = (doc, tokens, value, allowCreate) => {
	/* ... */
};
const removeAt = (doc, tokens) => {
	/* ... */
};
const replaceAt = (doc, tokens, value) => {
	/* ... */
};
```

**Problem:** `setAt`, `removeAt`, and `replaceAt` are defined as closures inside the loop. JavaScript engines must allocate these on each call.

**fast-json-patch approach:**

```javascript
// Pre-defined operation objects
var objOps = {
	add: function (obj, key, document) {
		/* ... */
	},
	remove: function (obj, key) {
		/* ... */
	},
	replace: function (obj, key, document) {
		/* ... */
	},
	// ...
};
```

#### Root Cause 4: Validation Overhead

**Location:** [patch/src/patch.ts:110](packages/jsonpath/patch/src/patch.ts#L110)

```typescript
validateOperation(operation);
```

**Problem:** Every operation is validated inside the loop, even when `validate: false` is passed. The validation check happens after the `before` callback, not before.

### 2.2 Why @jsonpath/merge-patch Generate is 32% Slower

#### Root Cause 1: Excessive structuredClone Usage

**Location:** [merge-patch/src/merge-patch.ts:74,84](packages/jsonpath/merge-patch/src/merge-patch.ts#L74)

```typescript
patch[key] = structuredClone(target[key]);
// ...
patch[key] = structuredClone(t);
```

**Problem:** `structuredClone` is called for every changed value. For deeply nested objects with many changes, this compounds.

**json-merge-patch approach:** Uses direct assignment and shallow copies where safe.

#### Root Cause 2: Double Key Iteration

**Location:** [merge-patch/src/merge-patch.ts:70-72](packages/jsonpath/merge-patch/src/merge-patch.ts#L70-L72)

```typescript
const keys = new Set([...Object.keys(source), ...Object.keys(target)]);
```

**Problem:** Creates a Set from two spread arrays. This allocates three data structures (two arrays + one Set).

**Optimized approach:**

```typescript
// Single pass with in-place tracking
for (const key in source) {
	if (!(key in target)) {
		patch[key] = null;
	} else {
		/* compare */
	}
}
for (const key in target) {
	if (!(key in source)) {
		patch[key] = target[key];
	}
}
```

### 2.3 Why Simple Path Access is 6-12% Slower

#### Root Cause 1: Excessive Condition Checking

**Location:** [evaluator/src/evaluator.ts:95-114](packages/jsonpath/evaluator/src/evaluator.ts#L95-L114)

```typescript
if (
	this.options.detectCircular ||
	this.hasEvaluationHooks ||
	(this.options.maxDepth > 0 && ast.segments.length > this.options.maxDepth) ||
	this.options.maxResults === 0
) {
	return null;
}

const { allowPaths, blockPaths } = this.options.secure;
if ((allowPaths?.length ?? 0) > 0 || (blockPaths?.length ?? 0) > 0) {
	return null;
}
```

**Problem:** Multiple condition checks happen even for the simple fast path. Each check has overhead.

**Optimization:** Pre-compute eligibility flags at construction time.

#### Root Cause 2: Pointer String Computation

**Location:** [evaluator/src/evaluator.ts:163-168](packages/jsonpath/evaluator/src/evaluator.ts#L163-L168)

```typescript
const escape = (segment: PathSegment) =>
	String(segment).replace(/~/g, '~0').replace(/\//g, '~1');
let ptr = '';
for (const s of path) ptr += `/${escape(s)}`;
```

**Problem:** Pointer string is always computed, even when not needed.

**jsonpath-plus approach:** Paths are only computed when explicitly requested via `resultType`.

---

## Part 3: Proposed Optimizations

### Priority 1: Critical - JSON Patch Performance (2x improvement target)

#### Optimization 1.1: Eliminate Unnecessary Cloning

**Current:**

```typescript
const workingRoot = atomicApply
	? structuredClone(target)
	: mutate
		? target
		: structuredClone(target);
```

**Proposed:**

```typescript
// Only clone when absolutely necessary
let working = mutate ? target : shallowCloneWithPaths(target, patch);

// Helper: only clone paths that will be modified
function shallowCloneWithPaths(obj, patch) {
	const result = Array.isArray(obj) ? [...obj] : { ...obj };
	// Clone only paths that will be touched by patch operations
	// This is O(patch.length) not O(document.size)
	return result;
}
```

**Expected Impact:** 30-50% improvement for large documents with small patches.

#### Optimization 1.2: Move Helper Functions Outside Loop

**Current:**

```typescript
for (let index = 0; index < patch.length; index++) {
	const setAt = (doc, tokens, value, allowCreate) => {
		/* ... */
	};
	const removeAt = (doc, tokens) => {
		/* ... */
	};
	// ...
}
```

**Proposed:**

```typescript
// Define at module level or as class methods
const patchOps = {
	add: (doc, tokens, value) => {
		/* ... */
	},
	remove: (doc, tokens) => {
		/* ... */
	},
	replace: (doc, tokens, value) => {
		/* ... */
	},
	move: (doc, fromTokens, toTokens) => {
		/* ... */
	},
	copy: (doc, fromTokens, toTokens) => {
		/* ... */
	},
	test: (doc, tokens, value) => {
		/* ... */
	},
};

function applyPatch(target, patch, options) {
	for (const op of patch) {
		patchOps[op.op](working, parseTokens(op.path), op.value);
	}
}
```

**Expected Impact:** 10-20% improvement from reduced allocation.

#### Optimization 1.3: Pointer Token Caching

**Proposed:**

```typescript
const tokenCache = new Map<string, string[]>();

function parseTokensCached(ptr: string): string[] {
	let tokens = tokenCache.get(ptr);
	if (!tokens) {
		tokens = parseTokensImpl(ptr);
		if (tokenCache.size < 1000) {
			// Limit cache size
			tokenCache.set(ptr, tokens);
		}
	}
	return tokens;
}
```

**Expected Impact:** 5-15% improvement for repeated paths.

#### Optimization 1.4: Custom Deep Clone

**Proposed:**

```typescript
function fastDeepClone<T>(obj: T): T {
	if (obj === null || typeof obj !== 'object') return obj;

	if (Array.isArray(obj)) {
		const result = new Array(obj.length);
		for (let i = 0; i < obj.length; i++) {
			result[i] = fastDeepClone(obj[i]);
		}
		return result as T;
	}

	const result: Record<string, unknown> = {};
	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			result[key] = fastDeepClone((obj as any)[key]);
		}
	}
	return result as T;
}
```

**Expected Impact:** 10-30% improvement over structuredClone for typical JSON.

### Priority 2: High - Merge Patch Generate (50% improvement target)

#### Optimization 2.1: Lazy Deep Clone

**Proposed:**

```typescript
export function createMergePatch(source: any, target: any): any {
	if (!isPlainObject(source) || !isPlainObject(target)) {
		return deepEqual(source, target) ? {} : target; // No clone needed if returning target directly
	}

	const patch: Record<string, any> = {};

	// Single-pass iteration
	for (const key in source) {
		if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
		if (!(key in target)) {
			patch[key] = null;
			continue;
		}

		const s = source[key];
		const t = target[key];
		if (s === t) continue; // Reference equality first
		if (deepEqual(s, t)) continue;

		if (isPlainObject(s) && isPlainObject(t)) {
			const child = createMergePatch(s, t);
			if (Object.keys(child).length > 0) {
				patch[key] = child;
			}
		} else {
			patch[key] = t; // Return reference, not clone
		}
	}

	// Only check target for new keys
	for (const key in target) {
		if (!Object.prototype.hasOwnProperty.call(target, key)) continue;
		if (!(key in source)) {
			patch[key] = target[key]; // Return reference, not clone
		}
	}

	return patch;
}
```

**Expected Impact:** 30-50% improvement by eliminating unnecessary clones.

### Priority 3: Medium - Simple Path Performance (15% improvement target)

#### Optimization 3.1: Pre-computed Fast Path Eligibility

**Proposed:**

```typescript
export class Evaluator {
	private readonly canUseFastPath: boolean;
	private readonly canUseWildcardFastPath: boolean;

	constructor(root: any, options?: EvaluatorOptions) {
		this.options = withDefaults(options);

		// Compute once at construction
		this.canUseFastPath = this.computeFastPathEligibility();
		this.canUseWildcardFastPath = this.computeWildcardFastPathEligibility();
	}

	private computeFastPathEligibility(): boolean {
		if (this.options.detectCircular) return false;
		if (this.hasEvaluationHooks) return false;
		if (this.options.maxResults === 0) return false;
		const { allowPaths, blockPaths } = this.options.secure;
		if ((allowPaths?.length ?? 0) > 0 || (blockPaths?.length ?? 0) > 0)
			return false;
		return true;
	}

	private evaluateSimpleChain(ast: QueryNode): QueryResult | null {
		if (!this.canUseFastPath) return null;
		// ... rest of fast path logic
	}
}
```

**Expected Impact:** 5-10% improvement from reduced condition checking.

#### Optimization 3.2: Lazy Pointer Computation

**Proposed:**

```typescript
interface LazyQueryResultNode {
	value: any;
	path: readonly PathSegment[];
	root: any;
	parent?: any;
	parentKey?: PathSegment;

	// Computed lazily
	get pointer(): string;
}

class LazyResultNode implements LazyQueryResultNode {
	private _pointer?: string;

	constructor(
		public readonly value: any,
		public readonly path: readonly PathSegment[],
		public readonly root: any,
		public readonly parent?: any,
		public readonly parentKey?: PathSegment,
	) {}

	get pointer(): string {
		if (this._pointer === undefined) {
			this._pointer = this.computePointer();
		}
		return this._pointer;
	}

	private computePointer(): string {
		return (
			'/' +
			this.path
				.map((s) => String(s).replace(/~/g, '~0').replace(/\//g, '~1'))
				.join('/')
		);
	}
}
```

**Expected Impact:** 5-10% improvement when pointers aren't used.

---

## Part 4: Implementation Roadmap

### Phase 1: Quick Wins (1 week)

| Task                                                 | Package               | Impact | Effort |
| ---------------------------------------------------- | --------------------- | ------ | ------ |
| Move patch helper functions outside loop             | @jsonpath/patch       | 10-20% | Small  |
| Replace structuredClone with fastDeepClone           | @jsonpath/patch       | 10-30% | Small  |
| Pre-compute fast path eligibility                    | @jsonpath/evaluator   | 5-10%  | Small  |
| Eliminate unnecessary clones in merge-patch generate | @jsonpath/merge-patch | 20-30% | Small  |

**Estimated Total Impact:** Patch 25-40% faster, Evaluator 5-10% faster

### Phase 2: Core Optimizations (2 weeks)

| Task                                     | Package               | Impact | Effort |
| ---------------------------------------- | --------------------- | ------ | ------ |
| Implement pointer token caching          | @jsonpath/patch       | 5-15%  | Medium |
| Lazy pointer computation in evaluator    | @jsonpath/evaluator   | 5-10%  | Medium |
| Path-aware shallow cloning for patch     | @jsonpath/patch       | 20-30% | Medium |
| Single-pass key iteration in merge-patch | @jsonpath/merge-patch | 10-20% | Medium |

**Estimated Total Impact:** Patch 60-80% faster (approaching parity), Evaluator 10-15% faster

### Phase 3: Advanced Optimizations (1 month)

| Task                                     | Package             | Impact  | Effort |
| ---------------------------------------- | ------------------- | ------- | ------ |
| Compiled query mode for repeated queries | @jsonpath/evaluator | 50-100% | Large  |
| Pre-compiled patch operations            | @jsonpath/patch     | 10-20%  | Medium |
| WebAssembly for hot paths                | All                 | 20-50%  | Large  |

---

## Part 5: Competitor Analysis

### fast-json-patch Key Optimizations

1. **Direct mutation by default** - No cloning unless explicitly requested
2. **Pre-defined operation objects** - No closure allocation per call
3. **Inline path traversal** - Direct split/iteration without intermediate parsing
4. **Minimal validation** - Only when explicitly enabled
5. **Object pooling for results** - Reduces GC pressure

### jsonpath-plus Key Optimizations

1. **Expression caching** - Parsed expressions cached by string key
2. **Lazy path construction** - Paths only built for result types that need them
3. **Direct iteration** - Uses for loops instead of generators
4. **Minimal object wrapping** - Results are plain objects, not class instances
5. **Deferred work** - toPathString only called when needed

### json-merge-patch Key Optimizations

1. **No defensive cloning** - Trusts caller to handle immutability
2. **Direct property assignment** - No intermediate data structures
3. **Simple recursion** - Minimal overhead per recursive call
4. **Reference reuse** - Returns references to unchanged subtrees

---

## Part 6: Testing Recommendations

### New Benchmark Scenarios to Add

1. **Mixed operations** - Patches with add, remove, replace, move, copy together
2. **Large patch batches** - 100+ operations per patch
3. **Deep document paths** - `/a/b/c/d/e/f/g/h/i/j`
4. **Array-heavy operations** - Patches on arrays with 1000+ elements
5. **Cold vs warm performance** - First query vs repeated query
6. **Memory usage tracking** - Heap allocation per operation

### Regression Test Baselines

```json
{
	"version": "5.0",
	"date": "2026-01-06",
	"baselines": {
		"jsonpath-simple": { "min": 1500000, "target": 2000000 },
		"jsonpath-wildcard": { "min": 3000000, "target": 3500000 },
		"jsonpath-recursive": { "min": 500000, "target": 600000 },
		"jsonpath-filter": { "min": 1300000, "target": 2000000 },
		"pointer-resolve": { "min": 2000000, "target": 2700000 },
		"patch-single": { "min": 150000, "target": 200000 },
		"patch-batch-10": { "min": 120000, "target": 150000 },
		"merge-patch-apply": { "min": 180000, "target": 200000 },
		"merge-patch-generate": { "min": 2000000, "target": 2500000 }
	}
}
```

---

## Part 7: Conclusions

### Current Strengths

1. **Filter expressions** - 3-6x faster than all competitors
2. **Wildcard operations** - 2-3x faster than all competitors
3. **Recursive descent** - 1.5x faster than jsonpath-plus
4. **Wide object access** - 1.3x faster than jsonpath-plus
5. **Large array processing** - 1.7-2.2x faster than jsonpath-plus
6. **JSON Pointer** - 1.3-1.7x faster than json-pointer

### Areas Requiring Improvement

1. **JSON Patch** - 2x slower than fast-json-patch (**Critical**)
2. **Merge Patch Generate** - 1.5x slower than json-merge-patch (**High**)
3. **Simple paths** - 6-12% slower than jsonpath-plus (**Medium**)
4. **Deep nesting** - 20% slower than jsonpath-plus (**Medium**)

### Projected Performance After Optimizations

| Package                          | Current vs Best | After Phase 1 | After Phase 2 | Target |
| -------------------------------- | --------------- | ------------- | ------------- | ------ |
| @jsonpath/patch                  | 0.46x           | 0.65x         | 0.90x         | ≥1.0x  |
| @jsonpath/merge-patch (generate) | 0.68x           | 0.85x         | 1.0x          | ≥1.0x  |
| @jsonpath/jsonpath (simple)      | 0.88x           | 0.95x         | 1.0x          | ≥1.0x  |
| @jsonpath/jsonpath (deep)        | 0.80x           | 0.88x         | 0.95x         | ≥1.0x  |

### Final Assessment

The @jsonpath/\* suite already **outperforms competitors** in the most computationally intensive operations (wildcards, recursion, filters). The remaining performance gaps are in:

1. **JSON Patch** - Due to defensive cloning and per-operation allocation
2. **Simple paths** - Due to pointer computation and condition checking overhead

With the proposed Phase 1 and Phase 2 optimizations, @jsonpath can achieve **parity or better** across all operations, fulfilling the goal of outperforming all existing packages.

---

## Appendix A: Benchmark Commands

```bash
# Run all benchmarks
pnpm --filter @jsonpath/benchmarks bench

# Run specific benchmark category
pnpm --filter @jsonpath/benchmarks bench src/query-fundamentals.bench.ts
pnpm --filter @jsonpath/benchmarks bench src/patch-rfc6902.bench.ts
pnpm --filter @jsonpath/benchmarks bench src/scale-testing.bench.ts

# Run with JSON output for comparison
pnpm --filter @jsonpath/benchmarks bench --reporter=json --outputFile=results.json

# Type-check
pnpm --filter @jsonpath/benchmarks type-check
```

## Appendix B: Files Modified

This audit is a read-only analysis. No source files were modified.

## Appendix C: Test Verification

All 21 adapter tests pass:

```
Test Files  16 passed (16)
     Tests  21 passed (21)
  Duration  ~90s
```

---

_Report generated by AI Engineering Agent (Claude Opus 4.5) - v5.0_
_January 6, 2026_
