# JSONPath Performance Optimization

**Branch:** `feat/jsonpath-performance-optimization`
**Description:** Optimize @jsonpath packages to outperform all competing JSONPath libraries

## Goal

Close the performance gaps identified in the v4 benchmark audit and achieve market-leading performance:

### Current Performance Status (January 2026)

| Scenario         | @jsonpath       | Best Competitor         | Gap                 | Target                       |
| ---------------- | --------------- | ----------------------- | ------------------- | ---------------------------- |
| Simple path      | **2.24M ops/s** | 1.97M (jsonpath-plus)   | ✅ 1.14x **faster** | Maintain/extend lead         |
| Deep nesting     | **1.49M ops/s** | 1.31M (jsonpath-plus)   | ✅ 1.14x **faster** | Maintain/extend lead         |
| Wide object      | **3.76M ops/s** | 2.79M (jsonpath-plus)   | ✅ 1.35x **faster** | Maintain/extend lead         |
| **Wildcards**    | 145K ops/s      | 1.13M (jsonpath-plus)   | ❌ 7.78x slower     | **1.5M+ ops/s** (outperform) |
| **Recursive**    | 74K ops/s       | 348K (jsonpath-plus)    | ❌ 4.72x slower     | **500K+ ops/s** (outperform) |
| **Large arrays** | 1.3K ops/s      | 10.5K (jsonpath-plus)   | ❌ 7.90x slower     | **15K+ ops/s** (outperform)  |
| Pointer          | **2.66M ops/s** | 1.80M (json-pointer)    | ✅ 1.47x **faster** | Maintain/extend lead         |
| Patch            | 89K ops/s       | 190K (fast-json-patch)  | ❌ 2.1x slower      | **250K+ ops/s** (outperform) |
| Merge-patch      | 187K ops/s      | 185K (json-merge-patch) | ≈ Parity            | **250K+ ops/s** (outperform) |

### Root Causes Identified

1. **Generator overhead**: Wildcard/recursive use generator-based iteration with per-element `yield`
2. **Object allocation**: `pool.acquire()` called for every matched element
3. **Path tracking**: Path computed even when not needed
4. **Security checks**: `isNodeAllowed()` called per element even when no restrictions configured
5. **Function call overhead**: `checkLimits()` called per element in tight loops

---

## Design Decisions

The following decisions were made during planning:

| Decision                      | Choice                           | Rationale                                                                          |
| ----------------------------- | -------------------------------- | ---------------------------------------------------------------------------------- |
| **Breaking Changes**          | ✅ No backwards compatibility    | Breaking changes are acceptable; no migration period needed                        |
| **Streaming Mode**            | Fully supported, not default     | Streaming remains available via `{ stream: true }` but eager evaluation is default |
| **Compliance vs Performance** | Performance first, opt-in strict | Prioritize performance; strict RFC mode available via options                      |
| **AST Modification**          | ✅ Acceptable                    | Parser may store resolved function references directly in AST nodes                |
| **Regression Tests**          | Warn only (non-blocking)         | CI warns on performance regression but does not block PRs                          |
| **Optimization Order**        | Highest impact first             | Prioritize wildcards, recursion, and large arrays over incremental gains           |

---

## Phase 1: Quick Wins (Steps 1-4)

### Step 1: Wildcard Fast Path for All Patterns ⭐ HIGHEST PRIORITY

**Files:**

- `packages/jsonpath/evaluator/src/evaluator.ts`
- `packages/jsonpath/evaluator/src/__tests__/evaluator.spec.ts`

**What:**
Add a dedicated fast path for wildcard patterns at **any position** in the query (`$[*]`, `$[*].property`, `$.prop[*]`, `$.a.b[*].c.d[*]`) that bypasses generator overhead, object pooling, and per-element security checks. This is the **highest impact** optimization, targeting the 7.78x gap and aiming to **outperform** all competitors.

**Scope:** Wildcards can appear anywhere in the path, not just at the root level.

**Changes:**

```typescript
// Add to Evaluator class after evaluateSimpleChain()

/**
 * Fast path for queries containing only name selectors and wildcard selectors.
 * Handles patterns like: $[*], $.prop[*], $[*].prop, $.a[*].b[*].c
 * Bypasses generators, pooling, and per-element security checks.
 */
private evaluateWildcardChainFastPath(ast: QueryNode): QueryResult | null {
  // Skip if security restrictions are configured
  if (this.options.secure.allowPaths?.length || this.options.secure.blockPaths?.length) {
    return null;
  }

  // Validate all segments have single, simple selectors (name or wildcard)
  for (const seg of ast.segments) {
    if (seg.selectors.length !== 1) return null;
    const sel = seg.selectors[0];
    if (sel.type !== NodeType.NameSelector && sel.type !== NodeType.WildcardSelector) {
      return null;
    }
  }

  // Build operation chain for iteration
  type Op = { type: 'name'; name: string } | { type: 'wildcard' };
  const ops: Op[] = ast.segments.map(seg => {
    const sel = seg.selectors[0];
    return sel.type === NodeType.NameSelector
      ? { type: 'name', name: sel.name }
      : { type: 'wildcard' };
  });

  // Must have at least one wildcard to use this path
  if (!ops.some(op => op.type === 'wildcard')) return null;

  // Execute chain imperatively
  interface IntermediateNode {
    value: unknown;
    path: (string | number)[];
    parent: unknown;
    parentKey: string | number;
  }

  let current: IntermediateNode[] = [
    { value: this.root, path: [], parent: null as unknown, parentKey: '' }
  ];

  for (const op of ops) {
    const next: IntermediateNode[] = [];

    if (op.type === 'name') {
      // Property access
      for (const node of current) {
        const val = node.value;
        if (val && typeof val === 'object' && op.name in (val as Record<string, unknown>)) {
          next.push({
            value: (val as Record<string, unknown>)[op.name],
            path: [...node.path, op.name],
            parent: val,
            parentKey: op.name,
          });
        }
      }
    } else {
      // Wildcard expansion
      for (const node of current) {
        const val = node.value;
        if (Array.isArray(val)) {
          // Pre-allocate for arrays (hot path)
          for (let i = 0; i < val.length; i++) {
            next.push({
              value: val[i],
              path: [...node.path, i],
              parent: val,
              parentKey: i,
            });
          }
        } else if (val && typeof val === 'object') {
          // Object properties
          const keys = Object.keys(val as Record<string, unknown>);
          for (const key of keys) {
            next.push({
              value: (val as Record<string, unknown>)[key],
              path: [...node.path, key],
              parent: val,
              parentKey: key,
            });
          }
        }
      }
    }

    current = next;
    if (current.length === 0) break; // Early exit
  }

  // Convert to QueryResultNode[]
  const results: QueryResultNode[] = current.map(node => ({
    value: node.value,
    path: node.path,
    root: this.root,
    parent: node.parent,
    parentKey: node.parentKey,
  }));

  return new QueryResult(results);
}

// In evaluate() method, add after evaluateSimpleChain():
public evaluate(ast: QueryNode): QueryResult {
  const fast = this.evaluateSimpleChain(ast);
  if (fast) return fast;

  const wildcard = this.evaluateWildcardChainFastPath(ast);  // NEW
  if (wildcard) return wildcard;                              // NEW

  const results = Array.from(this.stream(ast));
  // ... rest
}
```

**Testing:**

1. Run evaluator tests: `pnpm --filter @jsonpath/evaluator test`
2. Run benchmarks: `pnpm --filter @jsonpath/benchmarks bench src/query-fundamentals.bench.ts`
3. Verify wildcard queries improve to **1.5M+ ops/s** (outperforming jsonpath-plus's 1.13M)
4. Add unit tests for:
   - `$[*]` - root array wildcard
   - `$.prop[*]` - nested wildcard
   - `$[*].prop` - wildcard then property
   - `$.a[*].b[*].c` - multiple wildcards in chain

**Expected Impact:** 10x+ improvement on wildcard queries, achieving **1.5M+ ops/s** to outperform jsonpath-plus (1.13M ops/s)

---

### Step 2: Inline Limit Checking in Hot Paths

**Files:**

- `packages/jsonpath/evaluator/src/evaluator.ts`

**What:**
Replace `this.checkLimits()` function calls in tight loops with inline conditional checks to eliminate function call overhead.

**Changes:**

```typescript
// In WildcardSelector, SliceSelector, FilterSelector cases:
// Replace:
this.checkLimits(result._depth ?? 0);

// With inline check:
if (++this.nodesVisited > this.options.maxNodes) {
	throw new JSONPathLimitError(
		`Maximum nodes exceeded: ${this.options.maxNodes}`,
	);
}
// Keep timeout check in separate method for less frequent calls
```

**Testing:**

1. Run evaluator tests
2. Run benchmarks to verify 5-10% improvement
3. Ensure limit errors still thrown correctly

**Expected Impact:** 5-10% improvement in tight loops

---

### Step 3: Skip Security Checks When Unconfigured

**Files:**

- `packages/jsonpath/evaluator/src/evaluator.ts`

**What:**
Add a compile-time boolean flag to completely bypass security checks when no `allowPaths` or `blockPaths` are configured (the 99% case).

**Changes:**

```typescript
// In constructor
private readonly securityEnabled: boolean;

constructor(root: any, options?: EvaluatorOptions) {
  // ...
  this.securityEnabled =
    (options?.secure?.allowPaths?.length ?? 0) > 0 ||
    (options?.secure?.blockPaths?.length ?? 0) > 0;
}

// In streamSelector cases, use early check:
case NodeType.WildcardSelector:
  for (let i = 0; i < val.length; i++) {
    const result = this.pool.acquire({...});
    // Only check if security is enabled
    if (this.securityEnabled && !this.isNodeAllowed(result)) continue;
    yield result;
  }
```

**Testing:**

1. Run evaluator tests including security tests
2. Benchmark with and without security options
3. Verify no regression when security is enabled

**Expected Impact:** 10-20% improvement for default usage

---

### Step 4: Enable Compiled Queries by Default in Facade

**Files:**

- `packages/jsonpath/jsonpath/src/facade.ts`
- `packages/jsonpath/jsonpath/src/__tests__/facade.spec.ts`

**What:**
Wire the facade to use `compileQuery()` for all queries by default, leveraging the existing fast-path detection in the compiler.

**Changes:**

```typescript
// Current flow: query() -> evaluator.evaluate() (interpreter)
// New flow: query() -> compileQuery() -> compiled function (with fast path)

export function query(
	root: JsonValue,
	path: string,
	options?: QueryOptions,
): QueryResult {
	const compiled = compileQuery(path, options);
	return compiled(root, withDefaultPlugins(options));
}
```

**Testing:**

1. Run existing unit tests: `pnpm --filter @jsonpath/jsonpath test`
2. Run compliance suite: `pnpm --filter @jsonpath/compliance-suite test`
3. Run benchmarks: `pnpm --filter @jsonpath/benchmarks bench --testNamePattern="Fundamentals"`
4. Verify simple queries are 2-4x faster

---

## Phase 2: Core Optimizations (Steps 5-8)

### Step 5: Add Fast-Path to Evaluator for Non-Compiled Usage

**Files:**

- `packages/jsonpath/evaluator/src/evaluator.ts`
- `packages/jsonpath/evaluator/src/__tests__/evaluator.spec.ts`

**What:**
Extend the existing `evaluateSimpleChain()` method to handle more patterns. This is already partially implemented, ensure it's used consistently.

**Testing:**

1. Run evaluator unit tests
2. Verify simple queries use fast path

---

### Step 6: Batch Wildcard Collection

**Files:**

- `packages/jsonpath/evaluator/src/evaluator.ts`
- `packages/jsonpath/evaluator/src/query-result-pool.ts`

**What:**
For large arrays, instead of yielding one element at a time (O(n) generator suspensions), collect results in batches of 100+ elements and yield the entire batch. This reduces generator overhead from O(n) to O(n/batchSize).

**Changes:**

```typescript
// Add to Evaluator class
private readonly BATCH_THRESHOLD = 50;  // Use batching for arrays > 50 elements

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
      yield [...batch];
      batch.length = 0;
    }
  }

  if (batch.length > 0) yield batch;
}

// In WildcardSelector case, use batching for large arrays:
case NodeType.WildcardSelector:
  if (Array.isArray(val) && val.length > this.BATCH_THRESHOLD) {
    for (const batch of this.streamWildcardBatched(node)) {
      for (const result of batch) {
        if (!this.securityEnabled || this.isNodeAllowed(result)) {
          yield result;
        }
      }
    }
  } else {
    // Existing per-element iteration for small arrays
  }
```

**Testing:**

1. Run evaluator tests
2. Run scale-testing benchmarks: `pnpm --filter @jsonpath/benchmarks bench src/scale-testing.bench.ts`
3. Verify improvement from ~1.3K to ~5K+ ops/s on 1K arrays

**Expected Impact:** 2-3x improvement for large array operations

---

### Step 7: Implement Compile-Time Function Resolution

**Files:**

- `packages/jsonpath/parser/src/parser.ts`
- `packages/jsonpath/parser/src/nodes.ts`
- `packages/jsonpath/evaluator/src/evaluator.ts`
- `packages/jsonpath/functions/src/registry.ts`

**What:**
Move function resolution from runtime to parse/compile time by storing resolved function references in AST nodes.

**Changes:**

```typescript
// In parser.ts - after parsing function call
case NodeType.FunctionCall: {
  const fnDef = getFunction(expr.name);
  if (fnDef) {
    (expr as any)._resolvedFn = fnDef;
  }
  return expr;
}

// In evaluator.ts - use pre-resolved function
private evaluateFunctionCall(node: FunctionCallNode): any {
  const fn = (node as any)._resolvedFn ?? getFunction(node.name);
  // ... rest of evaluation
}
```

**Testing:**

1. Run parser tests
2. Run function tests: `pnpm --filter @jsonpath/functions test`
3. Run filter expression benchmarks
4. Verify 10-30% improvement in filter-heavy queries

---

### Step 8: Lazy Generator Conversion

**Files:**

- `packages/jsonpath/evaluator/src/evaluator.ts`
- `packages/jsonpath/evaluator/src/options.ts`

**What:**
Generators have inherent overhead. Only use them when streaming is actually needed (explicit stream mode or limit option). For standard queries, use direct iteration loops.

**Changes:**

```typescript
// In options.ts - add explicit stream mode
export interface EvaluatorOptions {
  stream?: boolean;  // Explicit streaming mode
  limit?: number;    // Early termination limit
  // ... existing options
}

// In evaluator.ts
public evaluate(ast: QueryNode, options?: EvaluatorOptions): QueryResult {
  const shouldStream = options?.stream || options?.limit != null;

  if (shouldStream) {
    return this.evaluateStreaming(ast, options);
  }

  // Non-streaming: direct loop collection
  return this.evaluateEager(ast);
}

private evaluateEager(ast: QueryNode): QueryResult {
  const results: QueryResultNode[] = [];
  let current: QueryResultNode[] = [{ value: this.root, root: this.root }];

  for (const segment of ast.segments) {
    current = this.processSegmentEager(segment, current);
  }

  return new QueryResult(current);
}
```

**Testing:**

1. Run all evaluator tests
2. Compare streaming vs eager benchmarks
3. Verify 20-40% improvement for non-streaming queries

---

## Phase 3: Package-Specific Optimizations (Steps 9-11)

### Step 9: Optimize @jsonpath/patch Performance

**Files:**

- `packages/jsonpath/patch/src/patch.ts`
- `packages/jsonpath/patch/src/operations.ts`
- `packages/jsonpath/patch/src/__tests__/patch.spec.ts`
- Internal consumers (benchmarks, tests) must be updated

**What:**
Optimize patch operations by:

1. Default to in-place mutation (`mutate: true`) instead of cloning
2. Pre-parse paths once instead of per-operation
3. Skip validation by default (already implemented, ensure enforced)
4. Use direct property access instead of full pointer resolution
5. Update all internal usages to pass `structuredClone()` when immutability is needed

**Changes:**

```typescript
export interface ApplyOptions {
	mutate?: boolean; // Default: true (changed from false)
	validate?: boolean; // Default: false
	atomicApply?: boolean; // Default: false (skip rollback overhead)
}

export function applyPatch(
	target: JsonValue,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): JsonValue {
	const { mutate = true, validate = false, atomicApply = false } = options;

	// Skip clone when mutating
	let result = mutate ? target : structuredClone(target);

	// Pre-parse all paths upfront
	const parsed = patch.map((op) => ({
		...op,
		_tokens: op.path.split('/').slice(1).map(unescapeJsonPointer),
	}));

	// Apply without rollback overhead when not atomic
	for (const op of parsed) {
		applyOperationFast(result, op);
	}

	return result;
}

// Optimized operation that uses pre-parsed path tokens
function applyOperationFast(target: any, op: ParsedOperation): void {
	const tokens = op._tokens;
	let parent = target;

	// Navigate to parent of target location
	for (let i = 0; i < tokens.length - 1; i++) {
		parent = parent[tokens[i]];
	}

	const lastToken = tokens[tokens.length - 1];

	switch (op.op) {
		case 'add':
		case 'replace':
			parent[lastToken] = op.value;
			break;
		case 'remove':
			if (Array.isArray(parent)) {
				parent.splice(Number(lastToken), 1);
			} else {
				delete parent[lastToken];
			}
			break;
		// ... other operations
	}
}
```

**Testing:**

1. Run patch unit tests with new defaults
2. Run RFC 6902 benchmarks
3. Target: within 1.5x of fast-json-patch performance

---

### Step 10: Optimize @jsonpath/merge-patch Apply Performance

**Files:**

- `packages/jsonpath/merge-patch/src/merge-patch.ts`
- `packages/jsonpath/merge-patch/src/__tests__/merge-patch.spec.ts`

**What:**
Optimize the apply function by:

1. Eliminate intermediate object creation
2. Use direct property iteration
3. Reduce function call overhead in recursive path

**Changes:**

```typescript
export function apply(target: JsonValue, patch: JsonValue): JsonValue {
	// Non-object patch replaces entirely
	if (!isPlainObject(patch)) {
		return patch;
	}

	// Non-object target gets replaced with merged object
	if (!isPlainObject(target)) {
		target = {};
	}

	// Direct iteration - no Object.keys() overhead
	for (const key in patch) {
		if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;

		const patchValue = patch[key];

		if (patchValue === null) {
			delete (target as Record<string, unknown>)[key];
		} else if (
			isPlainObject(patchValue) &&
			isPlainObject((target as any)[key])
		) {
			// Recursive in-place merge
			apply((target as any)[key], patchValue);
		} else {
			(target as Record<string, unknown>)[key] = patchValue;
		}
	}

	return target;
}

// Inline isPlainObject check to avoid function call overhead
function isPlainObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}
```

**Testing:**

1. Run merge-patch unit tests
2. Run RFC 7386 benchmarks with increased iterations for stability
3. Target: within 1.5x of json-merge-patch

---

### Step 11: Reduce Object Allocations in Hot Paths

**Files:**

- `packages/jsonpath/evaluator/src/query-result-pool.ts`
- `packages/jsonpath/evaluator/src/evaluator.ts`
- `packages/jsonpath/core/src/types.ts`

**What:**
The QueryResultPool adds overhead for small operations. Optimize by:

1. Removing pool for simple results (overhead exceeds benefit)
2. Using plain objects instead of class instances where possible
3. Reusing path arrays instead of creating new ones

**Changes:**

```typescript
// Use plain objects instead of pooled class instances for simple results
interface QueryResultNode {
  value: JsonValue;
  path: PathSegment[];
  root: JsonValue;
}

// Reuse path array references where possible
private evaluateSimplePath(ast: QueryNode): QueryResult {
  let value = this.root;
  // Reuse single path array, only copy when returning
  const path: PathSegment[] = [];

  // ... evaluation ...

  // Only create result object at the end
  return new QueryResult([{ value, path, root: this.root }]);
}
```

**Testing:**

1. Run memory profiling benchmarks
2. Compare allocation counts before/after
3. Verify no regression in streaming scenarios

---

## Phase 4: Architectural Improvements (Steps 12-14)

### Step 12: Optimize Recursive Descent

**Files:**

- `packages/jsonpath/evaluator/src/evaluator.ts`
- `packages/jsonpath/evaluator/src/segments/descendant.ts` (if exists, or create)

**What:**
Recursive descent (`..`) is currently one of the slowest operations. Optimize with:

1. Dedicated DFS algorithm avoiding generator overhead
2. Skip intermediate result collection
3. Early termination when possible

**Changes:**

```typescript
private evaluateDescendantEager(
  segment: DescendantSegment,
  node: QueryResultNode
): QueryResultNode[] {
  const results: QueryResultNode[] = [];
  const stack: Array<[value: any, path: PathSegment[]]> = [[node.value, []]];

  while (stack.length > 0) {
    const [current, currentPath] = stack.pop()!;

    // Apply selectors to current node
    for (const selector of segment.selectors) {
      const matches = this.applySelector(selector, current, currentPath);
      results.push(...matches);
    }

    // Add children to stack (DFS)
    if (Array.isArray(current)) {
      for (let i = current.length - 1; i >= 0; i--) {
        stack.push([current[i], [...currentPath, i]]);
      }
    } else if (current !== null && typeof current === 'object') {
      const keys = Object.keys(current);
      for (let i = keys.length - 1; i >= 0; i--) {
        stack.push([current[keys[i]], [...currentPath, keys[i]]]);
      }
    }
  }

  return results;
}
```

**Testing:**

1. Run recursive descent benchmarks
2. Target: **7x improvement to 500K+ ops/s** (outperforming jsonpath-plus 348K)
3. Verify correctness with compliance suite

---

### Step 13: Add Performance Regression Tests

**Files:**

- `packages/jsonpath/benchmarks/src/__tests__/regression.spec.ts` (new)
- `packages/jsonpath/benchmarks/baseline.json` (new)
- `packages/jsonpath/benchmarks/vitest.config.ts`

**What:**
Add automated performance regression detection to CI:

1. Store baseline performance numbers
2. Compare against baseline on each run
3. **Warn (non-blocking)** if performance degrades by more than 10%

**Changes:**

```typescript
// regression.spec.ts
import { describe, it, expect } from 'vitest';
import baseline from '../baseline.json';

describe('Performance Regression', () => {
  it('simple query should not regress', async () => {
    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      queryValues(STORE_DATA, '$.store.book[0].title');
    }
    const elapsed = performance.now() - start;
    const opsPerSec = 10000 / (elapsed / 1000);

    const threshold = baseline.simpleQuery.opsPerSec * 0.9;
    if (opsPerSec < threshold) {
      console.warn(`⚠️ Performance regression detected: ${opsPerSec.toFixed(0)} ops/s < ${threshold.toFixed(0)} ops/s baseline`);
    }
    // Non-blocking: always pass, just warn
    expect(true).toBe(true);
  });
});

// baseline.json
{
  "simpleQuery": { "opsPerSec": 300000 },
  "filterQuery": { "opsPerSec": 80000 },
  "recursiveQuery": { "opsPerSec": 50000 }
}
```

**Testing:**

1. Run regression tests
2. Verify baseline capture works
3. Verify detection of intentional regression

---

### Step 14: Update Documentation and Benchmarks

**Files:**

- `packages/jsonpath/benchmarks/AUDIT_REPORT.md`
- `packages/jsonpath/benchmarks/README.md`
- `packages/jsonpath/jsonpath/README.md`
- `docs/api/jsonpath.md`

**What:**

1. Update AUDIT_REPORT with post-optimization results
2. Document new options (mutate, stream, etc.)
3. Add performance tuning guide
4. Update benchmark README with optimization notes

**Testing:**

1. Run full benchmark suite
2. Capture final performance numbers
3. Verify documentation accuracy

---

## Summary

| Step | Phase      | Expected Impact               | Package               |
| ---- | ---------- | ----------------------------- | --------------------- |
| 1    | Quick Wins | **10x+ faster wildcards ⭐**  | @jsonpath/evaluator   |
| 2    | Quick Wins | 5-10% faster loops            | @jsonpath/evaluator   |
| 3    | Quick Wins | 10-20% faster (default)       | @jsonpath/evaluator   |
| 4    | Quick Wins | 2-4x faster simple queries    | @jsonpath/jsonpath    |
| 5    | Core       | Ensure fast path used         | @jsonpath/evaluator   |
| 6    | Core       | 2-3x faster large arrays      | @jsonpath/evaluator   |
| 7    | Core       | 10-30% faster filters         | parser/evaluator      |
| 8    | Core       | 20-40% faster non-streaming   | @jsonpath/evaluator   |
| 9    | Package    | **2-3x faster patch**         | @jsonpath/patch       |
| 10   | Package    | **1.5-2x faster merge-patch** | @jsonpath/merge-patch |
| 11   | Package    | 10-20% faster                 | evaluator/core        |
| 12   | Arch       | **5-7x faster `$..`**         | @jsonpath/evaluator   |
| 13   | Arch       | CI regression detection       | benchmarks            |
| 14   | Arch       | Documentation                 | docs                  |

## Rollback Plan

Each step is independent and can be reverted individually:

- **Phase 1 (Steps 1-4):** Revert fast path additions
- **Phase 2 (Steps 5-8):** Revert core optimizations
- **Phase 3 (Steps 9-11):** Revert package-specific changes
- **Phase 4 (Steps 12-14):** Non-functional, safe to revert

## Success Criteria

**Goal: Outperform all existing JSONPath implementations**

- [ ] Wildcards: From 145K → **1.5M+ ops/s** (10x+ improvement, beats jsonpath-plus 1.13M)
- [ ] Recursive: From 74K → **500K+ ops/s** (7x improvement, beats jsonpath-plus 348K)
- [ ] Large arrays: From 1.3K → **15K+ ops/s** (11x improvement, beats jsonpath-plus 10.5K)
- [ ] Simple paths: Maintain 2.24M+ ops/s (no regression)
- [ ] Pointer: Maintain 2.66M+ ops/s (no regression)
- [ ] Patch: From 89K → **250K+ ops/s** (2.8x improvement, beats fast-json-patch 190K)
- [ ] Merge-patch: From 187K → **250K+ ops/s** (1.3x improvement)
- [ ] All RFC compliance tests passing
- [ ] No memory leaks or regressions in streaming mode
- [ ] Performance regression tests in CI (warn-only, non-blocking)
- [ ] Documentation updated with optimization notes
