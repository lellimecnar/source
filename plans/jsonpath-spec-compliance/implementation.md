---
post_title: '@jsonpath/* Spec Compliance Implementation'
author1: 'GitHub Copilot (GPT-5.2)'
post_slug: 'jsonpath-spec-compliance-implementation'
microsoft_alias: ''
featured_image: ''
categories: ['engineering']
tags:
  [
    'jsonpath',
    'json-pointer',
    'json-patch',
    'rfc-9535',
    'rfc-6901',
    'rfc-6902',
    'rfc-7386',
    'vitest',
  ]
ai_note: 'AI-assisted'
summary: 'Step-by-step implementation instructions to bring the @jsonpath/* suite to full RFC compliance, with concrete code blocks, test guidance, and STOP & COMMIT checkpoints.'
post_date: '2026-01-04'
---

## @jsonpath/\* Specification Compliance

## Goal

Bring the existing @jsonpath/\* suite closer to 100% specification compliance across:

- RFC 9535 (JSONPath)
- RFC 6901 (JSON Pointer)
- RFC 6902 (JSON Patch)
- RFC 7386 (JSON Merge Patch)

This implementation guide is derived from plans/jsonpath-spec-compliance/plan.md, but is grounded in the repo’s current file layout and conventions.

## Repo Reality Adjustments (Plan Mismatches)

These are required to avoid “follow the plan but edit non-existent files” failure modes:

- Parser AST file name: The plan references packages/jsonpath/parser/src/ast.ts, but the repo uses packages/jsonpath/parser/src/nodes.ts.
- Patch/compiler “types” files: The plan references packages/jsonpath/patch/src/types.ts and packages/jsonpath/compiler/src/types.ts; these do not exist today and must be added if you want types split out.
- Compliance suite install: The plan references `napa` + packages/jsonpath/package.json, but there is no packages/jsonpath/package.json. This repo already downloads the official suite via scripts/node/download-compliance-tests.mjs (git clone into node_modules/jsonpath-compliance-test-suite) and runs on postinstall.
- Test file placement: Current package convention is src/**tests**/\*.spec.ts (not **tests** at package root).

## Prerequisites

- Ensure you are on a feature branch created from the repo default branch, e.g. `feat/jsonpath-spec-compliance`.
- Run commands from the repo root.

Useful package-level commands:

```bash
pnpm --filter @jsonpath/core test
pnpm --filter @jsonpath/parser test
pnpm --filter @jsonpath/evaluator test
pnpm --filter @jsonpath/pointer test
pnpm --filter @jsonpath/patch test
pnpm --filter @jsonpath/compiler test
pnpm --filter @jsonpath/jsonpath test
pnpm --filter @jsonpath/core type-check
pnpm --filter @jsonpath/evaluator type-check
```

## Step-by-Step Instructions

### Step 1.1: Unify Function Registry Architecture

Objective: remove the duplicate function registry class from @jsonpath/functions, extend @jsonpath/core registry with management API, and update evaluator to resolve functions from core.

- [x] Extend packages/jsonpath/core/src/registry.ts with:
  - [x] `getFunction(name)`
  - [x] `hasFunction(name)`
  - [x] `unregisterFunction(name)`
- [x] Rewrite packages/jsonpath/functions/src/registry.ts to:
  - [x] Remove `FunctionRegistry` and `globalRegistry`
  - [x] Define built-ins in terms of @jsonpath/core `FunctionDefinition` shape (`signature`, `returns`, `evaluate`)
  - [x] Register built-ins into @jsonpath/core `functionRegistry`
- [x] Update packages/jsonpath/evaluator/src/evaluator.ts to:
  - [x] Stop using `globalRegistry`
  - [x] Call `getFunction()` from @jsonpath/core
  - [x] Execute via `fn.evaluate()`

#### 1.1.a Update core registry [DONE]

Copy/paste the full file below into packages/jsonpath/core/src/registry.ts, replacing the file contents entirely:

```ts
/**
 * @jsonpath/core
 *
 * Registries for functions, selectors, and operators.
 *
 * @packageDocumentation
 */

import type {
	FunctionDefinition,
	SelectorDefinition,
	OperatorDefinition,
} from './types.js';

/**
 * Registry for JSONPath functions (RFC 9535).
 */
export const functionRegistry = new Map<string, FunctionDefinition>();

/**
 * Registry for JSONPath selectors.
 */
export const selectorRegistry = new Map<string, SelectorDefinition>();

/**
 * Registry for JSONPath operators.
 */
export const operatorRegistry = new Map<string, OperatorDefinition>();

/**
 * Registers a function in the global registry.
 */
export function registerFunction(definition: FunctionDefinition): void {
	functionRegistry.set(definition.name, definition);
}

/**
 * Returns a function definition by name.
 */
export function getFunction(name: string): FunctionDefinition | undefined {
	return functionRegistry.get(name);
}

/**
 * Returns true if a function exists.
 */
export function hasFunction(name: string): boolean {
	return functionRegistry.has(name);
}

/**
 * Unregisters a function by name.
 */
export function unregisterFunction(name: string): boolean {
	return functionRegistry.delete(name);
}

/**
 * Registers a selector in the global registry.
 */
export function registerSelector(definition: SelectorDefinition): void {
	selectorRegistry.set(definition.name, definition);
}

/**
 * Registers an operator in the global registry.
 */
export function registerOperator(definition: OperatorDefinition): void {
	operatorRegistry.set(definition.symbol, definition);
}
```

#### 1.1.b Rewrite functions registry [DONE]

Copy/paste the full file below into packages/jsonpath/functions/src/registry.ts, replacing the file contents entirely:

```ts
/**
 * @jsonpath/functions
 *
 * Built-in functions for JSONPath (RFC 9535).
 *
 * @packageDocumentation
 */

import {
	registerFunction,
	type FunctionDefinition,
	// ParameterType,
	// ReturnType,
} from '@jsonpath/core';

/**
 * length(value) -> number
 */
export const lengthFn: FunctionDefinition<[unknown], number> = {
	name: 'length',
	signature: ['ValueType'],
	returns: 'ValueType',
	evaluate: (val: unknown) => {
		if (typeof val === 'string' || Array.isArray(val)) {
			return val.length;
		}
		if (val !== null && typeof val === 'object') {
			return Object.keys(val as object).length;
		}
		return 0;
	},
};

/**
 * count(nodes) -> number
 */
export const countFn: FunctionDefinition<[unknown], number> = {
	name: 'count',
	signature: ['NodesType'],
	returns: 'ValueType',
	evaluate: (nodes: unknown) => {
		return Array.isArray(nodes) ? nodes.length : 0;
	},
};

/**
 * match(value, pattern) -> boolean (regex full match)
 */
export const matchFn: FunctionDefinition<[unknown, unknown], boolean> = {
	name: 'match',
	signature: ['ValueType', 'ValueType'],
	returns: 'LogicalType',
	evaluate: (val: unknown, pattern: unknown) => {
		if (typeof val !== 'string' || typeof pattern !== 'string') return false;
		try {
			const regex = new RegExp(`^${pattern}$`);
			return regex.test(val);
		} catch {
			return false;
		}
	},
};

/**
 * search(value, pattern) -> boolean (regex partial match)
 */
export const searchFn: FunctionDefinition<[unknown, unknown], boolean> = {
	name: 'search',
	signature: ['ValueType', 'ValueType'],
	returns: 'LogicalType',
	evaluate: (val: unknown, pattern: unknown) => {
		if (typeof val !== 'string' || typeof pattern !== 'string') return false;
		try {
			const regex = new RegExp(pattern);
			return regex.test(val);
		} catch {
			return false;
		}
	},
};

/**
 * value(nodes) -> any | null
 *
 * Returns the single value if the node list contains exactly one node.
 */
export const valueFn: FunctionDefinition<[unknown], unknown> = {
	name: 'value',
	signature: ['NodesType'],
	returns: 'ValueType',
	evaluate: (nodes: unknown) => {
		if (Array.isArray(nodes) && nodes.length === 1) {
			return nodes[0];
		}
		return null;
	},
};

export const builtins = [
	lengthFn,
	countFn,
	matchFn,
	searchFn,
	valueFn,
] as const;

export function registerBuiltins(): void {
	for (const fn of builtins) {
		registerFunction(fn);
	}
}

// Preserve existing behavior: built-ins are available once the package is imported.
registerBuiltins();
```

#### 1.1.c Update evaluator function resolution [DONE]

In packages/jsonpath/evaluator/src/evaluator.ts:

1. Replace the import:

```ts
import { globalRegistry } from '@jsonpath/functions';
```

with:

```ts
import '@jsonpath/functions';
import { getFunction } from '@jsonpath/core';
```

2. Replace the FunctionCall case block:

```ts
case NodeType.FunctionCall: {
	const args = expr.args.map((a) => this.evaluateExpression(a, current));
	const fn = globalRegistry.get(expr.name);
	if (!fn)
		throw new JSONPathError(
			`Unknown function: ${expr.name}`,
			'FUNCTION_ERROR',
		);
	return fn.execute(...args);
}
```

with:

```ts
case NodeType.FunctionCall: {
	const args = expr.args.map((a) => this.evaluateExpression(a, current));
	const fn = getFunction(expr.name);
	if (!fn)
		throw new JSONPathError(
			`Unknown function: ${expr.name}`,
			'FUNCTION_ERROR',
		);
	return fn.evaluate(...args);
}
```

#### 1.1.d Update/add tests [DONE]

Update packages/jsonpath/core/src/**tests**/registry.spec.ts to cover get/has/unregister.

Add these tests to the existing `describe('registry', () => { ... })`:

```ts
it('should get/has/unregister a function', () => {
	const fnName = 'testFnLifecycle';
	expect(hasFunction(fnName)).toBe(false);
	expect(getFunction(fnName)).toBeUndefined();

	const fn: FunctionDefinition = {
		name: fnName,
		signature: ['ValueType'],
		returns: 'ValueType',
		evaluate: (x) => x,
	};

	registerFunction(fn);
	expect(hasFunction(fnName)).toBe(true);
	expect(getFunction(fnName)).toBe(fn);

	expect(unregisterFunction(fnName)).toBe(true);
	expect(hasFunction(fnName)).toBe(false);
	expect(getFunction(fnName)).toBeUndefined();

	// deleting twice yields false
	expect(unregisterFunction(fnName)).toBe(false);
});
```

Also update the imports at top of registry.spec.ts to include:

```ts
getFunction,
hasFunction,
unregisterFunction,
```

#### 1.1 Verification

```bash
pnpm --filter @jsonpath/core test
pnpm --filter @jsonpath/evaluator test
pnpm --filter @jsonpath/core type-check
pnpm --filter @jsonpath/evaluator type-check
```

#### Step 1.1 STOP & COMMIT

Commit message:

```
feat(jsonpath): unify function registry in core
```

---

### Step 1.2: Complete QueryResult Interface

Objective: rewrite QueryResult to match the method-based interface already defined in @jsonpath/core, including iterator and parent metadata.

Important: This step will require updating any callers/tests currently using `.values` / `.paths` getters.

- [x] Replace packages/jsonpath/evaluator/src/query-result.ts with a method-based implementation
- [x] Update evaluator to emit `QueryNode` with `root`, `parent`, `parentKey`
- [x] Update call sites that use `.values` or `.paths` getters (tests + facade/compiler)

#### 1.2.a Replace evaluator QueryResult [DONE]

Copy/paste the full file below into packages/jsonpath/evaluator/src/query-result.ts, replacing the file contents entirely:

```ts
/**
 * @jsonpath/evaluator
 *
 * Result class for JSONPath queries.
 *
 * @packageDocumentation
 */

import type {
	PathSegment,
	QueryNode as CoreQueryNode,
	QueryResult as CoreQueryResult,
} from '@jsonpath/core';

export type QueryResultNode<T = unknown> = CoreQueryNode<T>;

function escapeJsonPointerToken(token: string): string {
	return token.replace(/~/g, '~0').replace(/\//g, '~1');
}

function pathToPointer(path: readonly PathSegment[]): string {
	if (path.length === 0) return '';
	return (
		'/' +
		path
			.map((seg) =>
				escapeJsonPointerToken(typeof seg === 'number' ? String(seg) : seg),
			)
			.join('/')
	);
}

function pathToNormalizedPath(path: readonly PathSegment[]): string {
	// Minimal normalized path implementation:
	// - identifiers use `.name`
	// - others use bracket with JSON-string escaping
	let out = '$';
	for (const seg of path) {
		if (typeof seg === 'number') {
			out += `[${seg}]`;
			continue;
		}

		if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(seg)) {
			out += `.${seg}`;
			continue;
		}

		out += `[${JSON.stringify(seg)}]`;
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

	pointers(): string[] {
		return this.results.map((r) => pathToPointer(r.path));
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
			const key = pathToPointer(parentPath);
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

#### 1.2.b Update evaluator to emit richer nodes + method-based results [DONE]

In packages/jsonpath/evaluator/src/evaluator.ts:

- [ ] Update `QueryResultNode` type import to use the new type from query-result
- [ ] Populate `root`, `parent`, `parentKey`
- [ ] Switch array path segments to numbers (not strings)

The simplest way to do this in-place is to:

1. Update the import line:

```ts
import { QueryResult, type QueryResultNode } from './query-result.js';
```

to:

```ts
import { QueryResult, type QueryResultNode } from './query-result.js';
import type { PathSegment } from '@jsonpath/core';
```

2. Replace the initial `currentNodes` assignment in `evaluate()`:

```ts
let currentNodes: QueryResultNode[] = [{ value: this.root, path: [] }];
```

with:

```ts
let currentNodes: QueryResultNode[] = [
	{ value: this.root, path: [], root: this.root },
];
```

3. Replace all node pushes to include `root`, plus `parent/parentKey` where applicable.

Examples (apply throughout evaluator.ts):

- Name selector push becomes:

```ts
results.push({
	value: val[selector.name],
	path: [...node.path, selector.name],
	root: node.root,
	parent: val,
	parentKey: selector.name,
});
```

- Array index push becomes (note numeric segment):

```ts
results.push({
	value: val[idx],
	path: [...node.path, idx],
	root: node.root,
	parent: val,
	parentKey: idx,
});
```

- Descendant walk pushes must pass parent metadata and numeric indices.

4. Deduplication key should be stable with numbers; change:

```ts
const key = n.path.join('\0');
```

to:

```ts
const key = n.path.map(String).join('\0');
```

#### 1.2.c Update call sites (tests + facade/compiler) [DONE]

Update any use of `.values` and `.paths` getters to the method forms:

- `result.values` -> `result.values()`
- `result.paths` -> `result.paths()`

Must-update locations:

- packages/jsonpath/evaluator/src/**tests**/evaluator.spec.ts
- packages/jsonpath/compiler/src/**tests**/compiler.spec.ts
- packages/jsonpath/jsonpath/src/facade.ts (queryValues/queryPaths)

Example change in evaluator tests:

```ts
expect(result.values()).toEqual(['red']);
```

Update packages/jsonpath/jsonpath/src/facade.ts:

```ts
export function queryValues(root: any, path: string): any[] {
	return query(root, path).values();
}

export function queryPaths(root: any, path: string): any[] {
	return query(root, path).paths();
}
```

Update compiler test expectations similarly:

```ts
expect(result.values()).toEqual([1]);
```

#### 1.2 Verification

```bash
pnpm --filter @jsonpath/evaluator test
pnpm --filter @jsonpath/compiler test
pnpm --filter @jsonpath/jsonpath test
pnpm --filter @jsonpath/evaluator type-check
```

#### Step 1.2 STOP & COMMIT

Commit message:

```
feat(jsonpath): implement method-based QueryResult
```

---

### Step 1.3: Implement EvaluatorOptions & Security

Objective: add evaluation-time resource limits and security controls.

Note: This step introduces types in @jsonpath/core, and an implementation layer in @jsonpath/evaluator. Keep the first pass minimal and enforcement-oriented.

- [ ] Add EvaluatorOptions and SecureQueryOptions types to packages/jsonpath/core/src/types.ts
- [ ] Add packages/jsonpath/evaluator/src/options.ts (new)
- [ ] Update evaluator to accept an options argument and enforce:
  - [ ] maxDepth
  - [ ] maxResults
  - [ ] timeout
  - [ ] detectCircular (best-effort)
  - [ ] noRecursive/noFilters

#### 1.3.a Add types to @jsonpath/core

Append the following to the bottom of packages/jsonpath/core/src/types.ts:

```ts
export interface SecureQueryOptions {
	readonly allowPaths?: readonly string[];
	readonly blockPaths?: readonly string[];
	readonly noRecursive?: boolean;
	readonly noFilters?: boolean;
	readonly maxQueryLength?: number;
}

export interface EvaluatorOptions {
	readonly maxDepth?: number;
	readonly maxResults?: number;
	readonly maxNodes?: number;
	readonly maxFilterDepth?: number;
	readonly timeout?: number;
	readonly detectCircular?: boolean;
	readonly secure?: SecureQueryOptions;
	readonly signal?: AbortSignal;
}
```

#### 1.3.b Add evaluator options helper

Create packages/jsonpath/evaluator/src/options.ts:

```ts
import type { EvaluatorOptions } from '@jsonpath/core';

export const DEFAULT_EVALUATOR_OPTIONS: Required<
	Pick<
		EvaluatorOptions,
		'maxDepth' | 'maxResults' | 'timeout' | 'detectCircular'
	>
> = {
	maxDepth: 256,
	maxResults: 10_000,
	timeout: 0,
	detectCircular: false,
};

export function withDefaults(options?: EvaluatorOptions): EvaluatorOptions {
	return {
		...DEFAULT_EVALUATOR_OPTIONS,
		...options,
	};
}
```

#### 1.3.c Wire evaluator options

Update packages/jsonpath/evaluator/src/evaluator.ts to accept `options?: EvaluatorOptions` and enforce basic limits.

Implementation guidance (minimal first pass):

- Track `startedAt = Date.now()` and if `options.timeout > 0` throw when exceeded.
- Before processing each segment and inside descendant recursion, call a `checkLimits(depth, resultsCount)` helper.
- If `options.secure?.noRecursive` and the query contains a DescendantSegment, throw early.
- If `options.secure?.noFilters` and the query contains FilterSelector, throw early.

You can implement without adding new exports by changing the evaluate entrypoint to:

```ts
export function evaluate(
	root: any,
	ast: QueryNode,
	options?: EvaluatorOptions,
): QueryResult {
	return new Evaluator(root, options).evaluate(ast);
}
```

and updating the Evaluator constructor to accept options.

#### 1.3.d Tests

Add a new test file packages/jsonpath/evaluator/src/**tests**/options.spec.ts with:

- maxDepth enforcement using `$..` on a deeply nested object
- timeout enforcement (simulate using a very low timeout and a large array)
- noRecursive/noFilters enforcement by attempting to parse/execute queries with `..` or `[?()]`

#### 1.3 Verification

```bash
pnpm --filter @jsonpath/core type-check
pnpm --filter @jsonpath/evaluator test
pnpm --filter @jsonpath/evaluator type-check
```

#### Step 1.3 STOP & COMMIT

Commit message:

```
feat(jsonpath): add evaluator options and security gates
```

---

### Step 1.4: Fix Slice Normalization (RFC 9535 §2.3.4.2)

Objective: make slice semantics RFC-aligned, throw on step=0, and rename slice properties from startValue/endValue/stepValue to start/end/step.

- [ ] Rename slice properties in packages/jsonpath/parser/src/nodes.ts
- [ ] Update slice parsing in packages/jsonpath/parser/src/parser.ts
- [ ] Update slice evaluation and normalization logic in packages/jsonpath/evaluator/src/evaluator.ts
- [ ] Update parser + evaluator tests for renamed fields and new step=0 error

#### 1.4.a Rename slice properties in AST

In packages/jsonpath/parser/src/nodes.ts, replace:

```ts
export interface SliceSelectorNode extends ASTNode {
	readonly type: NodeType.SliceSelector;
	readonly startValue: number | null;
	readonly endValue: number | null;
	readonly stepValue: number | null;
}
```

with:

```ts
export interface SliceSelectorNode extends ASTNode {
	readonly type: NodeType.SliceSelector;
	readonly start: number | null;
	readonly end: number | null;
	readonly step: number | null;
}
```

#### 1.4.b Rename slice fields in parser

In packages/jsonpath/parser/src/parser.ts, update `parseSlice()` to emit `start/end/step`.

Replace the body of `parseSlice()` with this:

```ts
private parseSlice(): SelectorNode {
	const startPos = this.lexer.peek().start;
	let start: number | null = null;
	let end: number | null = null;
	let step: number | null = null;

	if (this.lexer.peek().type === TokenType.NUMBER) {
		start = this.lexer.next().value as number;
	}

	this.expect(TokenType.COLON);

	if (this.lexer.peek().type === TokenType.NUMBER) {
		end = this.lexer.next().value as number;
	}

	if (this.lexer.peek().type === TokenType.COLON) {
		this.lexer.next();
		if (this.lexer.peek().type === TokenType.NUMBER) {
			step = this.lexer.next().value as number;
		}
	}

	return {
		type: NodeType.SliceSelector,
		start: startPos,
		end: this.lexer.peek().start,
		start,
		end,
		step,
	};
}
```

#### 1.4.c Update parser tests

In packages/jsonpath/parser/src/**tests**/parser.spec.ts, update:

```ts
expect(selector.startValue).toBe(1);
expect(selector.endValue).toBe(5);
expect(selector.stepValue).toBe(2);
```

to:

```ts
expect(selector.start).toBe(1);
expect(selector.end).toBe(5);
expect(selector.step).toBe(2);
```

#### 1.4.d Implement RFC-aligned slice normalization in evaluator

Update the SliceSelector evaluation logic in packages/jsonpath/evaluator/src/evaluator.ts.

Replace the current SliceSelector case block with:

```ts
case NodeType.SliceSelector:
	if (Array.isArray(val)) {
		const { start, end, step } = selector;
		const s = step ?? 1;

		if (s === 0) {
			throw new JSONPathError('Slice step cannot be 0', 'INVALID_ARGUMENT');
		}

		const len = val.length;

		// Defaults depend on direction.
		let from = start ?? (s > 0 ? 0 : len - 1);
		let to = end ?? (s > 0 ? len : -1);

		// Normalize negative indices.
		if (from < 0) from = len + from;
		if (to < 0) to = len + to;

		if (s > 0) {
			// Clamp to [0, len]
			from = Math.min(Math.max(from, 0), len);
			to = Math.min(Math.max(to, 0), len);

			for (let i = from; i < to; i += s) {
				results.push({
					value: val[i],
					path: [...node.path, i],
					root: node.root,
					parent: val,
					parentKey: i,
				});
			}
		} else {
			// Clamp to [-1, len-1]
			from = Math.min(Math.max(from, -1), len - 1);
			to = Math.min(Math.max(to, -1), len - 1);

			for (let i = from; i > to; i += s) {
				results.push({
					value: val[i],
					path: [...node.path, i],
					root: node.root,
					parent: val,
					parentKey: i,
				});
			}
		}
	}
	break;
```

Also update any earlier references to `startValue/endValue/stepValue` to `start/end/step`.

#### 1.4.e Update evaluator tests

In packages/jsonpath/evaluator/src/**tests**/evaluator.spec.ts:

- Replace all `.values` usages with `.values()` (from Step 1.2)
- Add a new assertion for step=0:

```ts
it('should throw on slice step=0', () => {
	const list = [0, 1, 2];
	expect(() => evaluate(list, parse('$[::0]'))).toThrow();
});
```

#### 1.4 Verification

```bash
pnpm --filter @jsonpath/parser test
pnpm --filter @jsonpath/evaluator test
pnpm --filter @jsonpath/parser type-check
pnpm --filter @jsonpath/evaluator type-check
```

#### Step 1.4 STOP & COMMIT

Commit message:

```
fix(jsonpath): RFC slice normalization + slice AST rename
```

---

### Step 1.5: Extend Error Infrastructure

Objective: expand error codes and enrich error types with structured metadata.

Important: Some packages currently throw `JSONPathError` without a `code`. Once you make error codes strict, update those throw sites.

- [ ] Extend ErrorCode union in packages/jsonpath/core/src/errors.ts
- [ ] Enrich error classes with additional fields:
  - [ ] JSONPathSyntaxError: `expected`, `found`, `path`
  - [ ] JSONPathTypeError: `expectedType`, `actualType`
  - [ ] JSONPatchError: `operationIndex`, `operation`
- [ ] Update throw sites to use new codes where appropriate
  - [ ] evaluator: unknown function -> `UNKNOWN_FUNCTION`
  - [ ] evaluator: limits/timeout -> `MAX_DEPTH_EXCEEDED` / `TIMEOUT`
  - [ ] pointer/patch: throw with explicit codes

#### 1.5.a Update core error codes and types

In packages/jsonpath/core/src/errors.ts, update the ErrorCode union to include these additional codes:

```ts
| 'UNEXPECTED_TOKEN'
| 'UNEXPECTED_END'
| 'INVALID_ESCAPE'
| 'INVALID_NUMBER'
| 'UNKNOWN_FUNCTION'
| 'MAX_DEPTH_EXCEEDED'
| 'TIMEOUT'
| 'INVALID_ARRAY_INDEX'
| 'TEST_FAILED'
| 'PATH_NOT_FOUND'
```

Then extend the error classes per the plan by adding fields and including them in toJSON().

#### 1.5.b Fix pointer/patch throw sites to pass codes

Update packages/jsonpath/pointer/src/pointer.ts to throw `JSONPointerError` (or `JSONPathError` with `POINTER_ERROR`) when parsing invalid pointers.

Example minimal change:

```ts
throw new JSONPathError(
	'Invalid JSON Pointer: must start with "/" or be empty',
	'POINTER_ERROR',
);
```

Update packages/jsonpath/patch/src/patch.ts similarly wherever it throws.

#### 1.5.c Update evaluator unknown function code

In packages/jsonpath/evaluator/src/evaluator.ts, change the unknown function throw from `FUNCTION_ERROR` to `UNKNOWN_FUNCTION`.

#### 1.5 Verification

```bash
pnpm --filter @jsonpath/core test
pnpm --filter @jsonpath/pointer test
pnpm --filter @jsonpath/patch test
pnpm --filter @jsonpath/evaluator test
pnpm --filter @jsonpath/core type-check
```

#### Step 1.5 STOP & COMMIT

Commit message:

```
feat(jsonpath): extend error codes and structured error metadata
```

---

## Phase 2: Pointer & Patch Completion (P0/P1)

The following steps are large. The recommended approach is strict Red → Green → Refactor:

- Red: add failing tests for each new API surface
- Green: implement minimal behavior to pass tests
- Refactor: improve structure and add edge-case coverage

### Step 2.1: Implement Pointer Mutation Functions

Files to create/update:

- Create packages/jsonpath/pointer/src/mutations.ts
- Update packages/jsonpath/pointer/src/index.ts to export mutations

APIs:

- `set<T>(pointer: string | string[], data: T, value: unknown): T`
- `remove<T>(pointer: string | string[], data: T): T`
- `append<T>(pointer: string | string[], data: T, value: unknown): T`

Testing:

- Add tests to packages/jsonpath/pointer/src/**tests**/pointer.spec.ts
  - immutability assertions
  - nested object/array updates
  - invalid path/type mismatch throws

STOP & COMMIT message:

```
feat(pointer): add immutable pointer mutations
```

### Step 2.2: Add Pointer Utilities & Validation

Files to create/update:

- Create packages/jsonpath/pointer/src/utils.ts
- Create packages/jsonpath/pointer/src/validation.ts
- Update packages/jsonpath/pointer/src/index.ts exports

APIs:

- `parent(pointer: string): string`
- `join(...pointers: string[]): string`
- `split(pointer: string): string[]`
- `escape(token: string): string`
- `unescape(token: string): string`
- `toNormalizedPath(pointer: string): string`
- `fromNormalizedPath(path: string): string`

Validation:

- `isValid(pointer: string): boolean`
- `validate(pointer: string): { valid: boolean; errors: string[] }`

STOP & COMMIT message:

```
feat(pointer): add utils + pointer validation
```

### Step 2.3: Add Pointer Resolution Variants

Files:

- Create packages/jsonpath/pointer/src/resolve.ts
- Update packages/jsonpath/pointer/src/index.ts exports

APIs:

- `resolve<T>(pointer: string | string[], data: unknown): T | undefined`
- `resolveOrThrow<T>(pointer: string | string[], data: unknown): T`
- `exists(pointer: string | string[], data: unknown): boolean`
- `resolveWithParent(pointer: string | string[], data: unknown): { value: unknown; parent: unknown; key: string }`

STOP & COMMIT message:

```
feat(pointer): add resolve helpers
```

### Step 2.4: Implement JSON Patch diff()

Files:

- Create packages/jsonpath/patch/src/diff.ts
- (Recommended) Create packages/jsonpath/patch/src/types.ts and move PatchOperation there
- Update packages/jsonpath/patch/src/index.ts exports

API:

- `diff(source: unknown, target: unknown, options?: { invertible?: boolean }): PatchOperation[]`

Tests:

- Create packages/jsonpath/patch/src/**tests**/diff.spec.ts
- Ensure roundtrip: `applyPatch(source, diff(source, target))` deep-equals target

STOP & COMMIT message:

```
feat(patch): add diff() generator
```

### Step 2.5: Implement PatchBuilder Fluent API

Files:

- Create packages/jsonpath/patch/src/builder.ts
- Update exports

API:

- `add/remove/replace/move/copy/test`
- Minimal `when()/ifExists()/ifNotExists()` wrappers
- `toOperations()` + `apply()`

STOP & COMMIT message:

```
feat(patch): add PatchBuilder fluent API
```

### Step 2.6: Add ApplyOptions & applyWithInverse

Files:

- Refactor packages/jsonpath/patch/src/patch.ts or create packages/jsonpath/patch/src/apply.ts
- Add `ApplyOptions` type (prefer types.ts if created)

API:

- `applyPatch(target, ops, options?: ApplyOptions)`
- `applyWithInverse(target, ops, options?): { result: unknown; inverse: PatchOperation[] }`

STOP & COMMIT message:

```
feat(patch): apply options + inverse patch
```

---

## Phase 3: Facade & Configuration (P1)

These steps apply to packages/jsonpath/jsonpath/src/facade.ts and new supporting modules.

### Step 3.1: Implement Configuration System

Files:

- Create packages/jsonpath/jsonpath/src/config.ts
- Update packages/jsonpath/jsonpath/src/index.ts exports

APIs:

- `configure(options: Partial<JSONPathConfig>): void`
- `getConfig(): Readonly<JSONPathConfig>`
- `reset(): void`

STOP & COMMIT message:

```
feat(jsonpath): add global configuration
```

### Step 3.2: Add Query Convenience Functions

Update packages/jsonpath/jsonpath/src/facade.ts to add:

- `match(path, data, options)`
- `value(path, data, options)`
- `exists(path, data, options)`
- `count(path, data, options)`
- `stream(path, data, options)`
- `validateQuery(path)`

STOP & COMMIT message:

```
feat(jsonpath): add convenience query APIs
```

### Step 3.3: Implement Cache Management

Files:

- Create packages/jsonpath/jsonpath/src/cache.ts
- Update facade to use shared cache module

APIs:

- `clearCache()`
- `getCacheStats()`

STOP & COMMIT message:

```
feat(jsonpath): add cache management and stats
```

### Step 3.4: Implement Transformation API

Files:

- Create packages/jsonpath/jsonpath/src/transform.ts
- Export from index

APIs:

- `transform/transformAll/project/pick/omit`
- `merge/mergeWith`

STOP & COMMIT message:

```
feat(jsonpath): add transform helpers
```

---

## Phase 4: Compiler & Performance (P1)

### Step 4.1: Implement Full Cached JIT Compiler

Current compiler is a thin wrapper around evaluator. This step introduces code generation + caching.

Files:

- Update packages/jsonpath/compiler/src/compiler.ts
- Create packages/jsonpath/compiler/src/codegen.ts
- Create packages/jsonpath/compiler/src/cache.ts

STOP & COMMIT message:

```
feat(compiler): add JIT codegen + caching
```

### Step 4.2: Add Compiler Options

Files:

- Create packages/jsonpath/compiler/src/types.ts
- Update compiler exports to include `Compiler` class and `compileQuery(query, options)`

STOP & COMMIT message:

```
feat(compiler): add compiler options and Compiler class
```

### Step 4.3: Integrate Official Compliance Test Suites

Objective: run official compliance tests in Vitest.

Repo note: The compliance suite is already downloaded via scripts/node/download-compliance-tests.mjs on postinstall.

Files to add:

- Create packages/jsonpath/evaluator/src/**tests**/compliance.spec.ts
- Create packages/jsonpath/pointer/src/**tests**/compliance.spec.ts
- Create packages/jsonpath/patch/src/**tests**/compliance.spec.ts

Suggested minimal approach:

- Import JSON test vectors from `jsonpath-compliance-test-suite/cts.json`.
- Use `describe.each` / `it.each` to map suite tests into evaluator calls.
- For Pointer and Patch, use RFC example vectors first (subset), then expand.

Add root script (optional but recommended):

- In the repo root package.json add `"test:compliance": "turbo test --filter=@jsonpath/* -- --runInBand --testNamePattern=Compliance"`.

STOP & COMMIT message:

```
test(jsonpath): add official compliance suite runners
```

---

## Phase 5: Extensions & Polish (P2)

### Step 5.1: Implement Plugin System Infrastructure

Files:

- Create packages/jsonpath/core/src/plugin.ts
- Update packages/jsonpath/core/src/types.ts
- Create packages/jsonpath/jsonpath/src/plugins.ts
- Export from packages/jsonpath/jsonpath/src/index.ts

STOP & COMMIT message:

```
feat(jsonpath): add plugin infrastructure
```

### Steps 5.2–5.6: Plugin Packages

Create new packages under packages/jsonpath/:

- plugin-extended
- plugin-types
- plugin-arithmetic
- plugin-extras
- plugin-path-builder

Each package should follow the same structure as existing @jsonpath/\* packages (vite + vitest + tsgo type-check, src/index.ts, src/**tests**).

STOP & COMMIT messages:

```
feat(plugin-extended): add extended selectors plugin
feat(plugin-types): add type helpers plugin
feat(plugin-arithmetic): add arithmetic helpers plugin
feat(plugin-extras): add extras helpers plugin
feat(plugin-path-builder): add path builder plugin
```

### Step 5.7: Complete Merge-Patch API

Update packages/jsonpath/merge-patch/src/merge-patch.ts to add:

- createMergePatch
- isValidMergePatch
- mergePatchWithTrace
- toJSONPatch / fromJSONPatch
- MergePatchOptions

STOP & COMMIT message:

```
feat(merge-patch): complete merge-patch API
```

### Step 5.8: Add Build Configuration for Dual ESM/CJS

Update each packages/jsonpath/\*/vite.config.ts and package.json exports to support both ESM and CJS.

STOP & COMMIT message:

```
chore(jsonpath): add dual ESM/CJS builds
```

### Step 5.9: Complete Type Re-exports

Update packages/jsonpath/jsonpath/src/index.ts to re-export all public types from core/parser/evaluator/pointer/patch/compiler.

STOP & COMMIT message:

```
chore(jsonpath): re-export public types from facade
```
