# JSONPath Performance Optimization

**Branch:** `perf/jsonpath-optimization`
**Description:** Comprehensive performance improvements for `@jsonpath/*` packages to achieve parity with or exceed competitor libraries.

## Goal

Optimize the `@jsonpath/*` suite to close the **3.3x performance gap** on filter queries compared to `jsonpath`, while maintaining RFC 9535 compliance. The key strategies are: enabling compiled queries by default, reducing memory allocation pressure, and optimizing hot paths in the evaluator and lexer.

## Current Performance Baseline

| Benchmark         | @jsonpath/jsonpath | jsonpath     | jsonpath-plus | Status                       |
| ----------------- | ------------------ | ------------ | ------------- | ---------------------------- |
| Basic Query       | 25,521 ops/s       | 23,031 ops/s | 85,665 ops/s  | ✅ Faster than jsonpath      |
| Filter Query      | 10,182 ops/s       | 33,329 ops/s | 26,381 ops/s  | ⚠️ 3.3x slower than jsonpath |
| Compiled (cached) | 13,211 ops/s       | -            | -             | ✅ Available but not default |
| Interpreted       | 2,887 ops/s        | -            | -             | Reference                    |

## Target Performance

| Benchmark         | Target       | Improvement |
| ----------------- | ------------ | ----------- |
| Basic Query       | 30,000 ops/s | +17%        |
| Filter Query      | 35,000 ops/s | +243%       |
| Compiled (cached) | 20,000 ops/s | +51%        |

---

## Implementation Steps

### Step 1: Enable Compiled Query Caching by Default (P0)

**Files:**

- `packages/jsonpath/jsonpath/src/facade.ts`
- `packages/jsonpath/jsonpath/src/cache.ts`
- `packages/jsonpath/jsonpath/src/config.ts`
- `packages/jsonpath/compiler/src/options.ts`

**What:** Modify the facade functions to use compiled queries where beneficial. The compiler already exists and provides a **4.5x speedup** but is opt-in. Benchmark each function to determine if caching is worthwhile.

**Implementation Details:**

1. Add configurable `compiledCacheSize: number` to global config (default TBD via benchmarking)
2. Create a `CompiledQueryCache` in `cache.ts` with **configurable LRU size**
3. **Benchmark each facade function** (`query`, `queryValues`, `queryPaths`, `value`, `exists`, `count`) with and without compiled caching:
   - Measure overhead of compilation vs. interpretation for each
   - Determine which functions benefit from caching (likely all repeated-query scenarios)
   - Document findings in benchmark results
4. Enable compiled caching only for functions where benchmarks show net benefit
5. Expose `clearCompiledCache()` for testing and memory management
6. Add `setCompiledCacheSize(size: number)` for user configuration

**Testing:**

- Run benchmarks for each facade function with/without caching
- Document performance delta for each function
- Add unit tests for cache hit/miss behavior
- Add test for `clearCompiledCache()` and `setCompiledCacheSize()`
- Verify memory doesn't grow unbounded with LRU eviction

---

### Step 2: Lazy Path Computation in Evaluator (P1)

**Files:**

- `packages/jsonpath/evaluator/src/evaluator.ts`
- `packages/jsonpath/evaluator/src/query-result.ts`

**What:** The evaluator currently allocates a new array for every produced node (`path: [...node.path, seg]`). Replace eager path arrays with a lazy parent-pointer chain and a cached `path` getter so:

- traversal does **not** allocate path arrays
- callers can still read `node.path` (property) and get the same semantics

**Acceptance Checklist:**

- [ ] `QueryResultNode.path` remains a property (not a function) and returns the same array instance across repeated accesses
- [ ] All `path: [...node.path, ...]` allocations in `streamDescendants()` and `streamSelector()` are removed
- [ ] `.paths()` and `.normalizedPaths()` outputs remain unchanged

**Implementation Notes (match current code):**

- Today `QueryResultNode` is a type alias to `@jsonpath/core`’s query node and the evaluator emits plain object literals with `path: PathSegment[]`.
- Security checks (`isPathAllowed(node.path)`) and limits (`checkLimits(node.path.length, ...)`) currently force eager path materialization.
- We’ll introduce an internal path-chain representation and keep `path` as a cached getter for backward compatibility.

**Code Changes**

1. Replace the `QueryResultNode` export in `query-result.ts` with a lazy-path aware node shape

Replace this:

```ts
export type QueryResultNode<T = unknown> = CoreQueryNode<T>;
```

With this (keep it minimal; underscore fields are internal):

```ts
export interface QueryResultNode<T = unknown> extends CoreQueryNode<T> {
	/**
	 * Lazily materialized and cached path.
	 * Backwards compatible: still accessed as a property.
	 */
	readonly path: PathSegment[];

	/** @internal */
	_pathParent?: QueryResultNode | undefined;
	/** @internal */
	_pathSegment?: PathSegment | undefined;
	/** @internal */
	_cachedPath?: PathSegment[] | undefined;
	/** @internal */
	_cachedPointer?: string | undefined;
	/** @internal */
	_depth?: number | undefined;
}
```

2. Add a tiny helper (or prototype method) to compute/cached path from the parent chain

Add a helper in `query-result.ts` (exported for use by pool/evaluator):

```ts
export function materializePath(node: QueryResultNode): PathSegment[] {
	if (node._cachedPath) return node._cachedPath;

	const segments: PathSegment[] = [];
	let curr: QueryResultNode | undefined = node;
	while (curr && curr._pathSegment !== undefined) {
		segments.push(curr._pathSegment);
		curr = curr._pathParent;
	}
	segments.reverse();
	node._cachedPath = segments;
	return segments;
}
```

If you prefer to keep logic off the public module surface, the exact same logic can live in the pool file as an internal function; the key requirement is: `node.path` must be a cached getter.

3. Change evaluator allocations to stop creating arrays

Every place that currently does `path: [...node.path, seg]` should become “set parent chain + segment” (and a cached getter handles materialization).

Example replacement pattern (applies to all selector cases and recursive descent children):

```ts
// BEFORE
const result = {
	value: child,
	path: [...node.path, seg],
	root: node.root,
	parent: val,
	parentKey: seg,
};
```

```ts
// AFTER (with pool API from Step 3)
const result = this.pool.acquire({
	value: child,
	root: node.root,
	parent: val,
	parentKey: seg,
	pathParent: node,
	pathSegment: seg,
});
```

Also update depth usage in hot paths so we don’t accidentally force `path` materialization just to read `.length`:

```ts
// BEFORE
this.checkLimits(node.path.length, this.resultsFound);

// AFTER
this.checkLimits(node._depth ?? 0, this.resultsFound);
```

**Testing (update/add in evaluator package):**

- [ ] Ensure existing path formatting tests remain: normalized paths in `src/__tests__/evaluator.spec.ts`
- [ ] Add a test asserting `node.path` is stable and cached:
  - `const p1 = node.path; const p2 = node.path; expect(p1).toBe(p2);`
- [ ] Add a test that `.paths()` and `.normalizedPaths()` match expected values (keep assertions small)

**Commit Message:**

- `perf(evaluator): make QueryResultNode paths lazy and cached`

---

### Step 3: Object Pooling for QueryResultNode (P1)

**Files:**

- `packages/jsonpath/evaluator/src/evaluator.ts`
- `packages/jsonpath/evaluator/src/query-result-pool.ts` (new file)

**What:** Introduce a per-evaluator pool to centralize node construction and ensure every node is consistently reset (including the lazy-path caches). The pool should be **reset at the start of every `stream()`**.

Important nuance: because `QueryResult` exposes nodes (and `Evaluator.evaluate()` collects nodes into an array), result nodes must remain stable after a query completes. The pool must not mutate objects that have escaped into a previous `QueryResult`.

**Acceptance Checklist:**

- [ ] Pool is per `Evaluator` instance (preferred)
- [ ] Pool is reset once per `stream(ast)` / `evaluate(ast)` call
- [ ] Lazy-path caches (`_cachedPath`, `_cachedPointer`) are cleared on acquire
- [ ] No reference leakage across queries when reusing the same `Evaluator` instance

**New File:** `packages/jsonpath/evaluator/src/query-result-pool.ts`

Create a pool that:

- builds nodes with a stable shape (monomorphic fields)
- wires up `path` as a getter that calls `materializePath(this)`
- supports two modes:
  - pooled nodes for traversal
  - non-pooled “owned” nodes for final results to avoid cross-query mutation (simplest/safest)

Suggested minimal implementation:

```ts
import type { PathSegment } from '@jsonpath/core';
import type { QueryResultNode } from './query-result.js';
import { materializePath } from './query-result.js';

type AcquireArgs = {
	value: any;
	root: any;
	parent?: any;
	parentKey?: PathSegment;
	pathParent?: QueryResultNode;
	pathSegment?: PathSegment;
};

class PooledNode implements QueryResultNode {
	value: any;
	root: any;
	parent?: any;
	parentKey?: PathSegment;

	_pathParent?: QueryResultNode;
	_pathSegment?: PathSegment;
	_cachedPath?: PathSegment[];
	_cachedPointer?: string;
	_depth?: number;

	get path(): PathSegment[] {
		return materializePath(this);
	}
}

export class QueryResultPool {
	private pool: PooledNode[] = [];
	private index = 0;

	reset(): void {
		this.index = 0;
	}

	acquire(args: AcquireArgs): QueryResultNode {
		let node = this.pool[this.index];
		if (!node) {
			node = new PooledNode();
			this.pool.push(node);
		}
		this.index++;

		node.value = args.value;
		node.root = args.root;
		node.parent = args.parent;
		node.parentKey = args.parentKey;
		node._pathParent = args.pathParent;
		node._pathSegment = args.pathSegment;
		node._cachedPath = undefined;
		node._cachedPointer = undefined;
		node._depth =
			(args.pathParent?._depth ?? 0) + (args.pathSegment === undefined ? 0 : 1);
		return node;
	}

	/**
	 * Use for final result nodes when the same Evaluator instance might be reused.
	 */
	own(args: AcquireArgs): QueryResultNode {
		const node = new PooledNode();
		// same field assignment as acquire()
		node.value = args.value;
		node.root = args.root;
		node.parent = args.parent;
		node.parentKey = args.parentKey;
		node._pathParent = args.pathParent;
		node._pathSegment = args.pathSegment;
		node._depth =
			(args.pathParent?._depth ?? 0) + (args.pathSegment === undefined ? 0 : 1);
		return node;
	}
}
```

**Evaluator wiring (high level):**

- Add `private readonly pool = new QueryResultPool();`
- At the top of `stream(ast)`, call `this.pool.reset()`
- Replace all node object literals in:
  - `stream(ast)` root node creation
  - `streamDescendants()` recursive child creation
  - `streamSelector()` cases: Name/Index/Wildcard/Slice/Filter
  - `evaluateEmbeddedQuery()` root node creation

**Testing (add/adjust):**

- [ ] Add a test that reuses a single `Evaluator` instance across two `evaluate()` calls and asserts nodes from the first result do not change.
  - This catches accidental mutation due to pooled node reuse.

**Commit Message:**

- `perf(evaluator): add QueryResultPool and route node creation through it`

---

### Step 4: Compile-Time Security Check Optimization (P1)

**Files:**

- `packages/jsonpath/evaluator/src/evaluator.ts`

**What:** Optimize the security-path restriction hot path by compiling a node-level predicate in the constructor:

- If `secure.allowPaths` and `secure.blockPaths` are both empty: use a no-op predicate (zero pointer/path work)
- Otherwise: compute pointer strings on-demand _without materializing `node.path`_ and apply allow/block logic

**Acceptance Checklist:**

- [ ] Security predicate is compiled once in the constructor
- [ ] No-op predicate when allow/block are empty
- [ ] When restrictions exist, we avoid calling `node.path` unless strictly needed (build pointer from chain)
- [ ] Existing allow/block behavior remains identical (including root handling)

**Code Changes (replace/introduce functions):**

1. Replace `isPathAllowed(path: Path): boolean` with a node predicate

Replace the current signature:

```ts
private isPathAllowed(path: Path): boolean {
  // ...
}
```

With these members:

```ts
private readonly isNodeAllowed: (node: QueryResultNode) => boolean;

constructor(root: any, options?: EvaluatorOptions) {
  this.root = root;
  this.options = withDefaults(options);

  const { allowPaths, blockPaths } = this.options.secure;
  if (allowPaths.length === 0 && blockPaths.length === 0) {
    this.isNodeAllowed = () => true;
  } else {
    this.isNodeAllowed = (node) => this.checkPathRestrictions(node);
  }
}
```

2. Add `checkPathRestrictions(node)` that uses pointer strings computed from the parent chain

```ts
private checkPathRestrictions(node: QueryResultNode): boolean {
  // Avoid node.path here.
  const pointer = this.pointerStringForNode(node);

  if (this.options.secure.blockPaths.length > 0) {
    for (const blocked of this.options.secure.blockPaths) {
      if (pointer === blocked || pointer.startsWith(`${blocked}/`)) return false;
    }
  }

  if (this.options.secure.allowPaths.length > 0) {
    for (const allowed of this.options.secure.allowPaths) {
      if (
        pointer === allowed ||
        pointer.startsWith(`${allowed}/`) ||
        (allowed.startsWith(pointer) &&
          (pointer === '/' || allowed[pointer.length] === '/'))
      ) {
        return true;
      }
    }
    return false;
  }

  return true;
}
```

3. Add a pointer-string helper that does not materialize `PathSegment[]`

```ts
private pointerStringForNode(node: QueryResultNode): string {
  if (node._cachedPointer) return node._cachedPointer;

  // Root path
  if (node._pathSegment === undefined) {
    node._cachedPointer = '/';
    return '/';
  }

  const segments: PathSegment[] = [];
  let curr: QueryResultNode | undefined = node;
  while (curr && curr._pathSegment !== undefined) {
    segments.push(curr._pathSegment);
    curr = curr._pathParent;
  }

  let out = '';
  for (let i = segments.length - 1; i >= 0; i--) {
    const s = String(segments[i])
      .replace(/~/g, '~0')
      .replace(/\//g, '~1');
    out += `/${s}`;
  }

  node._cachedPointer = out;
  return out;
}
```

4. Update call sites to use the compiled predicate

Replace all:

```ts
if (!this.isPathAllowed(node.path)) return;
```

With:

```ts
if (!this.isNodeAllowed(node)) return;
```

**Testing (existing + add):**

- [ ] Keep existing security allow/block tests in `src/__tests__/security.spec.ts`
- [ ] Add a small regression test ensuring root `allowPaths` still permits walking into allowed descendants (this matches the current `pointer === '/'` behavior)

**Commit Message:**

- `perf(evaluator): compile security predicate and avoid path materialization`

---

### Verification Checklist (Steps 2–4)

- [ ] `pnpm --filter @jsonpath/evaluator test`
- [ ] `pnpm --filter @jsonpath/evaluator type-check`
- [ ] `pnpm --filter @jsonpath/evaluator lint`

---

### Step 5: Lazy Tokenization in Lexer (P1)

**Files:**

- `packages/jsonpath/lexer/src/lexer.ts`

**What:** The lexer currently calls `tokenizeAll()` in the constructor, tokenizing the entire input before parsing begins. For simple queries, this wastes work. For queries with errors, tokens after the error are processed unnecessarily. Implement on-demand tokenization.

**Acceptance Checklist:**

- [ ] Constructor does not eagerly tokenize input
- [ ] `next()` tokenizes on demand and preserves EOF semantics (repeated `next()` after EOF yields EOF)
- [ ] `peek()` tokenizes on demand and does not advance
- [ ] `peekAhead(n)` works for parser usage (e.g. `peekAhead(1)`), and returns EOF when beyond end
- [ ] No duplicate EOF tokens are emitted

**Tasks (checkbox plan):**

- [ ] Remove `tokenizeAll()` call from `constructor`
- [ ] Implement `ensureTokenized(targetIndex)` helper that tokenizes until `tokens[targetIndex]` exists _or_ EOF is reached
- [ ] Refactor the old `tokenizeAll()` loop body into a single-step `tokenizeNext()` method
- [ ] Update `next()`, `peek()`, `peekAhead()` to call `ensureTokenized(...)`
- [ ] Update `isAtEnd()` to be defined in terms of `peek().type === EOF` (no reliance on full token buffer)

**Code Changes (exact blocks)**

1. Update `Lexer` constructor + token accessors

File: `packages/jsonpath/lexer/src/lexer.ts`

Replace the constructor + `next()`/`peek()`/`peekAhead()`/`isAtEnd()` with:

```ts
export class Lexer implements LexerInterface {
	private pos = 0;
	private line = 1;
	private column = 1;
	private tokens: Token[] = [];
	private tokenIndex = 0;

	constructor(public readonly input: string) {}

	public next(): Token {
		this.ensureTokenized(this.tokenIndex);
		return (
			this.tokens[this.tokenIndex++] ?? this.tokens[this.tokens.length - 1]!
		);
	}

	public peek(): Token {
		this.ensureTokenized(this.tokenIndex);
		return this.tokens[this.tokenIndex] ?? this.tokens[this.tokens.length - 1]!;
	}

	public peekAhead(n: number): Token {
		this.ensureTokenized(this.tokenIndex + n);
		return (
			this.tokens[this.tokenIndex + n] ?? this.tokens[this.tokens.length - 1]!
		);
	}

	public isAtEnd(): boolean {
		return this.peek().type === TokenType.EOF;
	}

	public get position(): number {
		return this.pos;
	}

	// ... rest of class
}
```

2. Add `ensureTokenized()` + `tokenizeNext()`

File: `packages/jsonpath/lexer/src/lexer.ts`

Replace `tokenizeAll()` with:

```ts
  private ensureTokenized(targetIndex: number): void {
    while (this.tokens.length <= targetIndex) {
      const lastToken = this.tokens[this.tokens.length - 1];
      if (lastToken?.type === TokenType.EOF) return;
      this.tokenizeNext();
    }
  }

  private tokenizeNext(): void {
    this.skipWhitespace();
    if (this.pos >= this.input.length) {
      this.tokens.push(
        this.createToken(TokenType.EOF, '', this.pos, this.line, this.column),
      );
      return;
    }

    const charCode = this.input.charCodeAt(this.pos);
    const start = this.pos;
    const line = this.line;
    const col = this.column;

    // Structural and single-character tokens
    switch (charCode) {
      case CharCode.DOLLAR:
        this.advance();
        this.tokens.push(this.createToken(TokenType.ROOT, '$', start, line, col));
        return;
      case CharCode.AT:
        this.advance();
        this.tokens.push(
          this.createToken(TokenType.CURRENT, '@', start, line, col),
        );
        return;
      case CharCode.DOT:
        if (this.input.charCodeAt(this.pos + 1) === CharCode.DOT) {
          this.advance();
          this.advance();
          this.tokens.push(
            this.createToken(TokenType.DOT_DOT, '..', start, line, col),
          );
        } else {
          this.advance();
          this.tokens.push(
            this.createToken(TokenType.DOT, '.', start, line, col),
          );
        }
        return;
      case CharCode.LBRACKET:
        this.advance();
        this.tokens.push(
          this.createToken(TokenType.LBRACKET, '[', start, line, col),
        );
        return;
      case CharCode.RBRACKET:
        this.advance();
        this.tokens.push(
          this.createToken(TokenType.RBRACKET, ']', start, line, col),
        );
        return;
      case CharCode.LBRACE:
        this.advance();
        this.tokens.push(
          this.createToken(TokenType.LBRACE, '{', start, line, col),
        );
        return;
      case CharCode.RBRACE:
        this.advance();
        this.tokens.push(
          this.createToken(TokenType.RBRACE, '}', start, line, col),
        );
        return;
      case CharCode.LPAREN:
        this.advance();
        this.tokens.push(
          this.createToken(TokenType.LPAREN, '(', start, line, col),
        );
        return;
      case CharCode.RPAREN:
        this.advance();
        this.tokens.push(
          this.createToken(TokenType.RPAREN, ')', start, line, col),
        );
        return;
      case CharCode.COMMA:
        this.advance();
        this.tokens.push(this.createToken(TokenType.COMMA, ',', start, line, col));
        return;
      case CharCode.COLON:
        this.advance();
        this.tokens.push(this.createToken(TokenType.COLON, ':', start, line, col));
        return;
      case CharCode.ASTERISK:
        this.advance();
        this.tokens.push(
          this.createToken(TokenType.WILDCARD, '*', start, line, col),
        );
        return;
      case CharCode.PLUS:
        this.advance();
        this.tokens.push(this.createToken(TokenType.PLUS, '+', start, line, col));
        return;
      case CharCode.MINUS: {
        // Check if it's a number: followed by a digit
        const nextCharNum = this.input.charCodeAt(this.pos + 1);
        if (nextCharNum < 128 && CHAR_FLAGS[nextCharNum]! & IS_DIGIT) {
          this.tokens.push(this.readNumber());
        } else {
          this.advance();
          this.tokens.push(
            this.createToken(TokenType.MINUS, '-', start, line, col),
          );
        }
        return;
      }
      case CharCode.SLASH:
        this.advance();
        this.tokens.push(this.createToken(TokenType.DIV, '/', start, line, col));
        return;
      case CharCode.PERCENT:
        this.advance();
        this.tokens.push(this.createToken(TokenType.MOD, '%', start, line, col));
        return;
      case CharCode.CARET:
        this.advance();
        this.tokens.push(
          this.createToken(TokenType.PARENT, '^', start, line, col),
        );
        return;
      case CharCode.TILDE:
        this.advance();
        this.tokens.push(
          this.createToken(TokenType.PROPERTY, '~', start, line, col),
        );
        return;
      case CharCode.QUESTION:
        this.advance();
        this.tokens.push(
          this.createToken(TokenType.FILTER, '?', start, line, col),
        );
        return;
    }

    // Strings
    if (
      charCode === CharCode.SINGLE_QUOTE ||
      charCode === CharCode.DOUBLE_QUOTE
    ) {
      this.tokens.push(this.readString(charCode));
      return;
    }

    // Numbers
    if (charCode < 128 && CHAR_FLAGS[charCode]! & IS_DIGIT) {
      this.tokens.push(this.readNumber());
      return;
    }

    // Identifiers and Keywords
    if (
      (charCode < 128 && CHAR_FLAGS[charCode]! & IS_IDENT_START) ||
      charCode > 127
    ) {
      this.tokens.push(this.readIdentOrKeyword());
      return;
    }

    // Operators
    if (charCode < 128 && CHAR_FLAGS[charCode]! & IS_OPERATOR) {
      this.tokens.push(this.readOperator());
      return;
    }

    // Error
    const errorChar = this.input[this.pos];
    this.advance();
    this.tokens.push(
      this.createToken(TokenType.ERROR, errorChar, start, line, col),
    );
  }
```

**Tests to Add/Update (exact)**

File: `packages/jsonpath/lexer/src/__tests__/lexer.spec.ts`

Update the imports and add these tests:

```ts
import { describe, it, expect } from 'vitest';
import { tokenize, TokenType, Lexer } from '../index.js';

describe('Lexer', () => {
	it('should tokenize basic structural elements', () => {
		const tokens = tokenize('$.store.book[*]');
		expect(tokens.map((t) => t.type)).toEqual([
			TokenType.ROOT,
			TokenType.DOT,
			TokenType.IDENT,
			TokenType.DOT,
			TokenType.IDENT,
			TokenType.LBRACKET,
			TokenType.WILDCARD,
			TokenType.RBRACKET,
			TokenType.EOF,
		]);
		expect(tokens[2].value).toBe('store');
		expect(tokens[4].value).toBe('book');
	});

	it('should tokenize recursive descent', () => {
		const tokens = tokenize('$..book');
		expect(tokens.map((t) => t.type)).toEqual([
			TokenType.ROOT,
			TokenType.DOT_DOT,
			TokenType.IDENT,
			TokenType.EOF,
		]);
	});

	it('should tokenize strings with single quotes', () => {
		const tokens = tokenize("$['single\\'quote']");
		expect(tokens.map((t) => t.type)).toEqual([
			TokenType.ROOT,
			TokenType.LBRACKET,
			TokenType.STRING,
			TokenType.RBRACKET,
			TokenType.EOF,
		]);
		expect(tokens[2].value).toBe("single'quote");
	});

	it('should tokenize strings with double quotes', () => {
		const tokens = tokenize('$["double\\"quote"]');
		expect(tokens.map((t) => t.type)).toEqual([
			TokenType.ROOT,
			TokenType.LBRACKET,
			TokenType.STRING,
			TokenType.RBRACKET,
			TokenType.EOF,
		]);
		expect(tokens[2].value).toBe('double"quote');
	});

	it('should tokenize numbers', () => {
		const tokens = tokenize('$[0, -1, 3.14, 1e10]');
		expect(
			tokens.filter((t) => t.type === TokenType.NUMBER).map((t) => t.value),
		).toEqual([0, -1, 3.14, 1e10]);
	});

	it('should tokenize boolean and null literals', () => {
		const tokens = tokenize('$[true, false, null]');
		expect(
			tokens
				.filter((t) =>
					[TokenType.TRUE, TokenType.FALSE, TokenType.NULL].includes(t.type),
				)
				.map((t) => t.value),
		).toEqual([true, false, null]);
	});

	it('should tokenize comparison operators', () => {
		const tokens = tokenize('$[?(@.price == 10 && @.stock != 0)]');
		const ops = tokens.filter((t) =>
			[TokenType.EQ, TokenType.NE, TokenType.AND].includes(t.type),
		);
		expect(ops.map((t) => t.type)).toEqual([
			TokenType.EQ,
			TokenType.AND,
			TokenType.NE,
		]);
	});

	it('should track line and column correctly', () => {
		const tokens = tokenize('$\n.store');
		expect(tokens[0].line).toBe(1);
		expect(tokens[0].column).toBe(1);
		expect(tokens[1].line).toBe(2);
		expect(tokens[1].column).toBe(1);
		expect(tokens[2].line).toBe(2);
		expect(tokens[2].column).toBe(2);
	});

	it('should handle unicode escape sequences', () => {
		const tokens = tokenize("$['\\u0041']");
		expect(tokens[2].value).toBe('A');
	});

	it('should emit ERROR for invalid characters', () => {
		const tokens = tokenize('$#');
		expect(tokens[1].type).toBe(TokenType.ERROR);
		expect(tokens[1].value).toBe('#');
	});

	it('should tokenize on demand for peek/peekAhead', () => {
		const lexer = new Lexer('$.a[0:2]');
		expect(lexer.peek().type).toBe(TokenType.ROOT);
		expect(lexer.peekAhead(1).type).toBe(TokenType.DOT);
		expect(lexer.peekAhead(2).type).toBe(TokenType.IDENT);
		expect(lexer.peekAhead(4).type).toBe(TokenType.NUMBER);
		expect(lexer.peekAhead(5).type).toBe(TokenType.COLON);
		expect(lexer.peekAhead(6).type).toBe(TokenType.NUMBER);
	});

	it('should return EOF repeatedly after end', () => {
		const lexer = new Lexer('$');
		expect(lexer.next().type).toBe(TokenType.ROOT);
		expect(lexer.next().type).toBe(TokenType.EOF);
		expect(lexer.next().type).toBe(TokenType.EOF);
		expect(lexer.peek().type).toBe(TokenType.EOF);
		expect(lexer.peekAhead(10).type).toBe(TokenType.EOF);
		expect(lexer.isAtEnd()).toBe(true);
	});

	it('should perform well (benchmark)', () => {
		const query =
			'$.store.book[?(@.price < 10 && @.category == "fiction")].title';
		const start = performance.now();
		for (let i = 0; i < 10000; i++) {
			tokenize(query);
		}
		const end = performance.now();
		const duration = end - start;
		// Target: 10K queries in < 1000ms (relaxed for CI/dev environments)
		expect(duration).toBeLessThan(1000);
	});
});
```

**Verification Commands:**

- [ ] `pnpm --filter @jsonpath/lexer test`
- [ ] `pnpm --filter @jsonpath/lexer type-check`
- [ ] `pnpm --filter @jsonpath/lexer lint`

**Suggested Commit Message(s):**

- `perf(lexer): lazily tokenize on demand`

---

### Step 6: Singleton AbortController Signal (P2)

**Files:**

- `packages/jsonpath/evaluator/src/options.ts`
- `packages/jsonpath/core/src/index.ts` (or where shared utilities live)

**What:** A new `AbortController().signal` is created for every query when no signal is provided. This is wasteful allocation. Use a singleton noop signal.

**Implementation Details:**

1. Create a module-level singleton:
   ```typescript
   const NOOP_SIGNAL: AbortSignal = new AbortController().signal;
   ```
2. Update `withDefaults()`:
   ```typescript
   signal: options?.signal ?? NOOP_SIGNAL,
   ```

**Testing:**

- Verify timeout/abort functionality still works when signal is provided
- Benchmark to verify minor improvement
- Memory profiling to confirm reduced allocations

---

### Step 7: Monomorphic Selector Handlers (P2)

**Files:**

- `packages/jsonpath/evaluator/src/evaluator.ts`
- `packages/jsonpath/evaluator/src/selectors/` (new directory with individual handlers)

**What:** The giant `switch` statement in `streamSelector()` creates polymorphic call sites that V8 can't optimize well. Refactor to use a handler map with separate, specialized functions per selector type.

**Implementation Details:**

1. Create individual handler files:
   - `selectors/name-selector.ts`
   - `selectors/index-selector.ts`
   - `selectors/wildcard-selector.ts`
   - `selectors/slice-selector.ts`
   - `selectors/filter-selector.ts`
2. Each handler exports a generator function:
   ```typescript
   export function* handleNameSelector(
     selector: NameSelectorNode,
     node: QueryResultNode,
     context: EvaluatorContext
   ): Generator<QueryResultNode> { ... }
   ```
3. Create handler map in evaluator:
   ```typescript
   private readonly selectorHandlers: Map<NodeType, SelectorHandler> = new Map([
     [NodeType.NameSelector, handleNameSelector],
     [NodeType.IndexSelector, handleIndexSelector],
     // ...
   ]);
   ```
4. Simplify `streamSelector()`:
   ```typescript
   private *streamSelector(selector: SelectorNode, node: QueryResultNode): Generator<QueryResultNode> {
     const handler = this.selectorHandlers.get(selector.type);
     if (handler) yield* handler(selector, node, this.context);
   }
   ```

**Testing:**

- V8 deopt logging to verify monomorphic paths
- Benchmark all selector types individually
- Verify no regression in functionality

---

### Step 8: Optimize String Operations in Lexer (P2)

**Files:**

- `packages/jsonpath/lexer/src/lexer.ts`

**What:** Multiple micro-optimizations to reduce string allocations and regex overhead in hot paths.

**Acceptance Checklist:**

- [ ] Remove `^[0-9a-fA-F]{4}$` regex checks in unicode escape handling
- [ ] Avoid `parseInt(hex, 16)` in the hot path
- [ ] Keep all existing string semantics (surrogate handling, error messages, invalid escape behavior)
- [ ] Keep lexer public API unchanged

**Tasks (checkbox plan):**

- [ ] Add helper(s) to decode a 4-hex-digit quad via `charCodeAt` (no regex)
- [ ] Update `readString()` `\\uXXXX` handling to use the helper
- [ ] Keep slices only for error strings (slow-path)

**Code Changes (exact blocks)**

File: `packages/jsonpath/lexer/src/lexer.ts`

1. Replace the unicode escape validation/parse in `readString()` with this implementation:

```ts
          case 117: // uXXXX
            this.advance();
            const codePoint = this.readHexQuadAt(this.pos);
            if (codePoint !== -1) {
              // Handle surrogate pairs
              if (codePoint >= 0xd800 && codePoint <= 0xdbff) {
                this.pos += 4;
                if (
                  this.input.charCodeAt(this.pos) === CharCode.BACKSLASH &&
                  this.input.charCodeAt(this.pos + 1) === 117
                ) {
                  const lowSurrogate = this.readHexQuadAt(this.pos + 2);
                  if (lowSurrogate >= 0xdc00 && lowSurrogate <= 0xdfff) {
                    value += String.fromCodePoint(
                      (codePoint - 0xd800) * 0x400 +
                        (lowSurrogate - 0xdc00) +
                        0x10000,
                    );
                    this.pos += 5; // advance will do the 6th
                    this.column += 10;
                    break;
                  }
                }
                const hex = this.input.slice(
                  this.pos - 4,
                  this.pos,
                );
                throw new JSONPathSyntaxError(
                  `Invalid surrogate pair: \\u${hex}`,
                  { position: start },
                );
              }
              if (codePoint >= 0xdc00 && codePoint <= 0xdfff) {
                const hex = this.input.slice(this.pos, this.pos + 4);
                throw new JSONPathSyntaxError(
                  `Unpaired low surrogate: \\u${hex}`,
                  { position: start },
                );
              }
              value += String.fromCharCode(codePoint);
              this.pos += 3; // advance will do the 4th
              this.column += 3;
            } else {
              const hex = this.input.slice(
                this.pos,
                Math.min(this.pos + 4, this.input.length),
              );
              throw new JSONPathSyntaxError(
                `Invalid unicode escape: \\u${hex}`,
                {
                  position: start,
                },
              );
            }
            break;
```

2. Add these helper methods to `Lexer`:

```ts
  private readHexQuadAt(pos: number): number {
    if (pos + 4 > this.input.length) return -1;
    const n0 = this.hexNibble(this.input.charCodeAt(pos));
    const n1 = this.hexNibble(this.input.charCodeAt(pos + 1));
    const n2 = this.hexNibble(this.input.charCodeAt(pos + 2));
    const n3 = this.hexNibble(this.input.charCodeAt(pos + 3));
    if ((n0 | n1 | n2 | n3) < 0) return -1;
    return (n0 << 12) | (n1 << 8) | (n2 << 4) | n3;
  }

  private hexNibble(code: number): number {
    if (code >= 48 && code <= 57) return code - 48;
    const lower = code | 32;
    if (lower >= 97 && lower <= 102) return lower - 87;
    return -1;
  }
```

**Tests:**

- [ ] Existing `should handle unicode escape sequences` covers the fast-path for `\\u0041`
- [ ] Keep the lexer benchmark test; if CI flakes, consider moving perf assertions into a dedicated benchmark suite instead of unit tests

**Verification Commands:**

- [ ] `pnpm --filter @jsonpath/lexer test`

**Suggested Commit Message(s):**

- `perf(lexer): micro-opt unicode escape decoding`

---

### Step 9: Filter Expression Type Pre-computation (P2)

**Files:**

- `packages/jsonpath/parser/src/parser.ts`
- `packages/jsonpath/core/src/types.ts`
- `packages/jsonpath/evaluator/src/evaluator.ts`

**What:** Filter evaluation does extensive runtime type checking for each argument. Pre-compute expected types during parsing and store in AST nodes.

**Implementation Details:**

1. Extend AST nodes with type hints:
   ```typescript
   interface FunctionCallNode {
   	type: NodeType.FunctionCall;
   	name: string;
   	args: ExpressionNode[];
   	argTypes?: ('NodesType' | 'LogicalType' | 'ValueType')[]; // Pre-computed
   }
   ```
2. In parser, when building `FunctionCallNode`, look up function signature and populate `argTypes`
3. In evaluator `evaluateFunction()`, use pre-computed types instead of runtime inspection

**Testing:**

- Benchmark filter queries with function calls
- Verify all function calls still work correctly
- Test edge cases with plugins that add custom functions

---

### Step 10: Add Comprehensive Performance Benchmarks (P2)

**Files:**

- `packages/jsonpath/benchmarks/src/detailed.bench.ts` (new file)
- `packages/jsonpath/benchmarks/src/regression.bench.ts` (new file)

**What:** Add detailed benchmarks that isolate specific operations for better regression detection and optimization targeting.

**Implementation Details:**

1. Create `detailed.bench.ts`:

   ```typescript
   describe('Detailed Performance', () => {
   	bench('parse only (no evaluation)', () => {
   		parse('$.store.book[?(@.price < 50)].title');
   	});

   	bench('parse + compile', () => {
   		const ast = parse('$.store.book[?(@.price < 50)].title');
   		compile(ast);
   	});

   	bench('compiled execution only (pre-compiled)', () => {
   		preCompiledQuery(largeData);
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

   	bench('path materialization', () => {
   		query(data, '$..*.name').paths();
   	});
   });
   ```

2. Create `regression.bench.ts` with baseline comparisons against competitors
3. Add CI integration for **performance reporting only** (not blocking)

**Testing:**

- Run all benchmarks and record baseline
- Document expected ranges for each benchmark
- CI reports performance metrics for human review (does not block on regression)

---

### Step 11: Documentation and Migration Guide

**Files:**

- `packages/jsonpath/PERFORMANCE_ANALYSIS.md` (update)
- `packages/jsonpath/docs/PERFORMANCE.md` (new file)
- `packages/jsonpath/jsonpath/README.md` (update)

**What:** Document the performance improvements, configuration options, and best practices for users.

**Implementation Details:**

1. Update `PERFORMANCE_ANALYSIS.md` with "Issues Fixed" section for all resolved items
2. Create `PERFORMANCE.md` with:
   - Performance comparison table (before/after)
   - Configuration options for tuning
   - Best practices for high-performance usage
   - Memory management guidance
3. Update facade README with performance notes

**Testing:**

- Review documentation for accuracy
- Verify code examples work correctly

---

## Success Criteria

1. **Filter query performance**: ≥33,000 ops/s (parity with `jsonpath`)
2. **Basic query performance**: ≥25,000 ops/s (maintain current)
3. **Compiled query performance**: ≥18,000 ops/s (+36% improvement)
4. **Memory allocation**: 50%+ reduction in GC events for large queries
5. **All existing tests pass**: 100% test suite green
6. **RFC 9535 compliance**: Maintained (verify with compliance suite)

---

## Risk Assessment

| Risk                        | Likelihood | Impact | Mitigation                                     |
| --------------------------- | ---------- | ------ | ---------------------------------------------- |
| Breaking API changes        | Low        | High   | All changes are internal; public API unchanged |
| Regression in edge cases    | Medium     | Medium | Comprehensive test suite; run compliance suite |
| Object pooling memory leaks | Low        | High   | Careful pool reset; stress testing             |
| Lazy path computation bugs  | Medium     | Medium | Extensive path-related tests                   |
| V8 optimization volatility  | Low        | Low    | Benchmark on multiple Node versions            |

---

## Dependencies

- No external dependencies required
- Internal package dependencies remain unchanged
- TypeScript 5.5+ features used (existing)

---

## Estimated Effort

| Step                                | Complexity | Estimated Time   |
| ----------------------------------- | ---------- | ---------------- |
| Step 1: Compiled Query Default      | Simple     | 2-3 hours        |
| Step 2: Lazy Path Computation       | Complex    | 4-6 hours        |
| Step 3: Object Pooling              | Medium     | 3-4 hours        |
| Step 4: Security Check Optimization | Simple     | 1-2 hours        |
| Step 5: Lazy Tokenization           | Medium     | 3-4 hours        |
| Step 6: Singleton Signal            | Simple     | 30 minutes       |
| Step 7: Monomorphic Handlers        | Complex    | 4-5 hours        |
| Step 8: String Optimizations        | Simple     | 1-2 hours        |
| Step 9: Type Pre-computation        | Medium     | 3-4 hours        |
| Step 10: Benchmarks                 | Medium     | 2-3 hours        |
| Step 11: Documentation              | Simple     | 1-2 hours        |
| **Total**                           |            | **~25-35 hours** |

---

## Implementation Order

The steps are ordered by priority (P0 → P1 → P2) and dependency:

```
Step 1 (P0) → [Independent, highest impact]
    ↓
Steps 2-5 (P1) → [Can be parallelized, core optimizations]
    ↓
Steps 6-9 (P2) → [Polish and micro-optimizations]
    ↓
Steps 10-11 → [Documentation and testing infrastructure]
```

**Recommended Approach:**

1. Implement Step 1 first and verify 4.5x improvement
2. Implement Steps 2-4 together (they touch the same files)
3. Implement Step 5 independently
4. Implement Steps 6-9 as time allows
5. Finalize with Steps 10-11
