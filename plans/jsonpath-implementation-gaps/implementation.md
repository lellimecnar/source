## JSONPath Implementation Gaps — Implementation Guide

Execution-ready companion to [plan.md](plan.md). This guide corrects a few plan-vs-repo mismatches and provides copy/paste patches.

## Preflight

```bash
# From repo root
pnpm -v
node -v
pnpm install
```

**Branching + commits (no terminal git commands)**

- Create/switch to branch `feat/jsonpath-implementation-gaps` using VS Code Source Control (or Git UI).
- For each step: stage via VS Code Source Control and commit with the provided message.

**Conventions**

- Run workspace commands from repo root (do not `cd`).
- Prefer `pnpm --filter <pkg> <script>`.
- After each step: run tests + stop/commit with the message provided.

---

## Step 1 — Real JIT Compiler: Code Generation (P0) [DONE]

**Repo reality note:** `@jsonpath/compiler` currently has a stub [packages/jsonpath/compiler/src/codegen.ts](../../packages/jsonpath/compiler/src/codegen.ts). The plan’s `src/codegen/*` directory does not exist yet; this step creates it and makes `codegen.ts` a thin shim.

### Patch: add codegen module structure [DONE]

```diff
diff --git a/packages/jsonpath/compiler/src/codegen/index.ts b/packages/jsonpath/compiler/src/codegen/index.ts
new file mode 100644
index 0000000..7f0b8b2
--- /dev/null
+++ b/packages/jsonpath/compiler/src/codegen/index.ts
@@
+export * from './generators.js';
+export * from './templates.js';
+export * from './optimizations.js';
+
+export type { CodegenOptions } from './templates.js';
+
```

```diff
diff --git a/packages/jsonpath/compiler/src/codegen/templates.ts b/packages/jsonpath/compiler/src/codegen/templates.ts
new file mode 100644
index 0000000..a4dd2b7
--- /dev/null
+++ b/packages/jsonpath/compiler/src/codegen/templates.ts
@@
+import type { QueryNode } from '@jsonpath/parser';
+
+export interface CodegenOptions {
+	readonly sourceMap?: boolean;
+	readonly unsafe?: boolean;
+}
+
+export interface GeneratedModule {
+	/** JavaScript source of the compiled query function factory */
+	readonly source: string;
+	/** AST used to generate */
+	readonly ast: QueryNode;
+}
+
+export function wrapFactory(
+	ast: QueryNode,
+	fnBodySource: string,
+	options: CodegenOptions,
+): GeneratedModule {
+	// NOTE: we generate a factory so we can inject runtime dependencies safely.
+	// new Function('QueryResult', 'getFunction', 'Nothing', 'return (root, opts) => {...}')
+	const source = options.sourceMap
+		? `// source: ${JSON.stringify(ast.source)}\n${fnBodySource}`
+		: fnBodySource;
+
+	return { source, ast };
+}
+
```

```diff
diff --git a/packages/jsonpath/compiler/src/codegen/optimizations.ts b/packages/jsonpath/compiler/src/codegen/optimizations.ts
new file mode 100644
index 0000000..f6ce2c4
--- /dev/null
+++ b/packages/jsonpath/compiler/src/codegen/optimizations.ts
@@
+import type { QueryNode } from '@jsonpath/parser';
+
+export interface OptimizationFlags {
+	readonly inlineSimpleSelectors?: boolean;
+	readonly shortCircuitFilters?: boolean;
+}
+
+export function detectOptimizations(ast: QueryNode): OptimizationFlags {
+	// Keep this deliberately conservative to avoid semantic drift.
+	// Step 3 expands this with real opt passes.
+	return {
+		inlineSimpleSelectors: true,
+		shortCircuitFilters: true,
+	};
+}
+
```

```diff
diff --git a/packages/jsonpath/compiler/src/codegen/generators.ts b/packages/jsonpath/compiler/src/codegen/generators.ts
new file mode 100644
index 0000000..b54e0a5
--- /dev/null
+++ b/packages/jsonpath/compiler/src/codegen/generators.ts
@@
+import {
+	NodeType,
+	type QueryNode,
+	type SegmentNode,
+	type SelectorNode,
+	type ExpressionNode,
+	isSingularQuery,
+} from '@jsonpath/parser';
+
+/**
+ * Generate JS source for a function `(root, options) => QueryResult`.
+ *
+ * Runtime dependencies are injected by the compiler via `new Function(...)`:
+ * - QueryResult (class)
+ * - evaluate (fallback interpreter)
+ * - getFunction (builtin function resolver)
+ * - Nothing (sentinel)
+ */
+export function generateQueryFunctionSource(ast: QueryNode): string {
+	// Conservative fast-path: if AST is not supported by the generator yet,
+	// emit a fallback call to the interpreter to keep correctness.
+	//
+	// As we add generators, we expand supported node coverage.
+	if (ast.type !== NodeType.Query) {
+		return `return (root, options) => evaluate(root, ast, options);`;
+	}
+
+	// For now, generate a small set of segment/selector types that cover the
+	// majority of CTS queries: child/descendant segments and name/index/wildcard/slice/filter selectors.
+	// Anything else falls back per-segment.
+
+	const lines: string[] = [];
+	lines.push('return (root, options) => {');
+	lines.push('  const _root = root;');
+	lines.push("  let nodes = [{ value: root, path: [], root: _root }];");
+	lines.push('  let next = [];');
+	lines.push('');
+
+	for (let i = 0; i < ast.segments.length; i++) {
+		const seg = ast.segments[i]!;
+		lines.push(...generateSegment(seg, i));
+		lines.push('');
+	}
+
+	lines.push('  return new QueryResult(nodes);');
+	lines.push('};');
+	return lines.join('\n');
+}
+
+function generateSegment(segment: SegmentNode, index: number): string[] {
+	const lines: string[] = [];
+	lines.push(`  // segment ${index + 1}`);
+	lines.push('  next = [];');
+
+	const isDesc = segment.type === NodeType.DescendantSegment;
+	if (isDesc) {
+		lines.push('  for (const node of nodes) {');
+		lines.push('    for (const desc of _descend(node)) {');
+		lines.push('      const v = desc.value;');
+		for (const sel of segment.selectors) {
+			lines.push(...generateSelector(sel, 'desc', 'v'));
+		}
+		lines.push('    }');
+		lines.push('  }');
+	} else {
+		lines.push('  for (const node of nodes) {');
+		lines.push('    const v = node.value;');
+		for (const sel of segment.selectors) {
+			lines.push(...generateSelector(sel, 'node', 'v'));
+		}
+		lines.push('  }');
+	}
+
+	lines.push('  nodes = next;');
+	return lines;
+}
+
+function generateSelector(sel: SelectorNode, nodeVar: string, valueVar: string): string[] {
+	switch (sel.type) {
+		case NodeType.NameSelector: {
+			const name = JSON.stringify(sel.name);
+			return [
+				`    if (${valueVar} !== null && typeof ${valueVar} === 'object' && !Array.isArray(${valueVar}) && (${name} in ${valueVar})) {`,
+				`      next.push({ value: ${valueVar}[${name}], path: [...${nodeVar}.path, ${name}], root: _root, parent: ${valueVar}, parentKey: ${name} });`,
+				'    }',
+			];
+		}
+		case NodeType.IndexSelector: {
+			const idx = sel.index;
+			if (idx < 0) {
+				return [
+					`    if (Array.isArray(${valueVar})) {`,
+					`      const i = ${valueVar}.length + (${idx});`,
+					`      if (i >= 0 && i < ${valueVar}.length) {`,
+					`        next.push({ value: ${valueVar}[i], path: [...${nodeVar}.path, i], root: _root, parent: ${valueVar}, parentKey: i });`,
+					'      }',
+					'    }',
+				];
+			}
+			return [
+				`    if (Array.isArray(${valueVar}) && ${idx} >= 0 && ${idx} < ${valueVar}.length) {`,
+				`      next.push({ value: ${valueVar}[${idx}], path: [...${nodeVar}.path, ${idx}], root: _root, parent: ${valueVar}, parentKey: ${idx} });`,
+				'    }',
+			];
+		}
+		case NodeType.WildcardSelector: {
+			return [
+				`    if (Array.isArray(${valueVar})) {`,
+				`      for (let i = 0; i < ${valueVar}.length; i++) {`,
+				`        next.push({ value: ${valueVar}[i], path: [...${nodeVar}.path, i], root: _root, parent: ${valueVar}, parentKey: i });`,
+				'      }',
+				`    } else if (${valueVar} !== null && typeof ${valueVar} === 'object') {`,
+				`      for (const k of Object.keys(${valueVar})) {`,
+				`        next.push({ value: ${valueVar}[k], path: [...${nodeVar}.path, k], root: _root, parent: ${valueVar}, parentKey: k });`,
+				'      }',
+				'    }',
+			];
+		}
+		case NodeType.SliceSelector: {
+			// Delegate to helper to keep generated source small.
+			const start = sel.start === null ? 'null' : String(sel.start);
+			const end = sel.end === null ? 'null' : String(sel.end);
+			const step = sel.step === null ? 'null' : String(sel.step);
+			return [
+				`    if (Array.isArray(${valueVar})) {`,
+				`      for (const i of _slice(${valueVar}.length, ${start}, ${end}, ${step})) {`,
+				`        next.push({ value: ${valueVar}[i], path: [...${nodeVar}.path, i], root: _root, parent: ${valueVar}, parentKey: i });`,
+				'      }',
+				'    }',
+			];
+		}
+		case NodeType.FilterSelector: {
+			// For now: compile filter via interpreter per-element to keep semantics correct.
+			// Step 3 adds a real expression compiler and short-circuiting.
+			if (isSingularQuery(sel.expression as any)) {
+				// no-op; keep TS satisfied
+			}
+			return [
+				`    if (Array.isArray(${valueVar})) {`,
+				`      for (let i = 0; i < ${valueVar}.length; i++) {`,
+				`        const current = ${valueVar}[i];`,
+				`        // fallback filter predicate: evaluate the filter expression by running a tiny query against @`,
+				`        // NOTE: evaluator handles LogicalType + Nothing semantics.` ,
+				`        const ok = _evalFilter(current, ${JSON.stringify(sel.expression)});`,
+				`        if (ok) {`,
+				`          next.push({ value: current, path: [...${nodeVar}.path, i], root: _root, parent: ${valueVar}, parentKey: i });`,
+				`        }`,
+				'      }',
+				'    }',
+			];
+		}
+		default:
+			return [
+				`    // unsupported selector (${(sel as any).type}); fallback to interpreter`,
+				`    return evaluate(_root, ast, options);`,
+			];
+	}
+}
+
```

```diff
diff --git a/packages/jsonpath/compiler/src/codegen.ts b/packages/jsonpath/compiler/src/codegen.ts
index 7c3d84e..80d1b74 100644
--- a/packages/jsonpath/compiler/src/codegen.ts
+++ b/packages/jsonpath/compiler/src/codegen.ts
@@
-import { NodeType, type QueryNode } from '@jsonpath/parser';
+import type { QueryNode } from '@jsonpath/parser';
+import { generateQueryFunctionSource } from './codegen/generators.js';
@@
 export function generateCode(ast: QueryNode): string {
-	// This is a very simplified code generator.
-	// A real one would generate optimized loops for each segment.
-	return `
-    const { evaluate } = require('@jsonpath/evaluator');
-    return (root, options) => evaluate(root, ast, options);
-  `;
+	return generateQueryFunctionSource(ast);
 }
+
```

### Tests [DONE]

Add unit tests that validate code generation returns executable JS and that the compiled function produces the same result as the interpreter for a representative set.

```bash
pnpm --filter @jsonpath/compiler test
```

### STOP & COMMIT [DONE]

- STOP: review generated-source strategy + helper shims.
- COMMIT (VS Code Source Control): `feat(jsonpath-compiler): add codegen module skeleton`

---

## Step 2 — Real JIT Compiler: CompiledQuery + Compiler (P0) [DONE]

**Repo reality note:** [packages/jsonpath/compiler/src/compiler.ts](../../packages/jsonpath/compiler/src/compiler.ts) currently exports a `compile()` that just calls the evaluator; this step replaces it with a `Compiler` class and returns a callable object that also carries `source`, `ast`, and `compilationTime`.

### Patch: add options + compiled query interface

```diff
diff --git a/packages/jsonpath/compiler/src/options.ts b/packages/jsonpath/compiler/src/options.ts
new file mode 100644
index 0000000..9ca2c0e
--- /dev/null
+++ b/packages/jsonpath/compiler/src/options.ts
@@
+export interface CompilerOptions {
+	/** Include a source header and preserve a readable body. */
+	readonly sourceMap?: boolean;
+	/** Favor smaller generated source (may reduce performance). */
+	readonly optimizeForSmall?: boolean;
+	/** Skip some runtime checks (use only in trusted inputs). */
+	readonly unsafe?: boolean;
+	/** Enable caching of compiled queries. */
+	readonly useCache?: boolean;
+	/** Cache size for compiled queries. */
+	readonly cacheSize?: number;
+}
+
+export const defaultCompilerOptions = {
+	sourceMap: false,
+	optimizeForSmall: false,
+	unsafe: false,
+	useCache: true,
+	cacheSize: 100,
+} as const satisfies Required<CompilerOptions>;
+
```

```diff
diff --git a/packages/jsonpath/compiler/src/compiled-query.ts b/packages/jsonpath/compiler/src/compiled-query.ts
new file mode 100644
index 0000000..1d3b96d
--- /dev/null
+++ b/packages/jsonpath/compiler/src/compiled-query.ts
@@
+import type { EvaluatorOptions } from '@jsonpath/core';
+import type { QueryResult } from '@jsonpath/evaluator';
+import type { QueryNode } from '@jsonpath/parser';
+
+export interface CompiledQuery {
+	(root: unknown, options?: EvaluatorOptions): QueryResult;
+
+	/** Generated JavaScript for the compiled query factory. */
+	readonly source: string;
+	/** Original parsed AST. */
+	readonly ast: QueryNode;
+	/** Time spent compiling (ms). */
+	readonly compilationTime: number;
+}
+
```

### Patch: upgrade cache to LRU

```diff
diff --git a/packages/jsonpath/compiler/src/cache.ts b/packages/jsonpath/compiler/src/cache.ts
index 9c7f3b9..f15d7c3 100644
--- a/packages/jsonpath/compiler/src/cache.ts
+++ b/packages/jsonpath/compiler/src/cache.ts
@@
-import type { CompiledQuery } from './compiler.js';
-
-const compiledCache = new Map<string, CompiledQuery>();
-
-export function getCompiledQuery(query: string): CompiledQuery | undefined {
-	return compiledCache.get(query);
-}
-
-export function setCompiledQuery(query: string, compiled: CompiledQuery): void {
-	if (compiledCache.size >= 1000) {
-		const firstKey = compiledCache.keys().next().value;
-		if (firstKey !== undefined) {
-			compiledCache.delete(firstKey);
-		}
-	}
-	compiledCache.set(query, compiled);
-}
+import type { CompiledQuery } from './compiled-query.js';
+
+type Entry = { key: string; value: CompiledQuery; prev: Entry | null; next: Entry | null };
+
+export class LRUCache {
+	private readonly capacity: number;
+	private readonly map = new Map<string, Entry>();
+	private head: Entry | null = null;
+	private tail: Entry | null = null;
+
+	constructor(capacity: number) {
+		if (!Number.isFinite(capacity) || capacity < 1) throw new Error('cacheSize must be >= 1');
+		this.capacity = capacity;
+	}
+
+	get(key: string): CompiledQuery | undefined {
+		const entry = this.map.get(key);
+		if (!entry) return undefined;
+		this.touch(entry);
+		return entry.value;
+	}
+
+	set(key: string, value: CompiledQuery): void {
+		const existing = this.map.get(key);
+		if (existing) {
+			existing.value = value;
+			this.touch(existing);
+			return;
+		}
+		const entry: Entry = { key, value, prev: null, next: this.head };
+		if (this.head) this.head.prev = entry;
+		this.head = entry;
+		if (!this.tail) this.tail = entry;
+		this.map.set(key, entry);
+		if (this.map.size > this.capacity) this.evict();
+	}
+
+	private touch(entry: Entry): void {
+		if (this.head === entry) return;
+		// unlink
+		if (entry.prev) entry.prev.next = entry.next;
+		if (entry.next) entry.next.prev = entry.prev;
+		if (this.tail === entry) this.tail = entry.prev;
+		// move to head
+		entry.prev = null;
+		entry.next = this.head;
+		if (this.head) this.head.prev = entry;
+		this.head = entry;
+		if (!this.tail) this.tail = entry;
+	}
+
+	private evict(): void {
+		const entry = this.tail;
+		if (!entry) return;
+		this.map.delete(entry.key);
+		this.tail = entry.prev;
+		if (this.tail) this.tail.next = null;
+		if (!this.tail) this.head = null;
+	}
+}
+
```

### Patch: compiler class + compile() facade

```diff
diff --git a/packages/jsonpath/compiler/src/compiler.ts b/packages/jsonpath/compiler/src/compiler.ts
index 4b3d3cb..b2a5f29 100644
--- a/packages/jsonpath/compiler/src/compiler.ts
+++ b/packages/jsonpath/compiler/src/compiler.ts
@@
-import { type EvaluatorOptions } from '@jsonpath/core';
-import { evaluate, type QueryResult } from '@jsonpath/evaluator';
-import { type QueryNode } from '@jsonpath/parser';
+import { type EvaluatorOptions, Nothing, getFunction } from '@jsonpath/core';
+import { evaluate, QueryResult } from '@jsonpath/evaluator';
+import { type QueryNode } from '@jsonpath/parser';
+import { LRUCache } from './cache.js';
+import { generateCode } from './codegen.js';
+import type { CompiledQuery } from './compiled-query.js';
+import { defaultCompilerOptions, type CompilerOptions } from './options.js';
@@
-/**
- * A compiled JSONPath query.
- */
-export type CompiledQuery = (
-	root: any,
-	options?: EvaluatorOptions,
-) => QueryResult;
-
-export interface CompilerOptions {
-	readonly useCache?: boolean;
-	readonly optimize?: boolean;
-}
-
-/**
- * Compiles a JSONPath AST into an executable function.
- */
-export function compile(
-	ast: QueryNode,
-	options: CompilerOptions = {},
-): CompiledQuery {
-	return (root: any, evalOptions?: EvaluatorOptions) =>
-		evaluate(root, ast, evalOptions);
-}
+export class Compiler {
+	private readonly options: Required<CompilerOptions>;
+	private readonly cache: LRUCache;
+
+	constructor(options: CompilerOptions = {}) {
+		this.options = { ...defaultCompilerOptions, ...options };
+		this.cache = new LRUCache(this.options.cacheSize);
+	}
+
+	compile(ast: QueryNode): CompiledQuery {
+		const started = performance.now();
+		const cacheKey = ast.source;
+
+		if (this.options.useCache) {
+			const cached = this.cache.get(cacheKey);
+			if (cached) return cached;
+		}
+
+		const body = generateCode(ast);
+		// Create a factory so we can inject dependencies.
+		const factory = new Function(
+			'QueryResult',
+			'evaluate',
+			'getFunction',
+			'Nothing',
+			'ast',
+			body,
+		) as (
+			QueryResult: typeof QueryResult,
+			evaluate: typeof evaluate,
+			getFunction: typeof getFunction,
+			Nothing: typeof Nothing,
+			ast: QueryNode,
+		) => (root: unknown, options?: EvaluatorOptions) => QueryResult;
+
+		const fn = factory(QueryResult, evaluate, getFunction, Nothing, ast);
+		const compiled: CompiledQuery = Object.assign(fn, {
+			source: body,
+			ast,
+			compilationTime: performance.now() - started,
+		});
+
+		if (this.options.useCache) this.cache.set(cacheKey, compiled);
+		return compiled;
+	}
+}
+
+export function compile(ast: QueryNode, options: CompilerOptions = {}): CompiledQuery {
+	return new Compiler(options).compile(ast);
+}
+
```

### Patch: exports

```diff
diff --git a/packages/jsonpath/compiler/src/index.ts b/packages/jsonpath/compiler/src/index.ts
index 84d7e16..c0f66a8 100644
--- a/packages/jsonpath/compiler/src/index.ts
+++ b/packages/jsonpath/compiler/src/index.ts
@@
 export * from './compiler.js';
 export * from './codegen.js';
+export * from './compiled-query.js';
+export * from './options.js';
+
```

### Tests

```bash
pnpm --filter @jsonpath/compiler test
```

### STOP & COMMIT

- STOP: ensure `@jsonpath/compiler` tests are green.
- COMMIT (VS Code Source Control): `feat(jsonpath-compiler): add Compiler and CompiledQuery`

---

## Step 3 — Compiler Optimizations (P0) [DONE]

This step is the first true performance pass. It should:

- Inline single-name and single-index selectors into straight-line property access (no loops).
- Implement a compiled filter predicate (no per-item interpreter fallback).
- Add constant-folding for literal-only binary/unary expressions.

**Minimal acceptance criteria**

- Generated source for `$.name` contains exactly one property access.
- `$[?(@.x && false)]` does not read `@.x`.

**Tests**

```bash
pnpm --filter @jsonpath/compiler test
```

### STOP & COMMIT

- STOP: confirm minimal acceptance criteria + tests are green.
- COMMIT (VS Code Source Control): `perf(jsonpath-compiler): add initial optimization passes`

---

## Step 4 — RFC 9535 Critical Compliance (P0) [DONE]

**Repo reality note:** `match()` and `search()` are implemented in [packages/jsonpath/functions/src/registry.ts](../../packages/jsonpath/functions/src/registry.ts), not in `match.ts` / `search.ts`.

### Patch: return LogicalFalse on invalid pattern

```diff
diff --git a/packages/jsonpath/functions/src/registry.ts b/packages/jsonpath/functions/src/registry.ts
index 9c6c6f9..9b4a3dd 100644
--- a/packages/jsonpath/functions/src/registry.ts
+++ b/packages/jsonpath/functions/src/registry.ts
@@
 export const matchFn: FunctionDefinition<
-	[unknown, unknown],
-	boolean | undefined
+	[unknown, unknown],
+	boolean
 > = {
@@
 	evaluate: (val: unknown, pattern: unknown) => {
-		if (typeof pattern !== 'string') return undefined;
-		if (typeof val !== 'string') return false;
+		if (typeof pattern !== 'string') return false;
+		if (typeof val !== 'string') return false;
@@
-		const validation = validateIRegexp(pattern);
-		if (!validation.valid) return undefined;
+		const validation = validateIRegexp(pattern);
+		if (!validation.valid) return false;
@@
 		try {
 			const regex = convertIRegexp(`^${pattern}$`);
 			return regex.test(val);
 		} catch {
-			return undefined;
+			return false;
 		}
 	},
 };
@@
 export const searchFn: FunctionDefinition<
-	[unknown, unknown],
-	boolean | undefined
+	[unknown, unknown],
+	boolean
 > = {
@@
 	evaluate: (val: unknown, pattern: unknown) => {
-		if (typeof pattern !== 'string') return undefined;
-		if (typeof val !== 'string') return false;
+		if (typeof pattern !== 'string') return false;
+		if (typeof val !== 'string') return false;
@@
-		const validation = validateIRegexp(pattern);
-		if (!validation.valid) return undefined;
+		const validation = validateIRegexp(pattern);
+		if (!validation.valid) return false;
@@
 		try {
 			const regex = convertIRegexp(pattern);
 			return regex.test(val);
 		} catch {
-			return undefined;
+			return false;
 		}
 	},
 };

```

### Patch: add tests for invalid patterns

```diff
diff --git a/packages/jsonpath/functions/src/__tests__/functions.spec.ts b/packages/jsonpath/functions/src/__tests__/functions.spec.ts
index 6ac23e6..df41a67 100644
--- a/packages/jsonpath/functions/src/__tests__/functions.spec.ts
+++ b/packages/jsonpath/functions/src/__tests__/functions.spec.ts
@@
 	it('match() should perform full regex match', () => {
 		const match = getFunction('match')!;
 		expect(match.evaluate('abc', 'a.c')).toBe(true);
 		expect(match.evaluate('abcd', 'a.c')).toBe(false);
+		// RFC 9535: invalid pattern => LogicalFalse
+		expect(match.evaluate('abc', '[')).toBe(false);
+		expect(match.evaluate('abc', 123 as any)).toBe(false);
 	});
@@
 	it('search() should perform partial regex match', () => {
 		const search = getFunction('search')!;
 		expect(search.evaluate('abcd', 'bc')).toBe(true);
 		expect(search.evaluate('abcd', 'ef')).toBe(false);
+		// RFC 9535: invalid pattern => LogicalFalse
+		expect(search.evaluate('abcd', '[')).toBe(false);
+		expect(search.evaluate('abcd', 123 as any)).toBe(false);
 	});
```

### Tests

```bash
pnpm --filter @jsonpath/functions test
pnpm --filter @jsonpath/evaluator test
```

### STOP & COMMIT

- STOP: ensure `@jsonpath/functions` + `@jsonpath/evaluator` tests are green.
- COMMIT (VS Code Source Control): `fix(jsonpath-functions): match/search return false for invalid patterns`

---

## Step 5 — Run + Pass RFC 9535 Compliance Test Suite (P0) [DONE]

**Repo reality note:** compliance suite currently lives in [packages/jsonpath/compliance-suite/src/compliance.spec.ts](../../packages/jsonpath/compliance-suite/src/compliance.spec.ts). The plan’s `runner.ts`/`index.spec.ts` don’t exist yet; this step introduces `runner.ts` and updates the existing spec to use it.

### Patch: add a reusable runner

```diff
diff --git a/packages/jsonpath/compliance-suite/src/runner.ts b/packages/jsonpath/compliance-suite/src/runner.ts
new file mode 100644
index 0000000..f12ae6a
--- /dev/null
+++ b/packages/jsonpath/compliance-suite/src/runner.ts
@@
+import { readFileSync } from 'node:fs';
+import { join } from 'node:path';
+
+export interface CtsTestCase {
+	name: string;
+	selector: string;
+	document?: any;
+	result?: any[];
+	results?: any[][];
+	invalid_selector?: boolean;
+}
+
+export interface ComplianceTestSuite {
+	tests: CtsTestCase[];
+}
+
+export function loadCts(): ComplianceTestSuite {
+	const ctsPath = join(
+		process.cwd(),
+		'../../../node_modules/jsonpath-compliance-test-suite/cts.json',
+	);
+	return JSON.parse(readFileSync(ctsPath, 'utf-8')) as ComplianceTestSuite;
+}
+
+export function matchesOneOf(actual: unknown, expectedList: unknown[]): boolean {
+	const a = JSON.stringify(actual);
+	return expectedList.some((e) => JSON.stringify(e) === a);
+}
+
```

```diff
diff --git a/packages/jsonpath/compliance-suite/src/compliance.spec.ts b/packages/jsonpath/compliance-suite/src/compliance.spec.ts
index 0ef1b62..c574b33 100644
--- a/packages/jsonpath/compliance-suite/src/compliance.spec.ts
+++ b/packages/jsonpath/compliance-suite/src/compliance.spec.ts
@@
 import { describe, it, expect } from 'vitest';
 import { query } from '@jsonpath/jsonpath';
-import { readFileSync } from 'node:fs';
-import { join } from 'node:path';
-
-interface TestCase {
-	name: string;
-	selector: string;
-	document?: any;
-	result?: any[];
-	results?: any[][];
-	invalid_selector?: boolean;
-}
-
-interface ComplianceTestSuite {
-	tests: TestCase[];
-}
-
-const ctsPath = join(
-	process.cwd(),
-	'../../../node_modules/jsonpath-compliance-test-suite/cts.json',
-);
-const cts: ComplianceTestSuite = JSON.parse(readFileSync(ctsPath, 'utf-8'));
+import { loadCts, matchesOneOf } from './runner.js';
+
+const cts = loadCts();
@@
 			} else {
 				const result = query(test.document, test.selector).values();
@@
 				if (test.results) {
 					// Some tests have multiple valid results
-					const matched = test.results.some(
-						(expected) => JSON.stringify(result) === JSON.stringify(expected),
-					);
+					const matched = matchesOneOf(result, test.results);
 					expect(
 						matched,
 						`Expected one of ${JSON.stringify(test.results)}, got ${JSON.stringify(result)}`,
 					).toBe(true);
 				} else if (test.result) {
 					expect(result).toEqual(test.result);
 				}
 			}
 		});
 	});
 });
```

### Tests

```bash
pnpm --filter @jsonpath/compliance-suite test
```

### STOP & COMMIT

- STOP: ensure `@jsonpath/compliance-suite` tests are green.
- COMMIT (VS Code Source Control): `test(compliance-suite): refactor CTS runner`

---

## Step 6 — Parser AST Gaps + Metadata (P1) [DONE]

**Repo reality note:** the plan references `packages/jsonpath/parser/src/types.ts` and `core/src/types.ts`. In this repo, the parser AST lives in `packages/jsonpath/parser/src/nodes.ts` and already includes:

- `QueryNode.root` (boolean: `$` vs `@`)
- `QueryNode.source` (raw substring)
- `SliceSelectorNode` uses `start/end/step` already
- `ParentSelector` / `PropertySelector` are already defined

This step focuses on filling the remaining spec metadata gaps without gratuitous type churn.

**Files (repo reality):**

- `packages/jsonpath/parser/src/nodes.ts`
- `packages/jsonpath/parser/src/parser.ts`
- `packages/jsonpath/parser/src/__tests__/parser.spec.ts`

**Work checklist**

- [x] Add `NameSelectorNode.quoted: boolean` (true when selector was quoted, false otherwise).
- [x] Add `LiteralNode.raw: string` (original literal source including quotes/escapes).
- [x] Ensure filter queries use `QueryNode.root === false` for `@` and `root === true` for `$`.
- [x] Confirm binary operators cover logical + comparison (repo uses `BinaryExpr` with string operators; no separate `LogicalExpr` type needed).

**RGR/TDD**

- [x] Red: add parser tests asserting `quoted` and `raw` values.
- [x] Green: implement parsing to populate those properties.
- [x] Refactor: ensure no downstream consumer breaks (evaluator, compiler codegen, transform/walk).

**Verification**

- [x] Run parser unit tests.
- [x] Run any evaluator tests that rely on parsing filters.

**STOP & COMMIT [DONE]**

- [x] STOP: confirm parser output is stable for representative queries.
- [x] COMMIT (VS Code Source Control): `feat(jsonpath-parser): add selector/literal metadata`

---

## Step 7 — Parser Utilities: `parseExpression()` + enter/leave walk (P1) [DONE]

**Repo reality note:** `ParserOptions.strict` already exists in `packages/jsonpath/parser/src/parser.ts`. There is no `visitor.ts`; the traversal utility is `packages/jsonpath/parser/src/walk.ts`.

**Files (repo reality):**

- `packages/jsonpath/parser/src/parser.ts`
- `packages/jsonpath/parser/src/walk.ts`
- `packages/jsonpath/parser/src/index.ts`
- `packages/jsonpath/parser/src/__tests__/utils.spec.ts` (or add a new spec)

**Work checklist**

- [x] Implement `parseExpression(input: string, options?: ParserOptions): ExpressionNode`.
- [x] Export `parseExpression` from `packages/jsonpath/parser/src/index.ts`.
- [x] Extend `walk()` to support `enter` / `leave` hooks without breaking the existing per-node visitor mapping.
  - [x] Keep the current `Visitor` shape working.
  - [x] Add an alternate visitor shape: `{ enter?: (node,parent)=>void; leave?: (node,parent)=>void }`.

**Verification**

- [x] Tests cover `parseExpression('@.price > 10')`.
- [x] Tests cover walk ordering: enter called before children, leave after.

**STOP & COMMIT [DONE]**

- [x] STOP: confirm existing visitors still work unchanged.
- [x] COMMIT (VS Code Source Control): `feat(jsonpath-parser): add parseExpression and enter/leave walk`

---

## Step 8 — Evaluator Features: true lazy `stream()` + timeout model (P1) [DONE]

**Repo reality note:** the facade already exports a generator `stream()` in `packages/jsonpath/jsonpath/src/facade.ts`, but it currently yields from an eager `QueryResult`. This step is about adding a real lazy evaluator stream in `@jsonpath/evaluator`.

**Files (repo reality):**

- `packages/jsonpath/evaluator/src/evaluator.ts`
- `packages/jsonpath/evaluator/src/index.ts`
- `packages/jsonpath/evaluator/src/__tests__/*` (add as needed)

**Work checklist**

- [x] Add `stream(root, ast, options?)` at the evaluator package level that yields nodes/values incrementally.
- [x] Preserve the existing exported `evaluate()` plugin lifecycle wrapper (beforeEvaluate/afterEvaluate/onError).
- [x] Align timeout behavior with spec intent:
  - [x] Keep existing `Date.now()`-based timeout as baseline.
  - [x] If switching to AbortController, ensure it composes with plugin manager and does not break current `EvaluatorOptions`.
- [x] Update facade `stream()` to delegate to evaluator `stream()` when available.

**Verification**

- [x] Tests prove early termination stops further evaluation.
- [x] Tests prove timeout interrupts streaming.

**STOP & COMMIT [DONE]**

- [x] COMMIT (VS Code Source Control): `feat(jsonpath-evaluator): add lazy stream evaluation`

---

## Step 9 — I-Regexp (RFC 9485) Compliance Hardening (P1) [DONE]

**Repo reality note:** `@jsonpath/functions` uses `packages/jsonpath/functions/src/i-regexp.ts` and `packages/jsonpath/functions/src/registry.ts` for `match`/`search`.

**Files (repo reality):**

- `packages/jsonpath/functions/src/i-regexp.ts`
- `packages/jsonpath/functions/src/registry.ts`
- `packages/jsonpath/functions/src/__tests__/functions.spec.ts`

**Work checklist**

- [x] Ensure invalid I-Regexp patterns return `false` (LogicalFalse), not `undefined`.
- [x] Add RFC 9485 example coverage to tests.
- [x] Keep behavior conservative: unsupported constructs should produce `false`, not throw.

**STOP & COMMIT [DONE]**

- [x] COMMIT (VS Code Source Control): `feat(jsonpath-functions): harden i-regexp handling`

---

## Step 10 — JSON Pointer URI Fragment Identifier Support (P1) [DONE]

**Repo reality note:** pointer implementation lives in `packages/jsonpath/pointer/src/pointer.ts` and exports from `packages/jsonpath/pointer/src/index.ts`.

**Work checklist**

- [x] Implement `toPointer(path, { fragment: true })`.
- [x] Support `#` prefix and percent-encoding in `fromPointer`.
- [x] Add tests for URI fragment pointers.

**STOP & COMMIT [DONE]**

- [x] COMMIT (VS Code Source Control): `feat(jsonpath-pointer): add URI fragment support`

### Patch: add `fragment.ts`

```diff
diff --git a/packages/jsonpath/pointer/src/fragment.ts b/packages/jsonpath/pointer/src/fragment.ts
new file mode 100644
index 0000000..0000000
--- /dev/null
+++ b/packages/jsonpath/pointer/src/fragment.ts
@@
+import { PointerSyntaxError } from './errors.js';
+
+function assertValidPointer(pointer: string, source: string): void {
+	if (pointer === '') return;
+	if (!pointer.startsWith('/')) {
+		throw new PointerSyntaxError(
+			'Invalid JSON Pointer URI fragment: decoded pointer must start with "/" or be empty',
+			{ path: source },
+		);
+	}
+
+	const parts = pointer.split('/').slice(1);
+	for (const part of parts) {
+		if (/~[^01]/.test(part) || part.endsWith('~')) {
+			throw new PointerSyntaxError(
+				`Invalid JSON Pointer URI fragment: invalid tilde sequence in segment "${part}"`,
+				{ path: source },
+			);
+		}
+	}
+}
+
+function encodeFragmentPointer(pointer: string): string {
+	// RFC 6901 §6: percent-encode as UTF-8. Keep '/' unescaped for readability.
+	return encodeURIComponent(pointer).replaceAll('%2F', '/');
+}
+
+export function toURIFragment(pointer: string): string {
+	assertValidPointer(pointer, pointer);
+	return `#${encodeFragmentPointer(pointer)}`;
+}
+
+export function fromURIFragment(fragment: string): string {
+	const raw = fragment.startsWith('#') ? fragment.slice(1) : fragment;
+	if (raw === '') return '';
+
+	let decoded: string;
+	try {
+		decoded = decodeURIComponent(raw);
+	} catch (cause) {
+		throw new PointerSyntaxError(
+			'Invalid JSON Pointer URI fragment: percent-decoding failed',
+			{ path: fragment, cause: cause as Error },
+		);
+	}
+
+	assertValidPointer(decoded, fragment);
+	return decoded;
+}
```

### Patch: extend `JSONPointer` + exports

```diff
diff --git a/packages/jsonpath/pointer/src/pointer.ts b/packages/jsonpath/pointer/src/pointer.ts
index 0000000..0000000 100644
--- a/packages/jsonpath/pointer/src/pointer.ts
+++ b/packages/jsonpath/pointer/src/pointer.ts
@@
 import { PointerSyntaxError } from './errors.js';
+import { toURIFragment as toPointerURIFragment } from './fragment.js';
@@
 	toString(): string {
 		return JSONPointer.format(this.tokens);
 	}
+
+	/** RFC 6901 §6: URI fragment identifier representation. */
+	toURIFragment(): string {
+		return toPointerURIFragment(this.toString());
+	}
@@
 	toJSON(): string {
 		return this.toString();
 	}
 }
```

```diff
diff --git a/packages/jsonpath/pointer/src/index.ts b/packages/jsonpath/pointer/src/index.ts
index 0000000..0000000 100644
--- a/packages/jsonpath/pointer/src/index.ts
+++ b/packages/jsonpath/pointer/src/index.ts
@@
 export * from './pointer.js';
+export * from './fragment.js';
 export * from './errors.js';
 export * from './normalize.js';
 export * from './relative-pointer.js';
 export * from './mutations.js';
 export * from './utils.js';
 export * from './validation.js';
 export * from './resolve.js';
```

### Patch: tests

```diff
diff --git a/packages/jsonpath/pointer/src/__tests__/fragment.spec.ts b/packages/jsonpath/pointer/src/__tests__/fragment.spec.ts
new file mode 100644
index 0000000..0000000
--- /dev/null
+++ b/packages/jsonpath/pointer/src/__tests__/fragment.spec.ts
@@
+import { describe, it, expect } from 'vitest';
+import { JSONPointer, fromURIFragment, toURIFragment } from '../index.js';
+import { PointerSyntaxError } from '../errors.js';
+
+describe('RFC 6901 §6 - URI fragment identifier representation', () => {
+	it('encodes/decodes empty pointer as empty fragment', () => {
+		expect(toURIFragment('')).toBe('#');
+		expect(fromURIFragment('#')).toBe('');
+	});
+
+	it('encodes/decodes simple pointers', () => {
+		expect(toURIFragment('/foo')).toBe('#/foo');
+		expect(fromURIFragment('#/foo')).toBe('/foo');
+	});
+
+	it('percent-encodes characters that must be escaped in fragments', () => {
+		expect(toURIFragment('/ ')).toBe('#/%20');
+		expect(toURIFragment('/k"l')).toBe('#/k%22l');
+		expect(toURIFragment('/c%d')).toBe('#/c%25d');
+
+		expect(fromURIFragment('#/%20')).toBe('/ ');
+		expect(fromURIFragment('#/k%22l')).toBe('/k"l');
+		expect(fromURIFragment('#/c%25d')).toBe('/c%d');
+	});
+
+	it('accepts fragment content without leading "#"', () => {
+		expect(fromURIFragment('/foo')).toBe('/foo');
+	});
+
+	it('throws for invalid decoded pointers', () => {
+		expect(() => fromURIFragment('#foo')).toThrow(PointerSyntaxError);
+	});
+
+	it('throws for invalid percent-encoding', () => {
+		expect(() => fromURIFragment('#%E0%A4%A')).toThrow(PointerSyntaxError);
+	});
+
+	it('JSONPointer#toURIFragment mirrors toURIFragment(pointerString)', () => {
+		expect(new JSONPointer('/foo').toURIFragment()).toBe('#/foo');
+		expect(new JSONPointer('').toURIFragment()).toBe('#');
+	});
+});
```

**STOP & COMMIT**

- [ ] COMMIT (VS Code Source Control): `feat(jsonpath-pointer): add URI fragment helpers`

---

## Step 11 — Complete JSON Patch Features (P2)

**Repo reality note:** `@jsonpath/patch` already includes `ApplyOptions.before/after`, `validate()`, and `applyWithErrors()` in `packages/jsonpath/patch/src/patch.ts`, and a `PatchBuilder` with `when/ifExists/replaceAll/removeAll` in `packages/jsonpath/patch/src/builder.ts`.

This step closes the remaining gaps from the plan:

- `mutate` default should become `false` (breaking)
- `validate` option should be respected (it currently exists on `ApplyOptions` but is not used)
- Diff options: `detectMoves`, `includeTests`
- JSONPath-based ops module (plan’s `jsonpath-ops.ts`)
- Export individual op helpers (if not already)

**Files (repo reality):**

- `packages/jsonpath/patch/src/patch.ts`
- `packages/jsonpath/patch/src/diff.ts`
- `packages/jsonpath/patch/src/builder.ts`
- `packages/jsonpath/patch/src/index.ts`
- `packages/jsonpath/patch/src/jsonpath-ops.ts` (new)
- `packages/jsonpath/patch/src/__tests__/*` (extend)

**Work checklist**

- [ ] Change `ApplyOptions.mutate` default from `true` → `false` and update internal call sites (notably `packages/jsonpath/jsonpath/src/facade.ts`’s `patch()` wrapper).
- [ ] Wire `ApplyOptions.validate`: when true, run `validate(patch)` prior to application.
- [ ] Add `jsonpath-ops.ts` with helpers that operate over matches from a JSONPath query (e.g., `replaceAll`, `removeAll`) and share logic with `PatchBuilder`.
- [ ] Expand `diff()` to accept `DiffOptions` (at least `invertible`, plus the plan’s requested options).

**STOP & COMMIT**

- [ ] COMMIT (VS Code Source Control): `feat(jsonpath-patch): complete spec patch utilities`

---

## Step 12 — Facade Utilities (P2) (Plan has duplicate “Step 12”)

**Plan correction:** `plan.md` contains a duplicated “Step 12” block. Treat Step 11 as JSON Patch work, and Step 12 as JSONPath facade utilities.

**Repo reality note:** the facade already exists and exports `query/queryValues/queryPaths/value/exists/toPointer/toPointers/stream/pointer/patch/mergePatch`.

**Files (repo reality):**

- `packages/jsonpath/jsonpath/src/query-set.ts`
- `packages/jsonpath/jsonpath/src/transform.ts`
- `packages/jsonpath/jsonpath/src/merge.ts`
- `packages/jsonpath/jsonpath/src/secure.ts`
- `packages/jsonpath/jsonpath/src/index.ts`

**Work checklist**

- [ ] Ensure `createQuerySet()` matches the spec contract (queryAll, valuesAll, pointersAll, etc.).
- [ ] Ensure `transformAll()` and `projectWith()` match spec behavior and are covered by tests.
- [ ] Ensure `merge()` / `mergeWith()` handle deep merge semantics (object merge, array behavior per spec).
- [ ] Ensure `secureQuery()` enforces the documented secure defaults and option overrides.
- [ ] Ensure exports are deliberate and stable in `packages/jsonpath/jsonpath/src/index.ts`.

**STOP & COMMIT**

- [ ] COMMIT (VS Code Source Control): `feat(jsonpath): complete facade utilities`

---

## Step 13 — plugin-extended selectors (P2)

**Repo reality note:** `ParentSelector` / `PropertySelector` exist in the parser AST, and `packages/jsonpath/plugin-extended` exists in this repo. Ensure end-to-end wiring: lexer → parser → evaluator registry → plugin package.

**Work checklist**

- [ ] Implement parent selector (`^`) behavior and register it.
- [ ] Implement property-name selector (`~`) behavior and register it.
- [ ] Add tests proving `$..author^` and `$.*~` semantics.

**STOP & COMMIT**

- [ ] COMMIT (VS Code Source Control): `feat(jsonpath-plugin-extended): implement ^ and ~ selectors`

---

## Step 14 — plugin-arithmetic operators (P2)

**Repo reality note:** adding arithmetic requires tokenization in `@jsonpath/lexer` and precedence support in `@jsonpath/parser`.

**Work checklist**

- [ ] Extend lexer to tokenize `+ - * / %` appropriately.
- [ ] Extend parser precedence map to include arithmetic operators.
- [ ] Implement operators in `packages/jsonpath/plugin-arithmetic/src/operators/*` and register them.
- [ ] Add evaluator tests covering arithmetic in filters.

**STOP & COMMIT**

- [ ] COMMIT (VS Code Source Control): `feat(jsonpath-plugin-arithmetic): add arithmetic operators`

---

## Step 15 — plugin-extras functions (P2)

**Work checklist**

- [ ] Implement the function set described in the plan (string/array/aggregation/utility).
- [ ] Register functions with the function registry.
- [ ] Add unit tests for each function + type errors.

**STOP & COMMIT**

- [ ] COMMIT (VS Code Source Control): `feat(jsonpath-plugin-extras): implement extras function pack`

---

## Step 16 — FilterBuilder in path-builder (P2)

**Work checklist**

- [ ] Add `FilterBuilder` for building filter expressions.
- [ ] Ensure builder output round-trips through `parseExpression()`.
- [ ] Add unit tests for complex nested expressions.

**STOP & COMMIT**

- [ ] COMMIT (VS Code Source Control): `feat(jsonpath-path-builder): add FilterBuilder`

---

## Step 17 — Core Infrastructure Improvements (P2/P3)

**Work checklist**

- [ ] Move `LexerInterface` type (or equivalent) into `@jsonpath/core` if currently duplicated.
- [ ] Export lexer character code constants.
- [ ] Implement plugin dependency resolution + version constraints in the core plugin manager.

**STOP & COMMIT**

- [ ] COMMIT (VS Code Source Control): `refactor(jsonpath-core): improve plugin infra`

---

## Step 18 — Performance Benchmarks (P2)

**Repo reality note:** `packages/jsonpath/benchmarks` exists. Add benchmark files there and keep CI non-blocking.

**Work checklist**

- [ ] Add evaluator/compiler/pointer/patch benches.
- [ ] Record a baseline in the PR description (not in source).

**STOP & COMMIT**

- [ ] COMMIT (VS Code Source Control): `test(jsonpath-benchmarks): add initial benchmark suite`

---

## Step 19 — Documentation and API Cleanup (P3)

**Work checklist**

- [ ] Update `docs/api/jsonpath.md` and related API docs for new/changed exports.
- [ ] Ensure examples import from the intended facade packages.
- [ ] Keep docs consistent with the no-barrel export guidance in the monorepo.

**STOP & COMMIT**

- [ ] COMMIT (VS Code Source Control): `docs(jsonpath): refresh api docs for remediation`

---

## Step 20 — Bundle Size Optimization (P3)

**Work checklist**

- [ ] Audit package `exports` maps for tree-shakeable granular entrypoints.
- [ ] Ensure no accidental heavy re-exports from the facade.
- [ ] Add bundle-size reporting (non-blocking) if CI supports it.

**STOP & COMMIT**

- [ ] COMMIT (VS Code Source Control): `perf(jsonpath): optimize bundle exports`
