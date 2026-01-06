# JSONPath Performance Optimization

**Branch:** `feat/jsonpath-performance-optimization`
**Description:** Optimize @jsonpath packages to achieve performance parity with jsonpath-plus, fast-json-patch, and json-merge-patch.

## Goal

Close the performance gap identified in the benchmark audit:

- **@jsonpath/jsonpath**: Currently 4-12x slower than jsonpath-plus → Target: within 2x
- **@jsonpath/patch**: Currently 2.2x slower than fast-json-patch → Target: within 1.5x
- **@jsonpath/merge-patch apply**: Currently 2.6x slower → Target: within 1.5x

These optimizations will make the @jsonpath suite competitive with existing solutions while maintaining RFC compliance and the enhanced feature set.

---

## Design Decisions

The following decisions were made during planning:

| Decision                      | Choice                           | Rationale                                                                                         |
| ----------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Breaking Changes**          | ✅ Acceptable                    | Breaking changes (e.g., `mutate: true` default) are acceptable as long as internal usage is fixed |
| **Streaming Mode**            | Fully supported, not default     | Streaming remains available via `{ stream: true }` but eager evaluation is default                |
| **Compliance vs Performance** | Performance first, opt-in strict | Prioritize performance; strict RFC mode available via options                                     |
| **AST Modification**          | ✅ Acceptable                    | Parser may store resolved function references directly in AST nodes                               |
| **Regression Tests**          | Warn only (non-blocking)         | CI warns on performance regression but does not block PRs                                         |

---

## Implementation Steps

### Step 1: Enable Compiled Queries by Default in Facade

**Files:**

- `packages/jsonpath/jsonpath/src/facade.ts`
- `packages/jsonpath/jsonpath/src/__tests__/facade.spec.ts`

**What:**
The compiler already has a fast-path implementation in `generators.ts` that detects simple `$.a.b.c[0]` patterns and generates direct property access code. However, the facade doesn't use compiled queries by default—it uses the interpreter. Wire the facade to use `compileQuery()` for all queries, leveraging the existing fast-path detection.

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

### Step 2: Add Fast-Path to Evaluator for Non-Compiled Usage

**Files:**

- `packages/jsonpath/evaluator/src/evaluator.ts`
- `packages/jsonpath/evaluator/src/__tests__/evaluator.spec.ts`

**What:**
For cases where the evaluator is used directly (not through the compiler), add inline fast-path detection for simple property chains. This avoids generator overhead for the most common query patterns.

**Changes:**

```typescript
public evaluate(ast: QueryNode): QueryResult {
  // Fast path: simple property/index chains without filters, wildcards, or recursion
  if (this.isSimplePath(ast)) {
    return this.evaluateSimplePath(ast);
  }
  // Full evaluation with generators
  return this.evaluateFull(ast);
}

private isSimplePath(ast: QueryNode): boolean {
  return ast.segments.every(seg =>
    seg.type === NodeType.ChildSegment &&
    seg.selectors.length === 1 &&
    (seg.selectors[0].type === NodeType.NameSelector ||
     seg.selectors[0].type === NodeType.IndexSelector)
  );
}

private evaluateSimplePath(ast: QueryNode): QueryResult {
  let value = this.root;
  const path: PathSegment[] = [];

  for (const segment of ast.segments) {
    const selector = segment.selectors[0];
    if (selector.type === NodeType.NameSelector) {
      if (value == null || typeof value !== 'object') return emptyResult();
      path.push(selector.name);
      value = value[selector.name];
    } else { // IndexSelector
      if (!Array.isArray(value)) return emptyResult();
      const idx = selector.index < 0 ? value.length + selector.index : selector.index;
      path.push(idx);
      value = value[idx];
    }
  }

  return new QueryResult([{ value, path, root: this.root }]);
}
```

**Testing:**

1. Run evaluator unit tests
2. Run benchmarks comparing interpreter vs compiled paths
3. Verify 3-5x improvement for simple queries via evaluator

---

### Step 3: Implement Compile-Time Function Resolution

**Files:**

- `packages/jsonpath/parser/src/parser.ts`
- `packages/jsonpath/parser/src/nodes.ts`
- `packages/jsonpath/evaluator/src/evaluator.ts`
- `packages/jsonpath/functions/src/registry.ts`

**What:**
Currently, functions like `length()`, `match()`, `search()` are resolved at runtime during filter evaluation via `getFunction()`. Move function resolution to parse/compile time by storing resolved function references in AST nodes, eliminating repeated registry lookups.

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

### Step 4: Lazy Generator Conversion

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

### Step 5: Optimize @jsonpath/patch Performance

**Files:**

- `packages/jsonpath/patch/src/patch.ts`
- `packages/jsonpath/patch/src/operations.ts`
- `packages/jsonpath/patch/src/__tests__/patch.spec.ts`
- Internal consumers (benchmarks, tests) must be updated

**What:**
Optimize patch operations by:

1. Default to in-place mutation (`mutate: true`) instead of cloning — **BREAKING CHANGE**
2. Pre-parse paths once instead of per-operation
3. Skip validation by default (already implemented, ensure enforced)
4. Use direct property access instead of full pointer resolution
5. Update all internal usages to pass `structuredClone()` when immutability is needed

**Breaking Change Migration:**

```typescript
// Before (implicit clone)
const result = applyPatch(target, patch);

// After (explicit clone if needed)
const result = applyPatch(structuredClone(target), patch);
// OR use option
const result = applyPatch(target, patch, { mutate: false });
```

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

### Step 6: Optimize @jsonpath/merge-patch Apply Performance

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

### Step 7: Reduce Object Allocations in Hot Paths

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

### Step 8: Optimize Recursive Descent

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
2. Target: 3-5x improvement over current implementation
3. Verify correctness with compliance suite

---

### Step 9: Add Performance Regression Tests

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

### Step 10: Update Documentation and Benchmarks

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

| Step | Priority | Expected Impact             | Package               |
| ---- | -------- | --------------------------- | --------------------- |
| 1    | P0       | 2-4x faster simple queries  | @jsonpath/jsonpath    |
| 2    | P1       | 3-5x faster evaluator       | @jsonpath/evaluator   |
| 3    | P1       | 10-30% faster filters       | parser/evaluator      |
| 4    | P1       | 20-40% faster non-streaming | @jsonpath/evaluator   |
| 5    | P1       | 1.5-2x faster patch         | @jsonpath/patch       |
| 6    | P1       | 1.5-2x faster merge-patch   | @jsonpath/merge-patch |
| 7    | P2       | 10-20% faster               | evaluator/core        |
| 8    | P2       | 3-5x faster `..`            | @jsonpath/evaluator   |
| 9    | P2       | CI safety                   | benchmarks            |
| 10   | P2       | Documentation               | docs                  |

## Rollback Plan

Each step is independent and can be reverted individually:

- Steps 1-4: Revert to interpreter-based evaluation
- Steps 5-6: Revert default options
- Steps 7-8: Revert optimization code paths
- Steps 9-10: Non-functional, safe to revert

## Success Criteria

- [ ] @jsonpath/jsonpath within 2x of jsonpath-plus (currently 4-12x)
- [ ] @jsonpath/patch within 1.5x of fast-json-patch (currently 2.2x)
- [ ] @jsonpath/merge-patch within 1.5x of json-merge-patch (currently 2.6x)
- [ ] All compliance tests passing
- [ ] No memory leaks or regressions in streaming mode
- [ ] Performance regression tests in CI (warn-only, non-blocking)
- [ ] All internal usages updated for breaking changes
- [ ] Documentation updated with new defaults and migration guide
