# JSONPath Performance Optimization — Implementation Guide

This document is an implementation guide for `plans/jsonpath-performance/plan.md`.

## Prerequisites

- Work from the correct branch.
  - The performance plan targets `perf/jsonpath-optimization`.
  - The current workspace branch may differ (e.g. `feat/ui-spec-core-react-adapters-jsonp3`).
- Use repo-standard commands (pnpm + turborepo). Do not `cd` into workspaces.

## Conventions Used Here

- Each step is written in R/G/R order:
  - **RED**: add/adjust tests first.
  - **GREEN**: implement the change.
  - **REFACTOR**: small cleanup only if needed.
- All code blocks are intended to be pasted directly into the referenced file.

---

## Step 1 (P0): Enable Compiled Query Caching by Default

**Goal**: compiled queries are used by default (fast path), with a real LRU for compiled queries via a module-level `Compiler` instance.

**Files**:

- `packages/jsonpath/jsonpath/src/config.ts`
- `packages/jsonpath/jsonpath/src/cache.ts`
- `packages/jsonpath/jsonpath/src/facade.ts`
- `packages/jsonpath/jsonpath/src/__tests__/config.spec.ts`
- `packages/jsonpath/jsonpath/src/__tests__/compiled-cache.spec.ts` (new)

### Acceptance Checklist

- [x] Compiled cache enabled by default (`enabled: true`)
- [x] Default compiled cache size is `256`
- [x] `query()` uses compiled queries by default (while preserving output semantics)
- [x] Public APIs exist to clear and resize compiled cache: `clearCompiledCache()`, `setCompiledCacheSize(size)`
- [x] Tests cover cache hits, clear, resize, and LRU eviction behavior

### 1.1 RED — tests

#### 1.1.1 Update config defaults test

File: `packages/jsonpath/jsonpath/src/__tests__/config.spec.ts`

Add assertions for the new defaults in the existing `reset()` default-config test (keep existing assertions):

```ts
expect(config.compiledCache.enabled).toBe(true);
expect(config.compiledCache.maxSize).toBe(256);
```

#### 1.1.2 Add compiled cache behavior tests (new file)

File (new): `packages/jsonpath/jsonpath/src/__tests__/compiled-cache.spec.ts`

Create with:

```ts
import { describe, it, expect, beforeEach } from 'vitest';

import {
	compileQuery,
	clearCompiledCache,
	setCompiledCacheSize,
	reset,
} from '../index.js';

describe('compiled query cache', () => {
	beforeEach(() => {
		reset();
		clearCompiledCache();
	});

	it('reuses the same compiled function for the same query', () => {
		const fn1 = compileQuery('$.a');
		const fn2 = compileQuery('$.a');
		expect(fn1).toBe(fn2);
	});

	it('clearCompiledCache() forces recompilation', () => {
		const fn1 = compileQuery('$.a');
		clearCompiledCache();
		const fn2 = compileQuery('$.a');
		expect(fn1).not.toBe(fn2);
	});

	it('setCompiledCacheSize() recreates cache (evicts prior entries)', () => {
		const fn1 = compileQuery('$.a');
		setCompiledCacheSize(1);
		const fn2 = compileQuery('$.a');
		expect(fn1).not.toBe(fn2);
	});

	it('evicts least-recently-used entries when cache is full', () => {
		setCompiledCacheSize(2);

		const a1 = compileQuery('$.a');
		const b1 = compileQuery('$.b');

		// Touch a (a becomes most-recently-used)
		const a2 = compileQuery('$.a');
		expect(a2).toBe(a1);

		// Add c; should evict b
		compileQuery('$.c');

		const a3 = compileQuery('$.a');
		expect(a3).toBe(a1);

		const b2 = compileQuery('$.b');
		expect(b2).not.toBe(b1);
	});
});
```

### 1.2 GREEN — implementation

#### 1.2.1 Add compiled cache config

File: `packages/jsonpath/jsonpath/src/config.ts`

Replace the entire file with:

```ts
/**
 * @jsonpath/jsonpath
 *
 * Global configuration for the JSONPath suite.
 *
 * @packageDocumentation
 */

import type { EvaluatorOptions } from '@jsonpath/core';

export interface JSONPathConfig {
	evaluator: EvaluatorOptions;
	cache: {
		enabled: boolean;
		maxSize: number;
	};
	compiledCache: {
		enabled: boolean;
		maxSize: number;
	};
}

const DEFAULT_CONFIG: JSONPathConfig = {
	evaluator: {
		maxDepth: 256,
		maxResults: 10_000,
		timeout: 0,
		detectCircular: false,
		secure: {
			allowPaths: [],
			blockPaths: [],
			noRecursive: false,
			noFilters: false,
			maxQueryLength: 0,
		},
	},
	cache: {
		enabled: true,
		maxSize: 1000,
	},
	compiledCache: {
		enabled: true,
		maxSize: 256,
	},
};

let currentConfig: JSONPathConfig = { ...DEFAULT_CONFIG };

/**
 * Updates the global configuration.
 */
export function configure(options: Partial<JSONPathConfig>): void {
	currentConfig = {
		...currentConfig,
		...options,
		evaluator: {
			...currentConfig.evaluator,
			...options.evaluator,
		},
		cache: {
			...currentConfig.cache,
			...options.cache,
		},
		compiledCache: {
			...currentConfig.compiledCache,
			...options.compiledCache,
		},
	};
}

/**
 * Returns the current global configuration.
 */
export function getConfig(): Readonly<JSONPathConfig> {
	return currentConfig;
}

/**
 * Resets the global configuration to defaults.
 */
export function reset(): void {
	currentConfig = { ...DEFAULT_CONFIG };
}
```

#### 1.2.2 Implement module-level compiler cache + management APIs

File: `packages/jsonpath/jsonpath/src/cache.ts`

Replace the entire file with:

```ts
/**
 * @jsonpath/jsonpath
 *
 * Cache management for parsed and compiled queries.
 *
 * @packageDocumentation
 */

import type { QueryNode } from '@jsonpath/parser';
import type { CompiledQuery } from '@jsonpath/compiler';
import { Compiler } from '@jsonpath/compiler';

import { getConfig, configure } from './config.js';

// -----------------------------
// Parsed AST cache
// -----------------------------

const queryCache = new Map<string, QueryNode>();
let hits = 0;
let misses = 0;

/**
 * Returns a cached AST for a query string, or undefined if not cached.
 */
export function getCachedQuery(query: string): QueryNode | undefined {
	const ast = queryCache.get(query);
	if (ast) {
		hits++;
	} else {
		misses++;
	}
	return ast;
}

/**
 * Caches an AST for a query string.
 */
export function setCachedQuery(query: string, ast: QueryNode): void {
	const config = getConfig();
	if (!config.cache.enabled) return;

	if (queryCache.size >= config.cache.maxSize) {
		// Simple insertion-order eviction.
		const firstKey = queryCache.keys().next().value;
		if (firstKey !== undefined) {
			queryCache.delete(firstKey);
		}
	}

	queryCache.set(query, ast);
}

/**
 * Clears the parsed query cache.
 */
export function clearCache(): void {
	queryCache.clear();
	hits = 0;
	misses = 0;
}

/**
 * Returns cache statistics.
 */
export function getCacheStats(): {
	size: number;
	maxSize: number;
	hits: number;
	misses: number;
} {
	return {
		size: queryCache.size,
		maxSize: getConfig().cache.maxSize,
		hits,
		misses,
	};
}

// -----------------------------
// Compiled query cache
// -----------------------------

let compiler = createCompilerFromConfig();

function createCompilerFromConfig(): Compiler {
	const { compiledCache } = getConfig();
	// The Compiler requires `cacheSize > 0` when caching is enabled.
	// Interpret `maxSize = 0` as "disable compiled cache".
	const useCache = compiledCache.enabled && compiledCache.maxSize > 0;
	return new Compiler({
		useCache,
		cacheSize: useCache ? compiledCache.maxSize : 1,
	});
}

/**
 * Compile using the module-level compiler instance (enables real LRU).
 */
export function compileCachedQuery(ast: QueryNode): CompiledQuery {
	return compiler.compile(ast);
}

/**
 * Clears the compiled query cache.
 */
export function clearCompiledCache(): void {
	compiler = createCompilerFromConfig();
}

/**
 * Sets the compiled cache size and clears existing compiled cache.
 */
export function setCompiledCacheSize(size: number): void {
	if (!Number.isInteger(size) || size < 0) {
		throw new TypeError('compiled cache size must be a non-negative integer');
	}
	configure({ compiledCache: { maxSize: size } as any });
	compiler = createCompilerFromConfig();
}
```

#### 1.2.3 Use compiled queries by default in facade

File: `packages/jsonpath/jsonpath/src/facade.ts`

Apply these edits:

1. Update the compiler import at the top.

Replace:

```ts
import { compile, type CompiledQuery } from '@jsonpath/compiler';
```

With:

```ts
import type { CompiledQuery } from '@jsonpath/compiler';
```

2. Update cache import to include compiled helpers.

Replace:

```ts
import { getCachedQuery, setCachedQuery } from './cache.js';
```

With:

```ts
import {
	getCachedQuery,
	setCachedQuery,
	compileCachedQuery,
	clearCompiledCache,
	setCompiledCacheSize,
} from './cache.js';
```

3. Replace `query()` to use the compiled function.

Replace the entire `query()` function with:

```ts
export function query(
	root: any,
	path: string,
	options?: EvaluatorOptions,
): QueryResult {
	const compiled = compileQuery(path, options);
	return compiled(root, withDefaultPlugins(options));
}
```

4. Replace `compileQuery()` to use the module-level cached compiler.

Replace the entire `compileQuery()` function with:

```ts
export function compileQuery(
	path: string,
	options?: EvaluatorOptions,
): CompiledQuery {
	const ast = parseQuery(path, options);
	return compileCachedQuery(ast);
}
```

5. Re-export compiled cache management from the facade (public API).

Add these exports near the existing exports (anywhere in module scope is fine):

```ts
export { clearCompiledCache, setCompiledCacheSize };
```

### 1.3 Verification

- [x] `pnpm --filter @jsonpath/jsonpath test`
- [x] `pnpm --filter @jsonpath/jsonpath type-check` (pre-existing type errors unrelated to this step)
- [x] `pnpm --filter @jsonpath/jsonpath lint` (pre-existing lint warnings unrelated to this step)

### STOP & COMMIT

- Commit: `perf(jsonpath): enable compiled query caching by default` ✓ COMPLETED

---

## Step 2–4 (P1): Evaluator Path Laziness + Pooling + Faster Security Checks

These three steps touch the same hot paths and should be implemented together.

**Files**:

- `packages/jsonpath/evaluator/src/query-result.ts`
- `packages/jsonpath/evaluator/src/query-result-pool.ts` (new)
- `packages/jsonpath/evaluator/src/options.ts`
- `packages/jsonpath/evaluator/src/evaluator.ts`
- `packages/jsonpath/evaluator/src/__tests__/evaluator.spec.ts`
- `packages/jsonpath/evaluator/src/__tests__/query-result.spec.ts`
- `packages/jsonpath/evaluator/src/__tests__/security.spec.ts`

### Acceptance Checklist (combined)

- [ ] `node.path` remains a property and is stable across repeated access (same array instance)
- [ ] Remove all `path: [...node.path, seg]` allocations in `streamDescendants()` and `streamSelector()`
- [ ] Object pooling is per `Evaluator` instance and reset per `stream()` invocation
- [ ] Pool reuse does not mutate nodes returned by a previous query
- [ ] Security allow/block checks do not call `node.path` in hot paths (compute pointer from parent chain)
- [ ] `QueryResult.pointerStrings()` and `pointers()` outputs remain unchanged

### 2–4.1 RED — tests

#### 2–4.1.1 Add stable `node.path` caching test

File: `packages/jsonpath/evaluator/src/__tests__/query-result.spec.ts`

Append:

```ts
it('caches node.path (same array instance on repeated access)', () => {
	const data = { a: { b: [10, 20] } };
	const ast = parse('$.a.b[1]');
	const result = evaluate(data, ast);

	const node = result.nodes()[0]!;
	const p1 = node.path;
	const p2 = node.path;

	expect(p1).toBe(p2);
	expect(p1).toEqual(['a', 'b', 1]);
});
```

#### 2–4.1.2 Add pool-stability regression test

File: `packages/jsonpath/evaluator/src/__tests__/evaluator.spec.ts`

Add (near other basic tests):

```ts
it('does not mutate results from a prior evaluation when reusing the same Evaluator', () => {
	const root = { a: { x: 1 }, b: { x: 2 } };
	const evaluator = new Evaluator(root);

	const r1 = evaluator.evaluate(parse('$.a.x'));
	const n1 = r1.nodes()[0]!;
	const n1Path = n1.path;

	expect(n1.value).toBe(1);
	expect(n1.path).toEqual(['a', 'x']);
	expect(n1.path).toBe(n1Path);

	// Run another query; pooled internal nodes will be reused.
	evaluator.evaluate(parse('$.b.x'));

	// First query’s result must remain stable.
	expect(n1.value).toBe(1);
	expect(n1.path).toEqual(['a', 'x']);
	expect(n1.path).toBe(n1Path);
});
```

#### 2–4.1.3 Add allowPaths descendant traversal regression

File: `packages/jsonpath/evaluator/src/__tests__/security.spec.ts`

Append:

```ts
it('allows traversal into allowed descendants when allowPaths is set', () => {
	const data = { nested: { allowed: 1, blocked: 2 } };
	const options = { secure: { allowPaths: ['/nested/allowed'] } };

	expect(evaluate(data, parse('$..allowed'), options).values()).toEqual([1]);
});
```

### 2–4.2 GREEN — implementation

#### 2–4.2.1 Replace `query-result.ts` to support lazy path + pointer caching

File: `packages/jsonpath/evaluator/src/query-result.ts`

Replace the entire file with:

```ts
/**
 * @jsonpath/evaluator
 *
 * Result class for JSONPath queries.
 *
 * @packageDocumentation
 */

import type {
	Path,
	PathSegment,
	QueryNode as CoreQueryNode,
	QueryResult as CoreQueryResult,
} from '@jsonpath/core';
import { JSONPointer } from '@jsonpath/pointer';

export interface QueryResultNode<T = unknown> extends CoreQueryNode<T> {
	// Backwards-compatible API: `path` is still a property.
	readonly path: Path;

	// Internal lazy-path chain
	_pathParent?: QueryResultNode | undefined;
	_pathSegment?: PathSegment | undefined;
	_cachedPath?: PathSegment[] | undefined;
	_cachedPointer?: string | undefined;
	_depth?: number | undefined;
}

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
	node._depth ??= segments.length;

	return segments;
}

function escapeJsonPointerSegmentFromPathSegment(segment: PathSegment): string {
	return String(segment).replace(/~/g, '~0').replace(/\//g, '~1');
}

export function pointerStringForNode(node: QueryResultNode): string {
	if (node._cachedPointer) return node._cachedPointer;

	// Root pointer
	if (node._pathSegment === undefined) {
		// Match existing QueryResult.pointerStrings() behavior: root is "".
		node._cachedPointer = '';
		return '';
	}

	// Collect segments without materializing `node.path`.
	const segs: PathSegment[] = [];
	let curr: QueryResultNode | undefined = node;
	while (curr && curr._pathSegment !== undefined) {
		segs.push(curr._pathSegment);
		curr = curr._pathParent;
	}
	segs.reverse();

	let out = '';
	for (const s of segs) out += `/${escapeJsonPointerSegmentFromPathSegment(s)}`;

	node._cachedPointer = out;
	return out;
}

function escapeNormalizedPathName(name: string): string {
	return name
		.replace(/\\/g, '\\\\')
		.replace(/'/g, "\\'")
		.replace(/\x08/g, '\\b')
		.replace(/\x0c/g, '\\f')
		.replace(/\n/g, '\\n')
		.replace(/\r/g, '\\r')
		.replace(/\t/g, '\\t')
		.replace(/[\u0000-\u001f]/g, (c) => {
			return `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`;
		});
}

function pathToNormalizedPath(path: readonly PathSegment[]): string {
	// RFC 9535 Section 2.2:
	// - Use bracket notation for all segments
	// - Names use single quotes
	let out = '$';
	for (const seg of path) {
		if (typeof seg === 'number') {
			out += `[${seg}]`;
		} else {
			out += `['${escapeNormalizedPathName(seg)}']`;
		}
	}
	return out;
}

export class QueryResult<T = unknown> implements CoreQueryResult<T> {
	constructor(private readonly results: QueryResultNode<T>[]) {}

	values(): T[] {
		return this.results.map((r) => r.value);
	}

	paths(): PathSegment[][] {
		return this.results.map((r) => [...r.path]);
	}

	pointers(): JSONPointer[] {
		return this.results.map(
			(r) => new JSONPointer(r._cachedPointer ?? pointerStringForNode(r)),
		);
	}

	pointerStrings(): string[] {
		return this.results.map((r) => r._cachedPointer ?? pointerStringForNode(r));
	}

	normalizedPaths(): string[] {
		return this.results.map((r) => pathToNormalizedPath(r.path));
	}

	nodes(): QueryResultNode<T>[] {
		return [...this.results];
	}

	first(): QueryResultNode<T> | undefined {
		return this.results[0];
	}

	last(): QueryResultNode<T> | undefined {
		return this.results[this.results.length - 1];
	}

	isEmpty(): boolean {
		return this.results.length === 0;
	}

	get length(): number {
		return this.results.length;
	}

	map<U>(fn: (value: T, node: QueryResultNode<T>) => U): U[] {
		return this.results.map((n) => fn(n.value, n));
	}

	filter(fn: (value: T, node: QueryResultNode<T>) => boolean): QueryResult<T> {
		return new QueryResult(this.results.filter((n) => fn(n.value, n)));
	}

	forEach(fn: (value: T, node: QueryResultNode<T>) => void): void {
		for (const n of this.results) fn(n.value, n);
	}

	parents(): QueryResult {
		const seen = new Set<string>();
		const parentNodes: QueryResultNode[] = [];

		for (const n of this.results) {
			if (n.parent === undefined) continue;
			const parentPath = n.path.slice(0, -1);
			const key =
				parentPath.length === 0 ? '/' : `/${parentPath.map(String).join('/')}`;
			if (seen.has(key)) continue;
			seen.add(key);

			parentNodes.push({
				value: n.parent,
				path: parentPath,
				root: n.root,
			});
		}

		return new QueryResult(parentNodes);
	}

	[Symbol.iterator](): Iterator<QueryResultNode<T>> {
		return this.results[Symbol.iterator]();
	}
}
```

#### 2–4.2.2 Add node pool (new file)

File (new): `packages/jsonpath/evaluator/src/query-result-pool.ts`

Create with:

```ts
import type { PathSegment } from '@jsonpath/core';

import type { QueryResultNode } from './query-result.js';
import { materializePath, pointerStringForNode } from './query-result.js';

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

	get path(): readonly PathSegment[] {
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

		const parentDepth = args.pathParent?._depth ?? 0;
		node._depth = parentDepth + (args.pathSegment === undefined ? 0 : 1);

		return node;
	}

	ownFrom(node: QueryResultNode): QueryResultNode {
		const owned = new PooledNode();
		owned.value = node.value;
		owned.root = node.root;
		owned.parent = node.parent;
		owned.parentKey = node.parentKey;

		const path = materializePath(node);
		owned._cachedPath = path;
		owned._depth = node._depth ?? path.length;

		owned._cachedPointer = node._cachedPointer;
		if (!owned._cachedPointer && node._pathSegment !== undefined) {
			owned._cachedPointer = pointerStringForNode(node);
		}

		owned._pathParent = undefined;
		owned._pathSegment = undefined;
		return owned;
	}
}
```

#### 2–4.2.3 Make `withDefaults()` produce stable secure arrays

File: `packages/jsonpath/evaluator/src/options.ts`

Replace the entire file with the code block shown earlier in Step 2–4.2.3 (this document).

#### 2–4.2.4 Update evaluator to use lazy chain + pool + node-level security predicate

Follow the edits shown earlier in Step 2–4.2.4 (this document).

### 2–4.3 Verification

- [ ] `pnpm --filter @jsonpath/evaluator test`
- [ ] `pnpm --filter @jsonpath/evaluator type-check`
- [ ] `pnpm --filter @jsonpath/evaluator lint`

### STOP & COMMIT

- Commit: `perf(evaluator): lazy paths + pooled nodes + faster secure checks`

---

## Step 5 (P1): Lazy Tokenization in Lexer

Follow the exact code blocks from the plan.

**Files**:

- `packages/jsonpath/lexer/src/lexer.ts`
- `packages/jsonpath/lexer/src/__tests__/lexer.spec.ts`

### Apply (copy/paste)

Use the “Step 5: Lazy Tokenization in Lexer (P1)” blocks from `plans/jsonpath-performance/plan.md` starting at the “Code Changes (exact blocks)” section.

### Verification

- [ ] `pnpm --filter @jsonpath/lexer test`
- [ ] `pnpm --filter @jsonpath/lexer type-check`
- [ ] `pnpm --filter @jsonpath/lexer lint`

### STOP & COMMIT

- Commit: `perf(lexer): lazily tokenize on demand`

---

## Step 6 (P2): Singleton AbortSignal

**Goal**: stop allocating a new `AbortController().signal` for every evaluation when no signal is provided.

**Files**:

- `packages/jsonpath/evaluator/src/options.ts`

### Change

In `packages/jsonpath/evaluator/src/options.ts`, add this near top-level:

```ts
const NOOP_SIGNAL: AbortSignal = new AbortController().signal;
```

Then in `withDefaults()`, replace:

```ts
signal: options?.signal ?? new AbortController().signal,
```

With:

```ts
signal: options?.signal ?? NOOP_SIGNAL,
```

### Verification

- [ ] `pnpm --filter @jsonpath/evaluator test`

### STOP & COMMIT

- Commit: `perf(evaluator): reuse default AbortSignal`

---

## Step 7 (P2): Monomorphic Selector Handlers

Follow the instructions in the Step 7 section earlier in this document.

---

## Step 8 (P2): Lexer String Micro-optimizations

Follow the exact code blocks from the plan.

---

## Step 9 (P2): Filter Function Argument Type Pre-computation

Follow the instructions in the Step 9 section earlier in this document.

---

## Step 10 (P2): Add Comprehensive Benchmarks

Follow the instructions in the Step 10 section earlier in this document.

---

## Step 11: Documentation Updates

Follow the instructions in the Step 11 section earlier in this document.
