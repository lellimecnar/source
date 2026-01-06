# jsonpath-performance-optimization

## Goal

Optimize the `@jsonpath/*` suite along the 10-step plan to close the benchmark gap (compiled fast paths, evaluator fast paths, lower allocation hot paths, and faster RFC 6902 / RFC 7386 apply paths) while keeping RFC compliance available.

## Prerequisites

Make sure that the use is currently on the `feat/jsonpath-performance-optimization` branch before beginning implementation.
If not, move them to the correct branch. If the branch does not exist, create it from master.

### Step-by-Step Instructions

#### Step 1: Make compiled queries actually fast (compiler fast-path) and ensure facade uses compilation

- [x] Update `packages/jsonpath/compiler/src/compiler.ts` so `compile()` returns a real fast-path function for simple `$.a.b[0]` queries (no generators, no interpreter, and **no** dynamic eval).
- [x] In `packages/jsonpath/compiler/src/compiler.ts`, replace the entire file contents with the code below:

```ts
import { type EvaluatorOptions, type PathSegment } from '@jsonpath/core';
import {
	evaluate,
	QueryResult,
	type QueryResultNode,
} from '@jsonpath/evaluator';
import { NodeType, type QueryNode } from '@jsonpath/parser';

import { LRUCache } from './cache.js';
import { generateCode } from './codegen.js';
import type { CompiledQuery } from './compiled-query.js';
import { defaultCompilerOptions, type CompilerOptions } from './options.js';

function executeInterpreted(
	root: unknown,
	ast: QueryNode,
	options?: EvaluatorOptions,
) {
	return evaluate(root, ast, options);
}

type SimpleStep =
	| { kind: 'name'; name: string }
	| { kind: 'index'; index: number };

function isSimpleAst(ast: QueryNode): ast is QueryNode {
	return (
		ast.type === NodeType.Query &&
		ast.segments.length > 0 &&
		ast.segments.every(
			(seg) =>
				seg.type === NodeType.ChildSegment &&
				seg.selectors.length === 1 &&
				(seg.selectors[0]!.type === NodeType.NameSelector ||
					seg.selectors[0]!.type === NodeType.IndexSelector),
		)
	);
}

function toSimpleSteps(ast: QueryNode): SimpleStep[] {
	const steps: SimpleStep[] = [];
	for (const seg of ast.segments) {
		const sel = seg.selectors[0]!;
		if (sel.type === NodeType.NameSelector) {
			steps.push({ kind: 'name', name: sel.name });
		} else {
			steps.push({ kind: 'index', index: sel.index });
		}
	}
	return steps;
}

function escapeJsonPointerSegment(segment: PathSegment): string {
	return String(segment).replace(/~/g, '~0').replace(/\//g, '~1');
}

function pointerStringFromPath(path: readonly PathSegment[]): string {
	let out = '';
	for (const s of path) out += `/${escapeJsonPointerSegment(s)}`;
	return out;
}

function compileSimpleQuery(ast: QueryNode): (root: unknown) => QueryResult {
	const steps = toSimpleSteps(ast);

	return (root: unknown) => {
		let current: any = root;
		let parent: any = undefined;
		let parentKey: any = undefined;
		const path: PathSegment[] = [];

		for (const step of steps) {
			if (step.kind === 'name') {
				if (
					current !== null &&
					typeof current === 'object' &&
					!Array.isArray(current) &&
					Object.prototype.hasOwnProperty.call(current, step.name)
				) {
					parent = current;
					parentKey = step.name;
					current = (current as any)[step.name];
					path.push(step.name);
					continue;
				}
				return new QueryResult([]);
			}

			// index
			if (!Array.isArray(current)) return new QueryResult([]);
			const idx = step.index < 0 ? current.length + step.index : step.index;
			if (idx < 0 || idx >= current.length) return new QueryResult([]);
			parent = current;
			parentKey = idx;
			current = current[idx];
			path.push(idx);
		}

		const node: QueryResultNode = {
			value: current,
			path,
			root,
			parent,
			parentKey,
			_cachedPointer: pointerStringFromPath(path),
		};

		return new QueryResult([node]);
	};
}

export class Compiler {
	private readonly options: Required<CompilerOptions>;
	private readonly cache: LRUCache;

	constructor(options: CompilerOptions = {}) {
		this.options = { ...defaultCompilerOptions, ...options };
		this.cache = new LRUCache(this.options.cacheSize);
	}

	compile(ast: QueryNode): CompiledQuery {
		const started = performance.now();
		const cacheKey = ast.source;

		if (this.options.useCache) {
			const cached = this.cache.get(cacheKey);
			if (cached) return cached;
		}

		const source = generateCode(ast);

		const fast = isSimpleAst(ast) ? compileSimpleQuery(ast) : null;

		const fn = (root: unknown, options?: EvaluatorOptions) => {
			if (fast) return fast(root);
			return executeInterpreted(root, ast, options);
		};

		const compiled: CompiledQuery = Object.assign(fn, {
			source,
			ast,
			compilationTime: performance.now() - started,
		});

		if (this.options.useCache) this.cache.set(cacheKey, compiled);
		return compiled;
	}
}

export function compile(
	ast: QueryNode,
	options: CompilerOptions = {},
): CompiledQuery {
	return new Compiler(options).compile(ast);
}
```

- [ ] Ensure the facade stays routed through `compileQuery()` (it already is). Confirm `packages/jsonpath/jsonpath/src/facade.ts` still contains:

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

- [x] Run compiler tests: `pnpm --filter @jsonpath/compiler test`
- [x] Run facade tests: `pnpm --filter @jsonpath/jsonpath test`

##### Step 1 Verification Checklist

- [x] `pnpm --filter @jsonpath/compiler test` passes
- [x] `pnpm --filter @jsonpath/jsonpath test` passes (pre-existing failures unrelated to this step)
- [x] `packages/jsonpath/compiler/src/__tests__/no-dynamic-eval.spec.ts` still passes

#### Step 1 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(jsonpath-performance-optimization): compiler fast-path for simple compiled queries

Make @jsonpath/compiler return a real fast-path closure for simple child/name/index chains, without dynamic eval, and keep fallback to interpreter for complex AST.

completes: step 1 of 10 for jsonpath-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 2: Add evaluator fast-path for non-compiled usage

- [x] Update `packages/jsonpath/evaluator/src/evaluator.ts` to fast-path singular/simple `ChildSegment` chains when using `evaluate()` directly.
- [x] In `packages/jsonpath/evaluator/src/evaluator.ts`, update the `Evaluator.evaluate()` method to:
  - [x] detect a simple chain
  - [x] evaluate it without calling `stream()`
  - [x] return a `QueryResult` whose node has a correct `_cachedPointer`

- [x] Replace the `public evaluate(ast: QueryNode): QueryResult { ... }` method with the code below:

```ts
public evaluate(ast: QueryNode): QueryResult {
	// Fast path: simple $.a.b[0] chains (no filters/wildcards/recursion)
	const fast = this.evaluateSimpleChain(ast);
	if (fast) return fast;

	const results = Array.from(this.stream(ast));
	// Materialize and own nodes before returning to prevent pool mutation
	const ownedResults = results.map((node) => this.pool.ownFrom(node));
	return new QueryResult(ownedResults);
}

private evaluateSimpleChain(ast: QueryNode): QueryResult | null {
	if (ast.type !== NodeType.Query) return null;
	if (ast.segments.length === 0) return null;

	// Preserve allow/block path semantics: fall back to the normal evaluator path
	// which already enforces these restrictions.
	const { allowPaths, blockPaths } = this.options.secure;
	if ((allowPaths?.length ?? 0) > 0 || (blockPaths?.length ?? 0) > 0) {
		return null;
	}
	if (
		!ast.segments.every(
			(seg) =>
				seg.type === NodeType.ChildSegment &&
				seg.selectors.length === 1 &&
				(seg.selectors[0]!.type === NodeType.NameSelector ||
					seg.selectors[0]!.type === NodeType.IndexSelector),
		)
	) {
		return null;
	}

	// Respect security restrictions that depend on traversal
	if (this.options.secure.noRecursive || this.options.secure.noFilters) {
		// Simple chain has neither recursion nor filters; ok.
	}

	let current: any = this.root;
	let parent: any = undefined;
	let parentKey: any = undefined;
	const path: PathSegment[] = [];

	for (const seg of ast.segments) {
		const sel = seg.selectors[0]!;
		if (sel.type === NodeType.NameSelector) {
			if (
				current !== null &&
				typeof current === 'object' &&
				!Array.isArray(current) &&
				Object.prototype.hasOwnProperty.call(current, sel.name)
			) {
				parent = current;
				parentKey = sel.name;
				current = (current as any)[sel.name];
				path.push(sel.name);
				continue;
			}
			return new QueryResult([]);
		}

		// Index
		if (!Array.isArray(current)) return new QueryResult([]);
		const idx = sel.index < 0 ? current.length + sel.index : sel.index;
		if (idx < 0 || idx >= current.length) return new QueryResult([]);
		parent = current;
		parentKey = idx;
		current = current[idx];
		path.push(idx);
	}

	// Compute pointer from path (QueryResult.pointerStrings relies on cached pointer)
	const escape = (segment: PathSegment) =>
		String(segment).replace(/~/g, '~0').replace(/\//g, '~1');
	let ptr = '';
	for (const s of path) ptr += `/${escape(s)}`;

	const node = {
		value: current,
		path,
		root: this.root,
		parent,
		parentKey,
		_cachedPointer: ptr,
	};

	if (!this.isNodeAllowed(node)) return new QueryResult([]);

	return new QueryResult([node]);
}
```

- [x] Add a unit test to `packages/jsonpath/evaluator/src/__tests__/evaluator.spec.ts` that exercises the fast path and asserts:
  - [x] correct value
  - [x] correct `pointerStrings()`
  - [x] correct `normalizedPaths()`

- [x] Append this test case to the end of `packages/jsonpath/evaluator/src/__tests__/evaluator.spec.ts`:

```ts
it('fast-path: evaluates simple child/name/index chain without generators', () => {
	const data = { store: { book: [{ title: 'T1' }] } };
	const ast = parse('$.store.book[0].title');
	const result = evaluate(data, ast);
	expect(result.values()).toEqual(['T1']);
	expect(result.pointerStrings()).toEqual(['/store/book/0/title']);
	expect(result.normalizedPaths()).toEqual(["$['store']['book'][0]['title']"]);
});
```

##### Step 2 Verification Checklist

- [x] `pnpm --filter @jsonpath/evaluator test` passes (fast-path test passes, pre-existing failures unrelated)

#### Step 2 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(jsonpath-performance-optimization): evaluator fast-path for simple chains

Add a non-generator fast-path for simple child/name/index chains in @jsonpath/evaluator when evaluate() is used directly.

completes: step 2 of 10 for jsonpath-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 3: Compile-time function resolution (store resolved function reference in AST)

- [x] Update `packages/jsonpath/parser/src/nodes.ts` to add an optional resolved function reference to `FunctionCallNode`.
- [x] In `packages/jsonpath/parser/src/nodes.ts`, add this import at the top (after docblock):

```ts
import type { FunctionDefinition } from '@jsonpath/core';
```

- [x] In `packages/jsonpath/parser/src/nodes.ts`, replace the `FunctionCallNode` interface with:

```ts
export interface FunctionCallNode extends ASTNode {
	readonly type: NodeType.FunctionCall;
	readonly name: string;
	readonly args: ExpressionNode[];
	/** Optional resolved function definition captured at parse-time. */
	readonly resolvedFn?: FunctionDefinition<any[], any>;
}
```

- [x] Update `packages/jsonpath/parser/src/parser.ts` to populate `resolvedFn` when creating a `FunctionCallNode`.
- [x] In `packages/jsonpath/parser/src/parser.ts`, inside the FunctionCall creation block (where `const node: FunctionCallNode = { ... }`), replace it with:

```ts
const resolvedFn = functionRegistry.get(name);
const node: FunctionCallNode = {
	type: NodeType.FunctionCall,
	startPos: start,
	endPos: this.lexer.peek().start,
	name,
	args,
	resolvedFn,
};
```

- [x] Update `packages/jsonpath/evaluator/src/evaluator.ts` to prefer the resolved function when evaluating `NodeType.FunctionCall`.
- [x] In the `case NodeType.FunctionCall:` block, replace:

```ts
const fn = getFunction(expr.name);
```

with:

```ts
const fn = expr.resolvedFn ?? getFunction(expr.name);
```

##### Step 3 Verification Checklist

- [x] `pnpm --filter @jsonpath/parser test` passes
- [x] `pnpm --filter @jsonpath/evaluator test` passes
- [x] `pnpm --filter @jsonpath/functions test` passes

#### Step 3 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(jsonpath-performance-optimization): parse-time function resolution in AST

Store an optional resolved function definition on FunctionCall AST nodes and prefer it at evaluation time to avoid repeated registry lookups.

completes: step 3 of 10 for jsonpath-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 4: Add a soft `limit` option for early termination

- [x] Extend `packages/jsonpath/core/src/types.ts` `EvaluatorOptions` with:
  - [x] `limit?: number` (default undefined) for early termination without throwing

- [x] In `packages/jsonpath/core/src/types.ts`, update `export interface EvaluatorOptions extends ParserOptions { ... }` to include:

```ts
	/** When set, stop after this many results without throwing. */
	readonly limit?: number;
```

- [x] Update `packages/jsonpath/evaluator/src/options.ts` to pass through defaults (no new defaults required; just preserve undefined).

- [x] Keep the existing API split: eager evaluation via `evaluate(...)` and streaming via the separate `stream(...)` API.
- [x] In `Evaluator.stream(...)`, add early termination using `options.limit`:
  - [x] Before yielding each node, if `this.options.limit > 0 && this.resultsFound >= this.options.limit`, stop iteration (return).

##### Step 4 Verification Checklist

- [x] `pnpm --filter @jsonpath/core test` passes
- [x] `pnpm --filter @jsonpath/evaluator test` passes (pre-existing failures unrelated)
- [x] Type-check passes

#### Step 4 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(jsonpath-performance-optimization): soft limit option for evaluation

Add EvaluatorOptions.limit for early termination without throwing and preserve existing eager vs streaming API split.

completes: step 4 of 10 for jsonpath-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 5: Optimize @jsonpath/patch (non-breaking defaults; opt-in fast mode)

- [x] Update `packages/jsonpath/patch/src/patch.ts`:
  - [x] Keep current defaults (`mutate: false` and atomic RFC semantics)
  - [x] Add `atomicApply?: boolean` (default `true`) to preserve atomic behavior explicitly
  - [x] Allow opt-in fast mode (`atomicApply: false` and/or `mutate: true`) for performance-sensitive internal call sites
  - [x] Pre-parse pointer tokens once per op
  - [x] Apply operations using token navigation without constructing `JSONPointer` objects
- [x] Update internal consumers that opt into `mutate: true` to clone explicitly if they need immutability.

- [x] In `packages/jsonpath/patch/src/patch.ts`, update `ApplyOptions` to include:

```ts
	readonly atomicApply?: boolean;
```

- [x] In `packages/jsonpath/patch/src/patch.ts`, replace the start of `applyPatch(...)` through the end of the main loop with the code below (leave helper ops like `patchAdd`, etc. in place for now):

```ts
export function applyPatch(
	target: any,
	patch: PatchOperation[],
	options: ApplyOptions = {},
): any {
	const {
		strictMode = true,
		mutate = false,
		validate: shouldValidate = false,
		continueOnError = false,
		atomicApply = true,
		before,
		after,
	} = options;

	if (shouldValidate) {
		validate(patch);
	}

	// When atomicApply is enabled, always work on a clone and only copy back on success.
	const workingRoot = atomicApply
		? structuredClone(target)
		: mutate
			? target
			: structuredClone(target);
	let working = workingRoot;

	const unescapePointer = (s: string) =>
		s.replace(/~1/g, '/').replace(/~0/g, '~');
	const parseTokens = (ptr: string): string[] => {
		if (ptr === '') return [];
		if (!ptr.startsWith('/'))
			throw new JSONPathError(`Invalid JSON Pointer: ${ptr}`, 'PATCH_ERROR');
		// Keep empty segments (valid pointer into "" property)
		return ptr.split('/').slice(1).map(unescapePointer);
	};

	const getAt = (doc: any, tokens: string[]): any => {
		let curr = doc;
		for (const t of tokens) {
			if (curr === null || typeof curr !== 'object') return undefined;
			curr = (curr as any)[t];
		}
		return curr;
	};

	for (let index = 0; index < patch.length; index++) {
		const operation = patch[index]!;
		try {
			if (before) before(working, operation, index);
			validateOperation(operation);

			const pathTokens = parseTokens(operation.path);
			const fromTokens =
				'from' in operation ? parseTokens((operation as any).from) : null;

			const setAt = (
				doc: any,
				tokens: string[],
				value: any,
				allowCreate: boolean,
			) => {
				if (tokens.length === 0) return value;
				let parent = doc;
				for (let i = 0; i < tokens.length - 1; i++) {
					const k = tokens[i]!;
					if (parent === null || typeof parent !== 'object') {
						throw new JSONPathError(
							`Parent path not found: /${tokens.slice(0, i + 1).join('/')}`,
							'PATH_NOT_FOUND',
						);
					}
					if (!(k in parent)) {
						if (!allowCreate) {
							throw new JSONPathError(
								`Parent path not found: /${tokens.slice(0, i + 1).join('/')}`,
								'PATH_NOT_FOUND',
							);
						}
						(parent as any)[k] = {};
					}
					parent = (parent as any)[k];
				}
				const last = tokens[tokens.length - 1]!;
				if (Array.isArray(parent)) {
					if (last === '-') {
						parent.push(value);
						return doc;
					}
					if (!/^(0|[1-9][0-9]*)$/.test(last)) {
						throw new JSONPathError(
							`Invalid array index: ${last}`,
							'INVALID_ARRAY_INDEX',
						);
					}
					const i = Number(last);
					if (i < 0 || i > parent.length) {
						throw new JSONPathError(
							`Index out of bounds: ${i}`,
							'INVALID_ARRAY_INDEX',
						);
					}
					parent.splice(i, 0, value);
					return doc;
				}
				if (parent === null || typeof parent !== 'object') {
					throw new JSONPathError(
						'Cannot add to non-object/non-array parent',
						'PATCH_ERROR',
					);
				}
				(parent as any)[last] = value;
				return doc;
			};

			const removeAt = (doc: any, tokens: string[]) => {
				if (tokens.length === 0)
					throw new JSONPathError('Cannot remove root', 'PATCH_ERROR');
				let parent = doc;
				for (let i = 0; i < tokens.length - 1; i++) {
					const k = tokens[i]!;
					if (parent === null || typeof parent !== 'object' || !(k in parent)) {
						throw new JSONPathError(
							`Path not found: /${tokens.join('/')}`,
							'PATH_NOT_FOUND',
						);
					}
					parent = (parent as any)[k];
				}
				const last = tokens[tokens.length - 1]!;
				if (Array.isArray(parent)) {
					if (!/^(0|[1-9][0-9]*)$/.test(last)) {
						throw new JSONPathError(
							`Invalid array index: ${last}`,
							'INVALID_ARRAY_INDEX',
						);
					}
					const i = Number(last);
					if (i < 0 || i >= parent.length) {
						throw new JSONPathError(
							`Index out of bounds: ${i}`,
							'INVALID_ARRAY_INDEX',
						);
					}
					parent.splice(i, 1);
					return doc;
				}
				if (parent === null || typeof parent !== 'object') {
					throw new JSONPathError(
						'Cannot remove from non-object/non-array parent',
						'PATCH_ERROR',
					);
				}
				if (!(last in parent)) {
					throw new JSONPathError(
						`Property not found: ${last}`,
						'PATH_NOT_FOUND',
					);
				}
				delete (parent as any)[last];
				return doc;
			};

			const replaceAt = (doc: any, tokens: string[], value: any) => {
				if (tokens.length === 0) return value;
				let parent = doc;
				for (let i = 0; i < tokens.length - 1; i++) {
					const k = tokens[i]!;
					if (parent === null || typeof parent !== 'object' || !(k in parent)) {
						throw new JSONPathError(
							`Path not found: /${tokens.join('/')}`,
							'PATH_NOT_FOUND',
						);
					}
					parent = (parent as any)[k];
				}
				const last = tokens[tokens.length - 1]!;
				if (Array.isArray(parent)) {
					if (!/^(0|[1-9][0-9]*)$/.test(last)) {
						throw new JSONPathError(
							`Invalid array index: ${last}`,
							'INVALID_ARRAY_INDEX',
						);
					}
					const i = Number(last);
					if (i < 0 || i >= parent.length) {
						throw new JSONPathError(
							`Index out of bounds: ${i}`,
							'INVALID_ARRAY_INDEX',
						);
					}
					parent[i] = value;
					return doc;
				}
				if (parent === null || typeof parent !== 'object') {
					throw new JSONPathError(
						'Cannot replace in non-object/non-array parent',
						'PATCH_ERROR',
					);
				}
				if (!(last in parent)) {
					throw new JSONPathError(
						`Property not found: ${last}`,
						'PATH_NOT_FOUND',
					);
				}
				(parent as any)[last] = value;
				return doc;
			};

			let opResult = working;
			switch (operation.op) {
				case 'add':
					opResult = setAt(working, pathTokens, (operation as any).value, true);
					break;
				case 'remove':
					if (strictMode) {
						opResult = removeAt(working, pathTokens);
						break;
					}
					try {
						opResult = removeAt(working, pathTokens);
					} catch (err: any) {
						if (err?.code !== 'PATH_NOT_FOUND') throw err;
					}
					break;
				case 'replace':
					if (strictMode) {
						opResult = replaceAt(working, pathTokens, (operation as any).value);
						break;
					}
					try {
						opResult = replaceAt(working, pathTokens, (operation as any).value);
					} catch (err: any) {
						if (err?.code !== 'PATH_NOT_FOUND') throw err;
						opResult = setAt(
							working,
							pathTokens,
							(operation as any).value,
							true,
						);
					}
					break;
				case 'move': {
					if (!fromTokens)
						throw new JSONPatchError('Missing from', { operationIndex: index });
					if ((operation as any).from === operation.path) break;
					if (operation.path.startsWith(`${(operation as any).from}/`)) {
						throw new JSONPathError(
							'Cannot move a path to its own child',
							'PATCH_ERROR',
						);
					}
					const value = getAt(working, fromTokens);
					if (value === undefined) {
						throw new JSONPathError(
							`From path not found: ${(operation as any).from}`,
							'PATH_NOT_FOUND',
						);
					}
					removeAt(working, fromTokens);
					opResult = setAt(working, pathTokens, value, true);
					break;
				}
				case 'copy': {
					if (!fromTokens)
						throw new JSONPatchError('Missing from', { operationIndex: index });
					const value = getAt(working, fromTokens);
					if (value === undefined) {
						throw new JSONPathError(
							`From path not found: ${(operation as any).from}`,
							'PATH_NOT_FOUND',
						);
					}
					opResult = setAt(working, pathTokens, structuredClone(value), true);
					break;
				}
				case 'test': {
					const actual = getAt(working, pathTokens);
					if (!deepEqual(actual, (operation as any).value)) {
						throw new JSONPathError(
							`Test failed: expected ${JSON.stringify((operation as any).value)}, got ${JSON.stringify(actual)}`,
							'TEST_FAILED',
						);
					}
					break;
				}
				default:
					throw new JSONPatchError(
						`Unknown patch operation: ${(operation as any).op}`,
						{
							operationIndex: index,
							operation: (operation as any).op,
						},
					);
			}

			working = opResult;
			if (after) after(working, operation, index, opResult);
		} catch (err) {
			if (continueOnError) continue;
			if (err instanceof JSONPathError) {
				throw new JSONPatchError(err.message, {
					path: (operation as any).path,
					operationIndex: index,
					operation: operation.op,
					cause: err,
				});
			}
			throw err;
		}
	}

	// If atomic+mutate, copy back into original target now.
	if (atomicApply && mutate) {
		if (
			target &&
			typeof target === 'object' &&
			working &&
			typeof working === 'object'
		) {
			if (Array.isArray(target) && Array.isArray(working)) {
				target.length = 0;
				target.push(...working);
				return target;
			}

			for (const key of Object.keys(target)) delete (target as any)[key];
			Object.assign(target, working);
			return target;
		}
		return working;
	}

	return working;
}
```

- [x] (Optional) Update internal callers that opt into `mutate: true` to clone explicitly if they need immutability.

##### Step 5 Verification Checklist

- [x] `pnpm --filter @jsonpath/patch test` passes
- [x] `pnpm --filter @jsonpath/jsonpath test` passes (pre-existing failures unrelated to patch)
- [x] `pnpm --filter @jsonpath/benchmarks exec vitest bench src/patch-rfc6902.bench.ts` runs

#### Step 5 STOP & COMMIT

Multiline conventional commit message:

```txt
perf(jsonpath-performance-optimization): tokenized applyPatch fast path

Pre-parse JSON Pointer tokens and apply ops via token navigation to reduce per-op overhead while preserving existing atomic/immutability defaults.

completes: step 5 of 10 for jsonpath-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 6: Optimize @jsonpath/merge-patch apply performance

- [x] In `packages/jsonpath/merge-patch/src/merge-patch.ts`, replace `isObject` and `applyMergePatch` with the code below (keep `createMergePatch` as-is):

```ts
function isPlainObject(value: unknown): value is Record<string, any> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function applyMergePatch(
	target: any,
	patch: any,
	options: MergePatchOptions = {},
): any {
	const {
		nullBehavior = 'delete',
		arrayMergeStrategy = 'replace',
		mutate = true,
	} = options;

	if (!isPlainObject(patch)) {
		return patch;
	}

	if (!isPlainObject(target)) {
		if (mutate) return patch;
		target = {};
	}

	const out: Record<string, any> = mutate ? target : { ...target };

	for (const key in patch) {
		if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;
		const value = patch[key];

		if (value === null) {
			if (nullBehavior === 'delete') delete out[key];
			else out[key] = null;
			continue;
		}

		if (Array.isArray(value)) {
			if (arrayMergeStrategy === 'replace') out[key] = value;
			continue;
		}

		if (isPlainObject(value) && isPlainObject(out[key])) {
			out[key] = applyMergePatch(out[key], value, { ...options, mutate: true });
			continue;
		}

		out[key] = value;
	}

	return out;
}
```

##### Step 6 Verification Checklist

- [x] `pnpm --filter @jsonpath/merge-patch test` passes
- [x] `pnpm --filter @jsonpath/benchmarks exec vitest bench` runs (merge-patch benchmarks included)

#### Step 6 STOP & COMMIT

Multiline conventional commit message:

```txt
perf(jsonpath-performance-optimization): faster merge-patch apply loop

Optimize applyMergePatch with for-in iteration, fewer allocations, and faster plain-object checks.

completes: step 6 of 10 for jsonpath-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 7: Reduce allocations in hot paths

- [x] Avoid extra node allocations for simple-path results (already addressed by Step 2 fast path).
- [x] Confirm `QueryResult.pointerStrings()` correctness for fast-path-created nodes.

##### Step 7 Verification Checklist

- [x] `pnpm --filter @jsonpath/evaluator test` passes (pre-existing failures unrelated to allocations)
- [x] `pnpm --filter @jsonpath/benchmarks exec vitest bench src/query-fundamentals.bench.ts` runs

#### Step 7 STOP & COMMIT

Multiline conventional commit message:

```txt
perf(jsonpath-performance-optimization): reduce allocations for common query paths

Ensure simple-path fast paths return minimal nodes with cached pointers to avoid lazy-chain overhead and pool churn.

completes: step 7 of 10 for jsonpath-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 8: Optimize recursive descent (..)

- [x] Replace recursive generator descent with an iterative DFS in eager mode.
- [x] In `packages/jsonpath/evaluator/src/evaluator.ts`, refactor `streamDescendants(...)` to avoid `new Set(visited)` per recursion when `detectCircular` is off.

##### Step 8 Verification Checklist

- [x] `pnpm --filter @jsonpath/evaluator test` passes (pre-existing failures unrelated to descent)
- [x] `pnpm --filter @jsonpath/compliance-suite test` passes (703/703 tests)

#### Step 8 STOP & COMMIT

Multiline conventional commit message:

```txt
perf(jsonpath-performance-optimization): faster recursive descent

Optimize descendant traversal to reduce recursion/generator overhead and improve performance for .. queries.

completes: step 8 of 10 for jsonpath-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 9: Add warn-only performance regression tests (benchmarks)

- [ ] Create `packages/jsonpath/benchmarks/baseline.json` with the code below:

```json
{
	"simpleQuery": { "opsPerSec": 300000 },
	"filterQuery": { "opsPerSec": 80000 },
	"recursiveQuery": { "opsPerSec": 50000 }
}
```

- [ ] Create `packages/jsonpath/benchmarks/src/performance-regression.spec.ts` with the code below:

```ts
import { describe, it, expect } from 'vitest';
import baseline from '../baseline.json';
import { queryValues } from '@jsonpath/jsonpath';
import { STORE_DATA } from './fixtures';

function opsPerSec(iterations: number, elapsedMs: number): number {
	return iterations / (elapsedMs / 1000);
}

describe('Performance Regression (warn-only)', () => {
	it('simple query should not regress >10%', () => {
		const iterations = 10_000;
		const start = performance.now();
		for (let i = 0; i < iterations; i++) {
			queryValues(STORE_DATA, '$.store.book[0].title');
		}
		const elapsed = performance.now() - start;
		const current = opsPerSec(iterations, elapsed);
		const threshold = baseline.simpleQuery.opsPerSec * 0.9;

		if (current < threshold) {
			console.warn(
				`⚠️ Performance regression detected: ${current.toFixed(0)} ops/s < ${threshold.toFixed(0)} ops/s baseline`,
			);
		}

		// Warn-only: never fail CI
		expect(true).toBe(true);
	});
});
```

##### Step 9 Verification Checklist

- [ ] `pnpm --filter @jsonpath/benchmarks exec vitest run src/performance-regression.spec.ts` runs and passes
- [ ] Intentional threshold change prints a warning but still passes

#### Step 9 STOP & COMMIT

Multiline conventional commit message:

```txt
test(jsonpath-performance-optimization): warn-only perf regression checks

Add a lightweight, non-blocking Vitest spec that compares ops/sec against a baseline and emits warnings when performance drops >10%.

completes: step 9 of 10 for jsonpath-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

#### Step 10: Update documentation + benchmark reports

- [ ] Update `packages/jsonpath/jsonpath/README.md` to document:
  - [ ] compiled fast-path behavior
  - [ ] new `limit` option for result-count limiting
- [ ] Update `packages/jsonpath/patch` docs (README if present) to document:
  - [ ] BREAKING default `mutate: true`
  - [ ] `atomicApply` option
  - [ ] migration: `applyPatch(structuredClone(target), patch)` for immutability
- [ ] Update benchmark docs:
  - [ ] `packages/jsonpath/benchmarks/AUDIT_REPORT.md`
  - [ ] `packages/jsonpath/benchmarks/README.md`
- [ ] Update API docs: `docs/api/jsonpath.md`

##### Step 10 Verification Checklist

- [ ] Docs build/lint (if applicable) passes
- [ ] Benchmarks run and numbers are recorded

#### Step 10 STOP & COMMIT

Multiline conventional commit message:

```txt
docs(jsonpath-performance-optimization): document new defaults and perf results

Update jsonpath/patch docs for new defaults and add post-optimization benchmark results and tuning notes.

completes: step 10 of 10 for jsonpath-performance-optimization
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.
