# @jsonpath/\* Performance Analysis Report

## Executive Summary

This report analyzes performance bottlenecks in the `@jsonpath/*` suite compared to existing libraries (`jsonpath`, `jsonpath-plus`). Through code analysis and benchmarking, several **critical issues** have been identified that significantly impact performance.

### Current Benchmark Status (After Fixes)

| Benchmark         | @jsonpath/jsonpath | jsonpath     | jsonpath-plus | Status                       |
| ----------------- | ------------------ | ------------ | ------------- | ---------------------------- |
| Basic Query       | 25,521 ops/s       | 23,031 ops/s | 85,665 ops/s  | ✅ **Faster than jsonpath**  |
| Filter Query      | 10,182 ops/s       | 33,329 ops/s | 26,381 ops/s  | ⚠️ 3.3x slower than jsonpath |
| Compiled (cached) | 13,211 ops/s       | -            | -             | ✅ Available                 |
| Interpreted       | 2,887 ops/s        | -            | -             | Reference                    |

### Key Findings

1. **✅ FIXED: Debug console.log in production code** - Removed, significant improvement achieved
2. **Query compilation available but not default** - 4.5x faster when using compiled queries
3. **Filter performance gap** - 3.3x slower than jsonpath for filter expressions

**Remaining Optimization Opportunities:**

- Enable compiled queries by default for repeated queries
- Reduce object allocation in evaluator (path arrays, result objects)
- Optimize type-checking in filter expressions

---

## Issues Fixed

### 1. Console.log in Production Code (FIXED) ✅

**Location:** [evaluator/src/evaluator.ts#L506](evaluator/src/evaluator.ts#L506)

**Before (problematic):**

```typescript
private evaluateFilter(
    expr: ExpressionNode,
    current: QueryResultNode,
): boolean {
    const result = this.evaluateExpression(expr, current);
    const truthy = this.isTruthy(result);
    console.log(
        'Filter:',
        JSON.stringify(expr).slice(0, 100),
        'Truthy:',
        truthy,
    );  // ❌ CRITICAL: Called for every element!
    return truthy;
}
```

**After (fixed):**

```typescript
private evaluateFilter(
    expr: ExpressionNode,
    current: QueryResultNode,
): boolean {
    return this.isTruthy(this.evaluateExpression(expr, current));
}
```

**Impact:** Removed O(n) JSON.stringify calls per filter operation. This was the primary cause of the dramatic slowdown.

---

## Remaining High-Impact Issues

### 2. Excessive Path Array Allocation

**Location:** [evaluator/src/evaluator.ts](evaluator/src/evaluator.ts) - Multiple locations

Every time a node is visited, a new path array is created:

This happens in:

- `streamDescendants` (lines 160-165, 169-174)
- `streamSelector` NameSelector (lines 207-213)
- `streamSelector` IndexSelector (lines 228-234)
- `streamSelector` WildcardSelector (lines 296-302, 309-315)
- `streamSelector` SliceSelector (lines 335-341, 359-365)
- `streamSelector` FilterSelector (lines 381-387, 395-401)

**Impact:** For a query like `$..*.title` on a large object, thousands of array allocations occur, triggering GC pressure.

**Solution A (Quick Win): Lazy path computation**

```typescript
interface QueryResultNode {
	value: any;
	getPath(): PathSegment[]; // Compute only when needed
	root: any;
	parent?: any;
	parentKey?: PathSegment;
}
```

**Solution B (Best Performance): Reuse path arrays with mutation**

```typescript
// Use a stack-based approach
private pathStack: PathSegment[] = [];

private *streamWithPath(...) {
    this.pathStack.push(segment);
    yield* this.doWork();
    this.pathStack.pop();
}
```

### 4. Object Allocation for Every Result Node

Each selector creates a full result object:

```typescript
const result = {
	value: val[i],
	path: [...node.path, i],
	root: node.root, // ❌ Always references same root
	parent: val,
	parentKey: i,
};
```

**Solution: Use a pooled/reusable node structure**

```typescript
class QueryResultPool {
	private pool: QueryResultNode[] = [];
	private index = 0;

	acquire(
		value: any,
		path: PathSegment[],
		parent: any,
		key: PathSegment,
	): QueryResultNode {
		if (this.index >= this.pool.length) {
			this.pool.push({
				value: null,
				path: [],
				root: null,
				parent: null,
				parentKey: null,
			});
		}
		const node = this.pool[this.index++];
		node.value = value;
		node.path = path;
		// ... assign other fields
		return node;
	}

	reset() {
		this.index = 0;
	}
}
```

### 5. Type Checking Overhead in Filter Expressions

**Location:** [evaluator/src/evaluator.ts#L640-L670](evaluator/src/evaluator.ts#L640-L670)

Every filter evaluation does extensive runtime type checking:

```typescript
const isNodeList = arg && typeof arg === 'object' && arg.__isNodeList === true;

if (paramType === 'NodesType') {
	if (!isNodeList) return Nothing;
	processedArgs.push(arg.nodes);
} else if (paramType === 'LogicalType') {
	processedArgs.push(this.isTruthy(arg));
} else {
	// ValueType - more branches...
}
```

**Solution: Type discrimination at parse time**
Pre-compute argument types in the AST during parsing, reducing runtime checks.

### 6. Lexer Tokenizes Entire Input Upfront

**Location:** [lexer/src/lexer.ts#L31](lexer/src/lexer.ts#L31)

```typescript
constructor(public readonly input: string) {
    this.tokenizeAll();  // ❌ Tokenizes everything before parsing starts
}
```

**Impact:** For simple queries, this is wasteful. For complex queries with errors, work is wasted on tokens after the error.

**Solution: Lazy tokenization**

```typescript
constructor(public readonly input: string) {
    // Don't tokenize here
}

public next(): Token {
    if (this.tokenIndex < this.tokens.length) {
        return this.tokens[this.tokenIndex++];
    }
    return this.tokenizeNext();  // On-demand
}
```

### 7. isPathAllowed Called Even When No Restrictions

**Location:** [evaluator/src/evaluator.ts#L460-L499](evaluator/src/evaluator.ts#L460-L499)

```typescript
private isPathAllowed(path: Path): boolean {
    if (
        this.options.secure.blockPaths!.length === 0 &&
        this.options.secure.allowPaths!.length === 0
    ) {
        return true;  // ✓ Early exit, but...
    }

    const pointer =
        path.length === 0
            ? '/'
            : `/${path
                    .map((s) => String(s).replace(/~/g, '~0').replace(/\//g, '~1'))
                    .join('/')}`;  // ❌ Expensive string operations
```

**Issue:** The function is called on every node even when no restrictions exist. The early return helps, but the function call overhead adds up.

**Solution: Compile the check at construction**

```typescript
private isPathAllowedFn: (path: Path) => boolean;

constructor(root: any, options?: EvaluatorOptions) {
    // ...
    if (this.options.secure.blockPaths!.length === 0 &&
        this.options.secure.allowPaths!.length === 0) {
        this.isPathAllowedFn = () => true;  // No-op
    } else {
        this.isPathAllowedFn = this.checkPathRestrictions.bind(this);
    }
}
```

### 8. deepEqual Implementation Could Use Object.is

**Location:** [evaluator/src/evaluator.ts#L792-L820](evaluator/src/evaluator.ts#L792-L820)

```typescript
private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;  // ✓ Good start
    // ... rest of implementation
}
```

**Improvement:** Use `Object.is()` for NaN handling and -0/+0 distinction if needed.

---

## Medium-Impact Issues

### 9. New AbortController Created Per Query

**Location:** [evaluator/src/options.ts#L32](evaluator/src/options.ts#L32)

```typescript
export function withDefaults(
	options?: EvaluatorOptions,
): Required<EvaluatorOptions> {
	return {
		...DEFAULT_EVALUATOR_OPTIONS,
		signal: options?.signal ?? new AbortController().signal, // ❌ Allocation
		// ...
	};
}
```

**Solution:** Use a singleton noop signal.

### 10. String Slicing in Lexer

**Location:** [lexer/src/lexer.ts#L276](lexer/src/lexer.ts#L276)

```typescript
const raw = this.input.slice(start, this.pos);
return this.createToken(TokenType.STRING, value, start, line, col, raw);
```

**Issue:** `slice()` creates a new string allocation. For frequently used queries, this adds up.

**Solution:** Store start/end positions instead of sliced strings where possible.

### 11. Regex in String Escape Handling

**Location:** [lexer/src/lexer.ts#L300-L302](lexer/src/lexer.ts#L300-L302)

```typescript
if (/^[0-9a-fA-F]{4}$/.test(hex)) {
```

**Issue:** Regex compilation has overhead. For hot paths, use character code checks.

**Solution:**

```typescript
function isHexQuad(s: string): boolean {
	if (s.length !== 4) return false;
	for (let i = 0; i < 4; i++) {
		const c = s.charCodeAt(i);
		if (
			!((c >= 48 && c <= 57) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102))
		) {
			return false;
		}
	}
	return true;
}
```

---

## Architectural Recommendations

### 1. Query Compilation (High Priority)

The current `@jsonpath/compiler` package generates JavaScript functions but isn't used by default in the facade.

**Current Flow:**

```
query string → parse → AST → interpret (slow)
```

**Optimized Flow:**

```
query string → parse → AST → compile → cached function → execute (fast)
```

**Implementation:**

```typescript
// In facade.ts
const compiledCache = new Map<string, CompiledQuery>();

export function query(
	root: any,
	path: string,
	options?: EvaluatorOptions,
): QueryResult {
	let compiled = compiledCache.get(path);
	if (!compiled) {
		const ast = parseQuery(path, options);
		compiled = compile(ast);
		compiledCache.set(path, compiled);
	}
	return compiled(root, options);
}
```

### 2. Monomorphic Code Paths

Based on V8 optimization principles from the research:

**Issue:** The evaluator has polymorphic hot paths due to different selector types.

**Solution:** Use separate, specialized functions for each selector type instead of a giant switch statement:

```typescript
private readonly selectorHandlers = {
    [NodeType.NameSelector]: this.handleNameSelector.bind(this),
    [NodeType.IndexSelector]: this.handleIndexSelector.bind(this),
    [NodeType.WildcardSelector]: this.handleWildcardSelector.bind(this),
    // ...
};

private *streamSelector(selector: SelectorNode, node: QueryResultNode): Generator<QueryResultNode> {
    yield* this.selectorHandlers[selector.type](selector, node);
}
```

### 3. Typed Arrays for Large Result Sets

For operations on large arrays (>1000 elements), consider using typed arrays for paths:

```typescript
// Instead of: path = [...parentPath, index]
// Use a compact representation
class CompactPath {
	private segments: Int32Array;
	private length: number;

	push(segment: number | string): void {
		/* ... */
	}
	toArray(): PathSegment[] {
		/* materialize only when needed */
	}
}
```

### 4. Avoid Creating Closures in Hot Paths

**Issue:** Some iterator patterns create closures on each invocation.

**Before:**

```typescript
private *streamSelectors(selectors: SelectorNode[], node: QueryResultNode) {
    for (const selector of selectors) {
        yield* this.streamSelector(selector, node);  // OK
    }
}
```

**Ensure:** No inline arrow functions are created in loops.

---

## Comparison with Competitors

| Feature           | @jsonpath               | jsonpath | jsonpath-plus        |
| ----------------- | ----------------------- | -------- | -------------------- |
| Lazy tokenization | No                      | Yes      | Yes                  |
| Query caching     | Yes (AST only)          | Yes      | Yes (JSONPath.cache) |
| Compiled queries  | Available (not default) | No       | No                   |
| Filter syntax     | RFC 9535                | Extended | Extended             |
| Bundle size       | Larger (modular)        | Smaller  | Medium               |

**Key insight:** `jsonpath` uses a pre-compiled JISON parser (fast), while `@jsonpath` uses a hand-written Pratt parser (flexible but needs optimization).

---

## Performance Fix Priority

### Immediate (P0)

1. ✅ Remove console.log from evaluator (5 minutes)
2. Enable compiled query caching by default

### Short-term (P1)

3. Lazy path computation
4. Object pooling for result nodes
5. Lazy tokenization in lexer

### Medium-term (P2)

6. Monomorphic selector handlers
7. Compile-time type analysis for filters
8. Typed array paths for large datasets

### Long-term (P3)

9. SIMD optimizations for large array operations
10. WebAssembly for core evaluation loop (if needed)

---

## Benchmark Suggestions

Add these benchmarks to properly measure improvements:

```typescript
// bench/detailed.bench.ts
describe('Detailed Performance', () => {
	bench('parse only (no evaluation)', () => {
		parse('$.store.book[?(@.price < 50)].title');
	});

	bench('parse + compile', () => {
		const ast = parse('$.store.book[?(@.price < 50)].title');
		compile(ast);
	});

	bench('compiled execution only', () => {
		compiledQuery(largeData); // Pre-compiled
	});

	bench('filter with simple comparison', () => {
		queryValues(data, '$.items[?(@.id == 1)]');
	});

	bench('filter with function call', () => {
		queryValues(data, '$.items[?length(@.name) > 5]');
	});

	bench('deep recursive descent', () => {
		queryValues(deepNestedData, '$..*');
	});
});
```

---

## Conclusion

The `@jsonpath/*` implementation has strong RFC 9535 compliance and a clean modular architecture, but performance has been sacrificed for correctness and flexibility. The **immediate priority** is removing the debug console.log, which alone should bring performance close to competitors.

Further optimizations around object allocation, query compilation by default, and monomorphic code paths should make `@jsonpath` **competitive or faster** than existing libraries while maintaining its RFC compliance advantage.

---

_Report generated: January 5, 2026_
_Author: Performance Analysis Agent_
