# JSONPath Performance Optimization (v2 - Updated January 2026)

**Branch:** `feat/jsonpath-performance-optimization-v2`
**Description:** Close remaining performance gaps in @jsonpath/patch and merge-patch to achieve market leadership

## Goal

The January 2026 benchmark audit (AUDIT_REPORT_v5.md) revealed that **most JSONPath query operations are already winning**. The remaining gaps are focused on specific packages. This updated plan targets those specific issues.

### Current Performance Status (January 2026 - AUDIT_REPORT_v5)

| Scenario                 | @jsonpath            | Best Competitor          | Status                 | Action          |
| ------------------------ | -------------------- | ------------------------ | ---------------------- | --------------- |
| Simple path              | 1.75M ops/s          | 1.98M (jsonpath-plus)    | ⚠️ 0.88x               | Medium priority |
| Deep nesting             | 1.05M ops/s          | 1.31M (jsonpath-plus)    | ⚠️ 0.80x               | Medium priority |
| **Wildcards**            | **3.29M ops/s**      | 1.11M (jsonpath-plus)    | ✅ **2.96x FASTER**    | ~~No action~~   |
| **Recursive**            | **548K ops/s**       | 351K (jsonpath-plus)     | ✅ **1.56x FASTER**    | ~~No action~~   |
| **Filters**              | **1.33-2.38M ops/s** | 307-434K (jsonpath-plus) | ✅ **3-6x FASTER**     | ~~No action~~   |
| **Large arrays**         | **2.2K-170K ops/s**  | 998-102K (jsonpath-plus) | ✅ **1.7-2.2x FASTER** | ~~No action~~   |
| Pointer                  | **2.70M ops/s**      | 1.60M (json-pointer)     | ✅ **1.69x FASTER**    | ~~No action~~   |
| **Patch (single)**       | 91K ops/s            | 197K (fast-json-patch)   | ❌ **0.46x**           | **Critical**    |
| **Patch (batch)**        | 75K ops/s            | 140K (fast-json-patch)   | ❌ **0.54x**           | **Critical**    |
| Merge-patch apply        | 189K ops/s           | 185K (json-merge-patch)  | ✅ 1.02x               | ~~No action~~   |
| **Merge-patch generate** | 1.69M ops/s          | 2.48M (json-merge-patch) | ❌ **0.68x**           | High priority   |

### Remaining Root Causes

1. **@jsonpath/patch**: `structuredClone` on every operation, per-call closure allocation, repeated pointer parsing
2. **@jsonpath/merge-patch generate**: Excessive `structuredClone` usage, double key iteration
3. **Evaluator simple paths**: Eager pointer computation, runtime condition checking

---

## Design Decisions

| Decision                   | Choice                                         | Rationale                                                              |
| -------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| **Breaking API Changes**   | ✅ Acceptable                                  | Default to mutation for performance; users clone if needed             |
| **Default behavior**       | `mutate: true`                                 | Performance-first defaults; opt-in safety via explicit cloning         |
| **fastDeepClone location** | `@jsonpath/core`                               | Shared across all packages that need cloning                           |
| **Cloning strategy**       | Replace `structuredClone` with `fastDeepClone` | Same semantics, faster execution                                       |
| **Regression tests**       | Warn only                                      | Non-blocking CI; alerts on performance degradation                     |
| **Scope**                  | Gaps only                                      | Focus on patch, merge-patch, simple paths; no changes to winning areas |

---

## Phase 1: Critical - @jsonpath/patch Optimization (Steps 1-4)

### Step 1: Add fastDeepClone to @jsonpath/core

**Files:**

- `packages/jsonpath/core/src/clone.ts` (new)
- `packages/jsonpath/core/src/index.ts`

**What:**
Create an optimized deep clone function that bypasses `structuredClone` overhead for JSON-only data. The existing `deepClone` in core already has a fallback, but it tries `structuredClone` first. We need a version that skips it entirely for predictable performance.

**Implementation:**

```typescript
// packages/jsonpath/core/src/clone.ts
export function fastDeepClone<T>(value: T): T {
	if (value === null || typeof value !== 'object') return value;

	if (Array.isArray(value)) {
		const result = new Array(value.length);
		for (let i = 0; i < value.length; i++) {
			result[i] = fastDeepClone(value[i]);
		}
		return result as T;
	}

	const result: Record<string, unknown> = {};
	for (const key in value) {
		if (Object.prototype.hasOwnProperty.call(value, key)) {
			result[key] = fastDeepClone((value as Record<string, unknown>)[key]);
		}
	}
	return result as T;
}
```

**Testing:**

1. Add unit tests: primitives, nested objects, arrays, null, undefined
2. Benchmark vs `structuredClone` to verify 10-30% improvement
3. Run `pnpm --filter @jsonpath/core test`

**Expected Impact:** Foundation for 10-30% improvement in clone-heavy operations

---

### Step 2: Move patch helper functions to module scope and change defaults

**Files:**

- `packages/jsonpath/patch/src/patch.ts`

**What:**

1. The `setAt`, `removeAt`, `replaceAt` functions are currently defined inside the `applyPatch` loop (lines 114-192), causing per-iteration closure allocation. Move them to module scope.
2. **BREAKING CHANGE**: Change default from `mutate: false` to `mutate: true` for performance. Users who need immutability must clone before calling.

**Current (problematic):**

```typescript
for (let index = 0; index < patch.length; index++) {
	const setAt = (doc, tokens, value, allowCreate) => {
		/* ... */
	}; // Allocated every iteration!
	const removeAt = (doc, tokens) => {
		/* ... */
	};
	const replaceAt = (doc, tokens, value) => {
		/* ... */
	};
}
```

**Target:**

```typescript
// Module-level helpers
const patchOperations = {
    setAt: (doc: any, tokens: string[], value: unknown, allowCreate: boolean) => { /* ... */ },
    removeAt: (doc: any, tokens: string[]) => { /* ... */ },
    replaceAt: (doc: any, tokens: string[], value: unknown) => { /* ... */ },
};

export function applyPatch(...) {
    for (let index = 0; index < patch.length; index++) {
        // Use patchOperations.setAt, etc.
    }
}
```

**Testing:**

1. Run `pnpm --filter @jsonpath/patch test`
2. Run RFC 6902 compliance: `pnpm --filter @jsonpath/patch test src/__tests__/spec.spec.ts`
3. Benchmark single replace and batch operations

**Expected Impact:** 10-20% improvement from reduced allocation

---

### Step 3: Replace structuredClone with fastDeepClone in patch

**Files:**

- `packages/jsonpath/patch/src/patch.ts`

**What:**
Replace all `structuredClone` calls (lines 87-91, 321) with the new `fastDeepClone` from @jsonpath/core.

**Current:**

```typescript
const workingRoot = atomicApply
	? structuredClone(target)
	: mutate
		? target
		: structuredClone(target);
```

**Target:**

```typescript
import { fastDeepClone } from '@jsonpath/core';

const workingRoot = atomicApply
	? fastDeepClone(target)
	: mutate
		? target
		: fastDeepClone(target);
```

**Testing:**

1. Run full patch test suite
2. Run RFC 6902 compliance tests
3. Verify atomicApply rollback still works
4. Benchmark to verify 10-30% improvement

**Expected Impact:** 10-30% improvement on clone-heavy operations

---

### Step 4: Add pointer token caching

**Files:**

- `packages/jsonpath/patch/src/patch.ts`

**What:**
Create a bounded cache for parsed pointer tokens. The `parseTokens` function is called for every operation but doesn't cache results. For batch operations on similar paths, this is wasteful.

**Implementation:**

```typescript
// Bounded cache
const tokenCache = new Map<string, string[]>();
const TOKEN_CACHE_MAX = 1000;

function parseTokensCached(ptr: string): string[] {
	let tokens = tokenCache.get(ptr);
	if (tokens) return tokens;

	tokens = parseTokensImpl(ptr);

	if (tokenCache.size >= TOKEN_CACHE_MAX) {
		const firstKey = tokenCache.keys().next().value;
		tokenCache.delete(firstKey);
	}
	tokenCache.set(ptr, tokens);

	return tokens;
}
```

**Testing:**

1. Run full patch test suite
2. Benchmark batch operations with repeated paths
3. Verify cache doesn't grow unbounded

**Expected Impact:** 5-15% improvement for batch operations

---

## Phase 2: High Priority - @jsonpath/merge-patch Optimization (Steps 5-6)

### Step 5: Eliminate unnecessary clones in merge-patch generate

**Files:**

- `packages/jsonpath/merge-patch/src/merge-patch.ts`

**What:**
The `createMergePatch` function uses `structuredClone(target[key])` for every changed value (lines 67, 75, 84). This is unnecessary - we can return references since the patch is a new object.

**Current:**

```typescript
patch[key] = structuredClone(target[key]);
```

**Target:**

```typescript
patch[key] = target[key]; // Return reference, not clone
```

**Also fix double key iteration (lines 70-72):**

```typescript
// Current (allocates 3 data structures)
const keys = new Set([...Object.keys(source), ...Object.keys(target)]);

// Target (single pass)
for (const key in source) {
	if (!(key in target)) {
		patch[key] = null;
		continue;
	}
	// ... compare
}
for (const key in target) {
	if (!(key in source)) {
		patch[key] = target[key];
	}
}
```

**Testing:**

1. Run `pnpm --filter @jsonpath/merge-patch test`
2. Run RFC 7386 compliance tests
3. Benchmark createMergePatch to verify 30-50% improvement

**Expected Impact:** 30-50% improvement by eliminating unnecessary clones

---

### Step 6: Use fastDeepClone in merge-patch apply

**Files:**

- `packages/jsonpath/merge-patch/src/merge-patch.ts`

**What:**
Replace any remaining `structuredClone` calls with `fastDeepClone` from @jsonpath/core for consistent performance.

**Testing:**

1. Run merge-patch tests
2. Benchmark apply operations

**Expected Impact:** 10-20% improvement on apply with cloning

---

## Phase 3: Medium Priority - Evaluator Simple Path Optimization (Steps 7-8)

### Step 7: Pre-compute fast path eligibility in evaluator

**Files:**

- `packages/jsonpath/evaluator/src/evaluator.ts`

**What:**
Multiple condition checks happen on every `evaluateSimpleChain` call (lines 95-114). Pre-compute these at construction time.

**Current:**

```typescript
if (
	this.options.detectCircular ||
	this.hasEvaluationHooks ||
	(this.options.maxDepth > 0 && ast.segments.length > this.options.maxDepth) ||
	this.options.maxResults === 0
) {
	return null;
}
```

**Target:**

```typescript
// In constructor
private readonly canUseFastPath: boolean;

constructor(root: any, options?: EvaluatorOptions) {
    this.options = withDefaults(options);
    this.canUseFastPath = this.computeFastPathEligibility();
}

private computeFastPathEligibility(): boolean {
    if (this.options.detectCircular) return false;
    if (this.hasEvaluationHooks) return false;
    if (this.options.maxResults === 0) return false;
    const { allowPaths, blockPaths } = this.options.secure;
    if ((allowPaths?.length ?? 0) > 0 || (blockPaths?.length ?? 0) > 0) return false;
    return true;
}

private evaluateSimpleChain(ast: QueryNode): QueryResult | null {
    if (!this.canUseFastPath) return null;
    // ... rest
}
```

**Testing:**

1. Run `pnpm --filter @jsonpath/evaluator test`
2. Benchmark simple path queries

**Expected Impact:** 5-10% improvement from reduced condition checking

---

### Step 8: Lazy pointer string computation

**Files:**

- `packages/jsonpath/evaluator/src/evaluator.ts`
- `packages/jsonpath/evaluator/src/result.ts`

**What:**
Pointer strings are computed eagerly (lines 163-168) even when not needed. Defer computation until accessed.

**Current:**

```typescript
const escape = (segment: PathSegment) =>
	String(segment).replace(/~/g, '~0').replace(/\//g, '~1');
let ptr = '';
for (const s of path) ptr += `/${escape(s)}`;
```

**Target:**
Use the existing lazy pattern with `_cachedPointer` getter:

```typescript
// Only compute pointer when accessed via getter
get pointer(): string {
    if (this._cachedPointer === undefined) {
        this._cachedPointer = this.computePointer();
    }
    return this._cachedPointer;
}
```

**Testing:**

1. Run evaluator tests
2. Verify `pointer` property still works when accessed
3. Benchmark simple paths

**Expected Impact:** 5-10% improvement when pointer not used

---

## Phase 4: Finalization (Steps 9-10)

### Step 9: Run comprehensive benchmarks and update documentation

**Files:**

- `packages/jsonpath/benchmarks/AUDIT_REPORT_v5.md`
- `packages/jsonpath/benchmarks/PERFORMANCE_BASELINES.json` (new)

**What:**

1. Run complete benchmark suite against all competitors
2. Update AUDIT_REPORT_v5.md with post-optimization results
3. Create performance baselines file for CI regression detection

**Testing:**

- Full benchmark suite: `pnpm --filter @jsonpath/benchmarks bench`
- Verify all packages meet target thresholds

**Expected Impact:** Documentation and baseline establishment

---

### Step 10: Add performance regression tests

**Files:**

- `packages/jsonpath/benchmarks/src/__tests__/regression.spec.ts` (new)
- `packages/jsonpath/benchmarks/vitest.config.ts`

**What:**
Add automated performance regression detection:

```typescript
describe('Performance Regression', () => {
	it('patch single replace should meet baseline', async () => {
		const opsPerSec = await measureOpsPerSec(() => {
			applyPatch(doc, [{ op: 'replace', path: '/a', value: 1 }]);
		});
		const threshold = baselines.patchSingle * 0.9;
		if (opsPerSec < threshold) {
			console.warn(`⚠️ Regression: ${opsPerSec} < ${threshold}`);
		}
	});
});
```

**Testing:**

1. Run regression tests
2. Verify baseline capture works

**Expected Impact:** CI regression detection

---

## Summary

| Step | Phase    | Package               | Expected Impact        |
| ---- | -------- | --------------------- | ---------------------- |
| 1    | Critical | @jsonpath/core        | Foundation for 10-30%  |
| 2    | Critical | @jsonpath/patch       | 10-20% faster          |
| 3    | Critical | @jsonpath/patch       | 10-30% faster          |
| 4    | Critical | @jsonpath/patch       | 5-15% faster           |
| 5    | High     | @jsonpath/merge-patch | 30-50% faster generate |
| 6    | High     | @jsonpath/merge-patch | 10-20% faster apply    |
| 7    | Medium   | @jsonpath/evaluator   | 5-10% faster           |
| 8    | Medium   | @jsonpath/evaluator   | 5-10% faster           |
| 9    | Final    | benchmarks            | Documentation          |
| 10   | Final    | benchmarks            | CI regression tests    |

## Success Criteria

**Target: Achieve parity or better with all competitors**

- [ ] @jsonpath/patch single: From 91K → **180K+ ops/s** (≥0.90x vs fast-json-patch)
- [ ] @jsonpath/patch batch: From 75K → **130K+ ops/s** (≥0.90x vs fast-json-patch)
- [ ] @jsonpath/merge-patch generate: From 1.69M → **2.4M+ ops/s** (≥0.95x vs json-merge-patch)
- [ ] @jsonpath/evaluator simple: From 1.75M → **1.95M+ ops/s** (≥0.98x vs jsonpath-plus)
- [ ] All RFC compliance tests passing (6902, 7386)
- [ ] Breaking change documented: `mutate: true` is now default
- [ ] Performance baselines established for CI (warn-only)

## Rollback Plan

Each step is independent and can be reverted individually:

- **Phase 1 (Steps 1-4):** Revert to `structuredClone`, inline helpers
- **Phase 2 (Steps 5-6):** Revert merge-patch changes
- **Phase 3 (Steps 7-8):** Revert evaluator changes
- **Phase 4 (Steps 9-10):** Non-functional, safe to revert
