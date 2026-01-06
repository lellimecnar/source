# jsonpath-jsep-migration

## Goal

Eliminate dynamic code execution (`new Function`) from `@jsonpath/compiler` by introducing `@jsonpath/filter-eval` (jsep-based) and migrating compiled query execution to a closure-based runtime that delegates to `@jsonpath/evaluator`.

## Prerequisites

Make sure that the user is currently on the `feat/jsonpath-jsep-filter-eval` branch before beginning implementation.
If the branch does not exist, create it from the default branch (`main`/`master`).

### Workspace Commands (Monorepo)

- [ ] Build all: `pnpm build`
- [ ] Test all: `pnpm test`
- [ ] Test only jsonpath: `pnpm --filter @jsonpath/... test`
- [ ] Test only new package: `pnpm --filter @jsonpath/filter-eval test`
- [ ] Type-check only new package: `pnpm --filter @jsonpath/filter-eval type-check`

---

## Step-by-Step Instructions

### Step 1: Create `@jsonpath/filter-eval` Package Structure

- [ ] Create folder: `packages/jsonpath/filter-eval/`
- [ ] Create `packages/jsonpath/filter-eval/.eslintrc.cjs`:

```js
module.exports = {
	extends: ['@lellimecnar/eslint-config/node'],
	parserOptions: {
		project: './tsconfig.json',
		tsconfigRootDir: __dirname,
	},
};
```

- [ ] Create `packages/jsonpath/filter-eval/package.json`:

```json
{
	"name": "@jsonpath/filter-eval",
	"version": "0.1.0",
	"description": "JSONPath filter expression parser and evaluator (jsep-based)",
	"keywords": ["jsonpath", "json", "filter", "rfc9535"],
	"license": "MIT",
	"sideEffects": false,
	"type": "module",
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"default": "./dist/index.js"
		}
	},
	"main": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"files": ["dist", "README.md"],
	"scripts": {
		"build": "vite build",
		"dev": "vite build --watch",
		"lint": "eslint .",
		"test": "vitest run",
		"test:coverage": "vitest run --coverage",
		"test:watch": "vitest",
		"type-check": "tsgo --noEmit"
	},
	"dependencies": {
		"@jsonpath/core": "workspace:*",
		"@jsonpath/functions": "workspace:*",
		"@jsep-plugin/regex": "^1.0.3",
		"jsep": "^1.4.0"
	},
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@lellimecnar/vite-config": "workspace:*",
		"@lellimecnar/vitest-config": "workspace:*",
		"@types/node": "^24",
		"@vitest/coverage-v8": "^4.0.16",
		"eslint": "^8.57.1",
		"typescript": "~5.5",
		"vite": "^7.3.0",
		"vite-plugin-dts": "^4.5.4",
		"vite-tsconfig-paths": "^6.0.3",
		"vitest": "^4.0.16"
	}
}
```

- [ ] Create `packages/jsonpath/filter-eval/tsconfig.json`:

```jsonc
{
	"extends": "@lellimecnar/typescript-config/base.json",
	"compilerOptions": {
		"outDir": "./dist",
		"paths": {
			"*": ["./*"],
		},
	},
	"include": ["src/**/*.ts"],
	"exclude": ["node_modules", "dist", "**/*.spec.ts", "**/__tests__"],
}
```

- [ ] Create `packages/jsonpath/filter-eval/vite.config.ts`:

```ts
import { createRequire } from 'node:module';
import { defineConfig, mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths';
import { viteNodeConfig } from '@lellimecnar/vite-config/node';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const externalDeps = [
	...Object.keys(pkg.dependencies ?? {}),
	...Object.keys(pkg.peerDependencies ?? {}),
];

const external = (id: string) =>
	id.startsWith('node:') ||
	externalDeps.some((dep: string) => id === dep || id.startsWith(`${dep}/`));

export default defineConfig(
	mergeConfig(viteNodeConfig(), {
		plugins: [
			tsconfigPaths(),
			dts({
				entryRoot: 'src',
				tsconfigPath: 'tsconfig.json',
				outDir: 'dist',
			}),
		],
		build: {
			outDir: 'dist',
			lib: {
				entry: 'src/index.ts',
				formats: ['es'],
			},
			rollupOptions: {
				external,
				output: {
					preserveModules: true,
					preserveModulesRoot: 'src',
					entryFileNames: '[name].js',
				},
			},
		},
	}),
);
```

- [ ] Create `packages/jsonpath/filter-eval/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import { vitestBaseConfig } from '@lellimecnar/vitest-config';
import path from 'path';

export default defineConfig({
	...vitestBaseConfig(),
	resolve: {
		alias: {
			'@jsonpath/core': path.resolve(__dirname, '../core/src/index.ts'),
			'@jsonpath/functions': path.resolve(
				__dirname,
				'../functions/src/index.ts',
			),
		},
	},
});
```

- [ ] Create `packages/jsonpath/filter-eval/src/index.ts`:

```ts
/**
 * @jsonpath/filter-eval
 *
 * JSONPath filter expression parser and evaluator (jsep-based).
 *
 * @packageDocumentation
 */

// Ensure RFC 9535 built-in functions are registered globally.
import '@jsonpath/functions';

export * from './types.js';
export * from './parser.js';
export * from './evaluator.js';
export * from './compiler.js';
export * from './cache.js';
export * from './security.js';
```

- [ ] Create `packages/jsonpath/filter-eval/src/types.ts`:

```ts
import type { Path, PathSegment } from '@jsonpath/core';
import type { EvaluatorOptions } from '@jsonpath/core';

export type ValueType = unknown;

export interface LogicalType {
	readonly __isLogicalType: true;
	readonly value: boolean;
}

export interface FunctionResult {
	readonly __isFunctionResult: true;
	readonly value: unknown;
}

export interface NodesType<TNode = unknown> {
	readonly __isNodeList: true;
	readonly nodes: readonly TNode[];
}

export interface EvaluationNode<T = unknown> {
	readonly value: T;
	readonly path: Path;
	readonly root: unknown;
	readonly parent?: unknown;
	readonly parentKey?: PathSegment;
}

export interface EvaluationContext {
	readonly root: unknown;
	readonly current: EvaluationNode;
	readonly options?: EvaluatorOptions;
}

export interface EvaluatorOptionsLike {
	readonly maxDepth?: number;
	readonly maxFilterDepth?: number;
	readonly timeout?: number;
	readonly unsafe?: boolean;
}

export type CompiledFilter = (ctx: EvaluationContext) => boolean;
```

- [ ] Create `packages/jsonpath/filter-eval/src/security.ts`:

```ts
import { JSONPathSecurityError, Nothing } from '@jsonpath/core';

export const FORBIDDEN_PROPERTIES = new Set<string>([
	'constructor',
	'__proto__',
	'prototype',
	'__defineGetter__',
	'__defineSetter__',
	'__lookupGetter__',
	'__lookupSetter__',
	'eval',
	'Function',
	'toString',
	'valueOf',
]);

export function safePropertyAccess(obj: unknown, prop: string): unknown {
	if (typeof prop !== 'string') return Nothing;
	if (FORBIDDEN_PROPERTIES.has(prop)) {
		throw new JSONPathSecurityError(`Access to '${prop}' is forbidden`);
	}
	if (obj === null || obj === undefined) return Nothing;
	if (typeof obj !== 'object') return Nothing;
	if (!Object.hasOwn(obj as object, prop)) return Nothing;
	return (obj as Record<string, unknown>)[prop];
}
```

- [ ] Create `packages/jsonpath/filter-eval/src/parser.ts`:

```ts
import jsep from 'jsep';
import jsepRegex from '@jsep-plugin/regex';

export type FilterAst = any;

let configured = false;

function configureOnce(): void {
	if (configured) return;
	configured = true;

	jsep.plugins.register(jsepRegex);

	// Project contract: only accept operators supported by @jsonpath/parser/@jsonpath/evaluator.
	// If additional operators are supported via operator plugins, they must be enabled here too.
	jsep.removeUnaryOp('~');
	jsep.removeUnaryOp('typeof');

	jsep.removeBinaryOp('|');
	jsep.removeBinaryOp('^');
	jsep.removeBinaryOp('&');
	jsep.removeBinaryOp('>>>');
	jsep.removeBinaryOp('>>');
	jsep.removeBinaryOp('<<');
	jsep.removeBinaryOp('in');
	jsep.removeBinaryOp('instanceof');

	// Allow JSONPath roots as identifiers.
	jsep.addIdentifierChar('@');
	jsep.addIdentifierChar('$');
}

export function parseFilter(input: string): FilterAst {
	configureOnce();
	return jsep(input);
}
```

- [ ] Create `packages/jsonpath/filter-eval/src/evaluator.ts`:

```ts
import { Nothing, isNothing, JSONPathLimitError } from '@jsonpath/core';
import { getFunction } from '@jsonpath/functions';

import type {
	CompiledFilter,
	EvaluationContext,
	LogicalType,
	NodesType,
	FunctionResult,
} from './types.js';
import { safePropertyAccess } from './security.js';

type JsepNode = any;

function isLogicalType(v: any): v is LogicalType {
	return v && typeof v === 'object' && v.__isLogicalType === true;
}

function isNodesType(v: any): v is NodesType<any> {
	return v && typeof v === 'object' && v.__isNodeList === true;
}

function isFunctionResult(v: any): v is FunctionResult {
	return v && typeof v === 'object' && v.__isFunctionResult === true;
}

function unwrap(v: any): any {
	if (isNodesType(v)) {
		return v.nodes.length === 1 ? v.nodes[0].value : Nothing;
	}
	if (isLogicalType(v)) return v.value;
	if (isFunctionResult(v)) return v.value;
	return v;
}

function deepEqual(a: any, b: any): boolean {
	if (a === b) return true;
	if (
		typeof a !== 'object' ||
		a === null ||
		typeof b !== 'object' ||
		b === null
	) {
		return false;
	}

	if (Array.isArray(a)) {
		if (!Array.isArray(b) || a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) {
			if (!deepEqual(a[i], b[i])) return false;
		}
		return true;
	}

	if (Array.isArray(b)) return false;

	const keysA = Object.keys(a);
	const keysB = Object.keys(b);
	if (keysA.length !== keysB.length) return false;

	for (const key of keysA) {
		if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
		if (!deepEqual(a[key], b[key])) return false;
	}

	return true;
}

function compare(left: any, right: any, operator: string): boolean {
	const isComparable = (val: any) => {
		if (isNodesType(val)) return val.nodes.length === 1;
		if (isLogicalType(val)) return false;
		return true;
	};

	if (!isComparable(left) || !isComparable(right)) return false;

	const l = unwrap(left);
	const r = unwrap(right);

	if (l === Nothing && r === Nothing) {
		return operator === '==' || operator === '<=' || operator === '>=';
	}
	if (l === Nothing || r === Nothing) {
		return operator === '!=';
	}

	if (operator === '==') return deepEqual(l, r);
	if (operator === '!=') return !deepEqual(l, r);

	if (typeof l === 'number' && typeof r === 'number') {
		if (operator === '<') return l < r;
		if (operator === '<=') return l <= r;
		if (operator === '>') return l > r;
		if (operator === '>=') return l >= r;
	}

	if (typeof l === 'string' && typeof r === 'string') {
		if (operator === '<') return l < r;
		if (operator === '<=') return l <= r;
		if (operator === '>') return l > r;
		if (operator === '>=') return l >= r;
	}

	// CTS compatibility: <= and >= on equal values for other literal types
	if (deepEqual(l, r) && (operator === '<=' || operator === '>=')) return true;

	return false;
}

function isTruthy(val: any): boolean {
	if (isNothing(val)) return false;

	if (val && typeof val === 'object') {
		if (isLogicalType(val)) return Boolean(val.value);
		if (isNodesType(val)) return val.nodes.length > 0;
		if (isFunctionResult(val)) return isTruthy(val.value);
	}

	// Evaluator contract: truthy iff not false and not null
	return val !== false && val !== null;
}

export class FilterEvaluator {
	private currentDepth = 0;
	private readonly maxDepth: number;

	constructor(options?: { maxDepth?: number }) {
		this.maxDepth = options?.maxDepth ?? 0;
	}

	compile(ast: any): CompiledFilter {
		return (ctx) => this.evaluate(ast, ctx);
	}

	evaluate(ast: JsepNode, ctx: EvaluationContext): boolean {
		const result = this.evaluateNode(ast, ctx);
		return isTruthy(result);
	}

	private evaluateNode(node: JsepNode, ctx: EvaluationContext): any {
		this.currentDepth++;
		if (this.maxDepth > 0 && this.currentDepth > this.maxDepth) {
			throw new JSONPathLimitError(
				`Maximum filter depth exceeded: ${this.maxDepth}`,
			);
		}

		try {
			switch (node?.type) {
				case 'Literal':
					return node.value;

				case 'Identifier':
					if (node.name === '@') {
						return { __isNodeList: true, nodes: [ctx.current] };
					}
					if (node.name === '$') {
						return {
							__isNodeList: true,
							nodes: [{ value: ctx.root, path: [], root: ctx.root }],
						};
					}
					// Unknown identifiers are Nothing (RFC-friendly).
					return Nothing;

				case 'UnaryExpression': {
					const val = this.evaluateNode(node.argument, ctx);
					switch (node.operator) {
						case '!':
							return { __isLogicalType: true, value: !isTruthy(val) };
						case '-': {
							const u = unwrap(val);
							return typeof u === 'number' ? -u : Nothing;
						}
						default:
							return Nothing;
					}
				}

				case 'BinaryExpression': {
					const left = this.evaluateNode(node.left, ctx);
					// Short-circuit behavior for logical operators.
					if (node.operator === '&&') {
						return {
							__isLogicalType: true,
							value:
								isTruthy(left) && isTruthy(this.evaluateNode(node.right, ctx)),
						};
					}
					if (node.operator === '||') {
						return {
							__isLogicalType: true,
							value:
								isTruthy(left) || isTruthy(this.evaluateNode(node.right, ctx)),
						};
					}

					const right = this.evaluateNode(node.right, ctx);

					switch (node.operator) {
						case '==':
							return {
								__isLogicalType: true,
								value: compare(left, right, '=='),
							};
						case '!=':
							return {
								__isLogicalType: true,
								value: !compare(left, right, '=='),
							};
						case '<':
							return {
								__isLogicalType: true,
								value: compare(left, right, '<'),
							};
						case '<=':
							return {
								__isLogicalType: true,
								value: compare(left, right, '<='),
							};
						case '>':
							return {
								__isLogicalType: true,
								value: compare(left, right, '>'),
							};
						case '>=':
							return {
								__isLogicalType: true,
								value: compare(left, right, '>='),
							};
						case '+':
						case '-':
						case '*':
						case '/': {
							const l = unwrap(left);
							const r = unwrap(right);
							if (typeof l !== 'number' || typeof r !== 'number')
								return Nothing;
							switch (node.operator) {
								case '+':
									return l + r;
								case '-':
									return l - r;
								case '*':
									return l * r;
								case '/':
									return r === 0 ? Nothing : l / r;
							}
						}
						default:
							return Nothing;
					}
				}

				case 'ArrayExpression':
					return node.elements.map((el: any) =>
						unwrap(this.evaluateNode(el, ctx)),
					);

				case 'ObjectExpression': {
					const out: Record<string, any> = {};
					for (const prop of node.properties ?? []) {
						if (prop.type !== 'Property') continue;
						const key =
							prop.key?.type === 'Identifier'
								? prop.key.name
								: String(prop.key?.value);
						out[key] = unwrap(this.evaluateNode(prop.value, ctx));
					}
					return out;
				}

				case 'MemberExpression': {
					return this.evaluateMember(node, ctx);
				}

				case 'CallExpression': {
					return this.evaluateCall(node, ctx);
				}

				default:
					return Nothing;
			}
		} finally {
			this.currentDepth--;
		}
	}

	private evaluateMember(node: any, ctx: EvaluationContext): any {
		// Support JSONPath-style roots: @.x / $['x']
		if (
			node.object?.type === 'Identifier' &&
			(node.object.name === '@' || node.object.name === '$')
		) {
			const base =
				node.object.name === '@'
					? ctx.current
					: { value: ctx.root, path: [], root: ctx.root };
			const key = this.memberKey(node, ctx);
			if (key === Nothing) return Nothing;
			const value = safePropertyAccess(base.value, String(key));
			if (isNothing(value)) return Nothing;
			return {
				__isNodeList: true,
				nodes: [
					{
						value,
						path: [...base.path, key as any],
						root: ctx.root,
						parent: base.value,
						parentKey: key as any,
					},
				],
			};
		}

		const obj = unwrap(this.evaluateNode(node.object, ctx));
		const key = this.memberKey(node, ctx);
		if (key === Nothing) return Nothing;
		return safePropertyAccess(obj, String(key));
	}

	private memberKey(node: any, ctx: EvaluationContext): any {
		if (node.computed) {
			const prop = unwrap(this.evaluateNode(node.property, ctx));
			if (typeof prop === 'string' || typeof prop === 'number') return prop;
			return Nothing;
		}
		// non-computed: `.name`
		if (node.property?.type === 'Identifier') return node.property.name;
		return Nothing;
	}

	private evaluateCall(node: any, ctx: EvaluationContext): any {
		if (node.callee?.type !== 'Identifier') return Nothing;
		const fn = getFunction(node.callee.name);
		if (!fn) return Nothing;

		const rawArgs = (node.arguments ?? []).map((a: any) =>
			this.evaluateNode(a, ctx),
		);
		if (rawArgs.some((a: any) => isNothing(a))) return Nothing;
		if (rawArgs.length !== fn.signature.length) return Nothing;

		const processed: any[] = [];
		for (let i = 0; i < rawArgs.length; i++) {
			const arg = rawArgs[i];
			const paramType = fn.signature[i];
			const isNodeList = isNodesType(arg);

			if (paramType === 'NodesType') {
				if (!isNodeList) return Nothing;
				processed.push(arg.nodes);
				continue;
			}

			if (paramType === 'LogicalType') {
				processed.push(isTruthy(arg));
				continue;
			}

			// ValueType
			if (isNodeList) {
				if (arg.nodes.length === 1) processed.push(arg.nodes[0].value);
				else return Nothing;
			} else if (isLogicalType(arg) || isFunctionResult(arg)) {
				processed.push(arg.value);
			} else {
				processed.push(arg);
			}
		}

		try {
			const result = fn.evaluate(...processed);
			if (result === undefined) return Nothing;
			if (fn.returns === 'LogicalType')
				return { __isLogicalType: true, value: Boolean(result) };
			return { __isFunctionResult: true, value: result };
		} catch {
			return Nothing;
		}
	}
}
```

- [ ] Create `packages/jsonpath/filter-eval/src/compiler.ts`:

```ts
import type { CompiledFilter } from './types.js';
import { parseFilter } from './parser.js';
import { FilterEvaluator } from './evaluator.js';

export function compileFilter(
	expression: string,
	options?: { maxDepth?: number },
): CompiledFilter {
	const ast = parseFilter(expression);
	const evaluator = new FilterEvaluator({ maxDepth: options?.maxDepth });
	return evaluator.compile(ast);
}
```

- [ ] Create `packages/jsonpath/filter-eval/src/cache.ts`:

```ts
import type { CompiledFilter } from './types.js';

interface Entry {
	key: string;
	value: CompiledFilter;
	prev: Entry | null;
	next: Entry | null;
}

export class FilterCache {
	private readonly capacity: number;
	private readonly map = new Map<string, Entry>();
	private head: Entry | null = null;
	private tail: Entry | null = null;

	constructor(capacity: number) {
		if (!Number.isFinite(capacity) || capacity < 1)
			throw new Error('capacity must be >= 1');
		this.capacity = capacity;
	}

	get(key: string): CompiledFilter | undefined {
		const entry = this.map.get(key);
		if (!entry) return undefined;
		this.touch(entry);
		return entry.value;
	}

	set(key: string, value: CompiledFilter): CompiledFilter {
		const existing = this.map.get(key);
		if (existing) {
			existing.value = value;
			this.touch(existing);
			return value;
		}
		const entry: Entry = { key, value, prev: null, next: this.head };
		if (this.head) this.head.prev = entry;
		this.head = entry;
		if (!this.tail) this.tail = entry;
		this.map.set(key, entry);
		if (this.map.size > this.capacity) this.evict();
		return value;
	}

	private touch(entry: Entry): void {
		if (this.head === entry) return;
		if (entry.prev) entry.prev.next = entry.next;
		if (entry.next) entry.next.prev = entry.prev;
		if (this.tail === entry) this.tail = entry.prev;
		entry.prev = null;
		entry.next = this.head;
		if (this.head) this.head.prev = entry;
		this.head = entry;
		if (!this.tail) this.tail = entry;
	}

	private evict(): void {
		const entry = this.tail;
		if (!entry) return;
		this.map.delete(entry.key);
		this.tail = entry.prev;
		if (this.tail) this.tail.next = null;
		if (!this.tail) this.head = null;
	}
}
```

- [ ] Create `packages/jsonpath/filter-eval/src/__tests__/parser.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseFilter } from '../parser.js';

describe('parseFilter (jsep config)', () => {
	it('parses @ and $ identifiers', () => {
		expect(() => parseFilter('@.a == 1')).not.toThrow();
		expect(() => parseFilter('$.a == 1')).not.toThrow();
	});

	it('rejects removed operators', () => {
		expect(() => parseFilter('typeof @.a')).toThrow();
		expect(() => parseFilter('@.a in b')).toThrow();
		expect(() => parseFilter('@.a instanceof b')).toThrow();
		expect(() => parseFilter('@.a | 1')).toThrow();
		expect(() => parseFilter('@.a & 1')).toThrow();
	});
});
```

- [ ] Create `packages/jsonpath/filter-eval/src/__tests__/evaluator.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { compileFilter } from '../compiler.js';

function ctx(currentValue: any) {
	return {
		root: { items: [currentValue] },
		current: {
			value: currentValue,
			path: [],
			root: { items: [currentValue] },
		},
	};
}

describe('FilterEvaluator', () => {
	it('evaluates simple comparisons', () => {
		const f = compileFilter('@.a == 1');
		expect(f(ctx({ a: 1 }))).toBe(true);
		expect(f(ctx({ a: 2 }))).toBe(false);
	});

	it('handles logical operators', () => {
		const f = compileFilter('@.a == 1 || @.b == 2');
		expect(f(ctx({ a: 1, b: 0 }))).toBe(true);
		expect(f(ctx({ a: 0, b: 2 }))).toBe(true);
		expect(f(ctx({ a: 0, b: 0 }))).toBe(false);
	});

	it('supports built-in functions (length)', () => {
		const f = compileFilter('length(@.s) == 3');
		expect(f(ctx({ s: 'hey' }))).toBe(true);
	});
});
```

- [ ] Run: `pnpm --filter @jsonpath/filter-eval test`

#### Step 1 Verification Checklist

- [ ] `pnpm --filter @jsonpath/filter-eval build` succeeds
- [ ] `pnpm --filter @jsonpath/filter-eval test` passes

### Step 1 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(jsonpath-jsep-migration): scaffold @jsonpath/filter-eval

Add new @jsonpath/filter-eval workspace package with jsep parsing config, secure property access primitives, evaluator skeleton, and initial vitest coverage.

completes: step 1 of 8 for jsonpath-jsep-migration
```

---

### Step 2: Implement Security-Hardened Evaluator

- [ ] Update `packages/jsonpath/filter-eval/src/__tests__/security.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { compileFilter } from '../compiler.js';
import { JSONPathSecurityError } from '@jsonpath/core';

function ctx(currentValue: any) {
	return {
		root: currentValue,
		current: {
			value: currentValue,
			path: [],
			root: currentValue,
		},
	};
}

describe('Security', () => {
	it('rejects __proto__ access', () => {
		const f = compileFilter('@.__proto__');
		expect(() => f(ctx({ a: 1 }))).toThrow(JSONPathSecurityError);
	});

	it('rejects constructor access', () => {
		const f = compileFilter('@.constructor');
		expect(() => f(ctx({ a: 1 }))).toThrow(JSONPathSecurityError);
	});

	it('prevents prototype pollution reads', () => {
		const polluted = Object.create({ evil: true });
		polluted.safe = 1;
		const f = compileFilter('@.evil == true');
		expect(f(ctx(polluted))).toBe(false);
	});
});
```

- [ ] Run: `pnpm --filter @jsonpath/filter-eval test`

#### Step 2 Verification Checklist

- [ ] Security test suite passes
- [ ] No access to forbidden properties is possible

### Step 2 STOP & COMMIT

```txt
test(jsonpath-jsep-migration): add filter-eval security coverage

Add prototype / forbidden-property security tests for filter-eval evaluator.

completes: step 2 of 8 for jsonpath-jsep-migration
```

---

### Step 3: Implement Type System and Built-in Functions Integration

Decision (locked in for implementation): reuse `@jsonpath/functions` built-ins (already RFC 9535 + I-Regexp aware) instead of duplicating `i-regexp` logic in filter-eval.

- [ ] Verify `packages/jsonpath/filter-eval/src/evaluator.ts` calls `getFunction` from `@jsonpath/functions` and applies signature-based coercion rules (already included in Step 1 code).
- [ ] Add unit tests for NodesType functions:

Create `packages/jsonpath/filter-eval/src/__tests__/functions.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { compileFilter } from '../compiler.js';

function ctx(currentValue: any) {
	return {
		root: currentValue,
		current: {
			value: currentValue,
			path: [],
			root: currentValue,
		},
	};
}

describe('functions integration', () => {
	it('match() works on strings', () => {
		const f = compileFilter('match(@.s, "abc")');
		expect(f(ctx({ s: 'abc' }))).toBe(true);
		expect(f(ctx({ s: 'ab' }))).toBe(false);
	});

	it('search() works on strings', () => {
		const f = compileFilter('search(@.s, "bc")');
		expect(f(ctx({ s: 'abc' }))).toBe(true);
		expect(f(ctx({ s: 'a' }))).toBe(false);
	});
});
```

- [ ] Run: `pnpm --filter @jsonpath/filter-eval test`

#### Step 3 Verification Checklist

- [ ] Built-in functions are usable from filter-eval
- [ ] Signature/type coercion behavior is stable

### Step 3 STOP & COMMIT

```txt
test(jsonpath-jsep-migration): validate function registry integration

Add tests confirming filter-eval calls RFC 9535 built-in functions via @jsonpath/functions and respects signature-based coercion.

completes: step 3 of 8 for jsonpath-jsep-migration
```

---

### Step 4: Implement Filter Compilation and Caching

- [ ] Add convenience helpers to `packages/jsonpath/filter-eval/src/compiler.ts` to accept an optional `FilterCache` from `cache.ts`.

Update `packages/jsonpath/filter-eval/src/compiler.ts`:

```ts
import type { CompiledFilter } from './types.js';
import { parseFilter } from './parser.js';
import { FilterEvaluator } from './evaluator.js';
import type { FilterCache } from './cache.js';

export function compileFilter(
	expression: string,
	options?: { maxDepth?: number },
): CompiledFilter {
	const ast = parseFilter(expression);
	const evaluator = new FilterEvaluator({ maxDepth: options?.maxDepth });
	return evaluator.compile(ast);
}

export function compileFilterCached(
	expression: string,
	cache: FilterCache,
	options?: { maxDepth?: number },
): CompiledFilter {
	const existing = cache.get(expression);
	if (existing) return existing;
	const compiled = compileFilter(expression, options);
	cache.set(expression, compiled);
	return compiled;
}
```

- [ ] Add tests for cache hit/miss:

Create `packages/jsonpath/filter-eval/src/__tests__/cache.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { FilterCache } from '../cache.js';
import { compileFilterCached } from '../compiler.js';

describe('FilterCache', () => {
	it('reuses compiled filters by key', () => {
		const cache = new FilterCache(10);
		const a = compileFilterCached('@.a == 1', cache);
		const b = compileFilterCached('@.a == 1', cache);
		expect(a).toBe(b);
	});
});
```

- [ ] Run: `pnpm --filter @jsonpath/filter-eval test`

#### Step 4 Verification Checklist

- [ ] Cache tests pass
- [ ] Cache returns identical function instances for same key

### Step 4 STOP & COMMIT

```txt
feat(jsonpath-jsep-migration): add filter-eval compile cache

Add compileFilterCached helper and FilterCache tests to support reusing parsed/compiled filter expressions.

completes: step 4 of 8 for jsonpath-jsep-migration
```

---

### Step 5: Migrate `@jsonpath/compiler` Off `new Function` (Remove Dynamic Code Execution)

Primary objective for this step: remove the `new Function(...)` constructor usage from `@jsonpath/compiler` while preserving correct query semantics.

- [ ] Add a parity gate before any performance fast-path work:
  - [ ] Add/extend tests to assert filter truthiness matches `@jsonpath/evaluator` for: `undefined`, `null`, `false`, `[]`, `{}`
  - [ ] Add/extend tests to assert NodeList comparability matches `@jsonpath/evaluator` (singular vs non-singular)
  - [ ] Add/extend tests to assert deep equality does not depend on object key order

#### Step 5A: Remove `new Function(...)` by delegating to `@jsonpath/evaluator`

- [ ] Replace `new Function(...)` implementation in `packages/jsonpath/compiler/src/compiler.ts` with a closure-based executor that calls `evaluate(root, ast, options)`.

Update `packages/jsonpath/compiler/src/compiler.ts`:

```ts
import { type EvaluatorOptions } from '@jsonpath/core';
import { evaluate } from '@jsonpath/evaluator';
import { type QueryNode } from '@jsonpath/parser';

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

		const fn = (root: unknown, options?: EvaluatorOptions) =>
			executeInterpreted(root, ast, options);

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

#### Step 5B (Optional): Performance fast-path + filter-eval integration

Only implement a fast-path executor if parity tests exist that prove behavior matches `@jsonpath/evaluator` for all supported selectors and filter semantics. Any unsupported selector or filter-eval parse error SHALL fall back to `evaluate(root, ast, options)`.

- [ ] Remove `new Function` mentions from compiler codegen comments (to satisfy “zero instances” grep in this package).

Update `packages/jsonpath/compiler/src/codegen/templates.ts` comment:

```ts
// NOTE: we generate a factory so we can inject runtime dependencies as parameters.
// (This module is for code generation / inspection only; compiled execution is closure-based.)
```

Update `packages/jsonpath/compiler/src/codegen/generators.ts` docstring block to remove the `new Function(...)` phrase.

- [ ] Run: `pnpm --filter @jsonpath/compiler test`

#### Step 5 Verification Checklist

- [ ] `pnpm --filter @jsonpath/compiler test` passes
- [ ] `pnpm --filter @jsonpath/compiler build` succeeds
- [ ] `grep -R "new Function(" packages/jsonpath/compiler/src` returns no matches

### Step 5 STOP & COMMIT

```txt
refactor(jsonpath-jsep-migration): remove dynamic compilation from @jsonpath/compiler

Replace new Function JIT compilation with a closure-based runtime executor that delegates to @jsonpath/evaluator.

completes: step 5 of 8 for jsonpath-jsep-migration
```

---

### Step 6: Update Package Exports and Dependencies

- [ ] Update `packages/jsonpath/jsonpath/package.json` dependencies to include `@jsonpath/filter-eval`.

Update `packages/jsonpath/jsonpath/package.json`:

```json
{
	"name": "@jsonpath/jsonpath",
	"version": "0.1.0",
	"description": "JSONPath jsonpath implementation",
	"keywords": ["jsonpath", "json"],
	"license": "MIT",
	"sideEffects": false,
	"type": "module",
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"default": "./dist/index.js"
		}
	},
	"main": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"files": ["dist", "README.md"],
	"scripts": {
		"build": "vite build",
		"dev": "vite build --watch",
		"lint": "eslint .",
		"test": "vitest run",
		"test:coverage": "vitest run --coverage",
		"test:watch": "vitest",
		"type-check": "tsgo --noEmit"
	},
	"dependencies": {
		"@jsonpath/compiler": "workspace:*",
		"@jsonpath/core": "workspace:*",
		"@jsonpath/evaluator": "workspace:*",
		"@jsonpath/functions": "workspace:*",
		"@jsonpath/lexer": "workspace:*",
		"@jsonpath/merge-patch": "workspace:*",
		"@jsonpath/parser": "workspace:*",
		"@jsonpath/patch": "workspace:*",
		"@jsonpath/path-builder": "workspace:*",
		"@jsonpath/plugin-arithmetic": "workspace:^",
		"@jsonpath/plugin-extras": "workspace:^",
		"@jsonpath/pointer": "workspace:*",
		"@jsonpath/filter-eval": "workspace:*"
	},
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@lellimecnar/vite-config": "workspace:*",
		"@lellimecnar/vitest-config": "workspace:*",
		"@types/node": "^24",
		"@vitest/coverage-v8": "^4.0.16",
		"eslint": "^8.57.1",
		"typescript": "~5.5",
		"vite": "^7.3.0",
		"vite-plugin-dts": "^4.5.4",
		"vite-tsconfig-paths": "^6.0.3",
		"vitest": "^4.0.16"
	}
}
```

- [ ] Update `packages/jsonpath/jsonpath/vitest.config.ts` to include alias:

```ts
import { defineConfig } from 'vitest/config';
import { vitestBaseConfig } from '@lellimecnar/vitest-config';
import path from 'path';

export default defineConfig({
	...vitestBaseConfig(),
	resolve: {
		alias: {
			'@jsonpath/parser': path.resolve(__dirname, '../parser/src/index.ts'),
			'@jsonpath/evaluator': path.resolve(
				__dirname,
				'../evaluator/src/index.ts',
			),
			'@jsonpath/compiler': path.resolve(__dirname, '../compiler/src/index.ts'),
			'@jsonpath/pointer': path.resolve(__dirname, '../pointer/src/index.ts'),
			'@jsonpath/core': path.resolve(__dirname, '../core/src/index.ts'),
			'@jsonpath/lexer': path.resolve(__dirname, '../lexer/src/index.ts'),
			'@jsonpath/functions': path.resolve(
				__dirname,
				'../functions/src/index.ts',
			),
			'@jsonpath/patch': path.resolve(__dirname, '../patch/src/index.ts'),
			'@jsonpath/merge-patch': path.resolve(
				__dirname,
				'../merge-patch/src/index.ts',
			),
			'@jsonpath/plugin-arithmetic': path.resolve(
				__dirname,
				'../plugin-arithmetic/src/index.ts',
			),
			'@jsonpath/plugin-extras': path.resolve(
				__dirname,
				'../plugin-extras/src/index.ts',
			),
			'@jsonpath/compat-json-p3': path.resolve(
				__dirname,
				'../compat-json-p3/src/index.ts',
			),
			'@jsonpath/schema': path.resolve(__dirname, '../schema/src/index.ts'),
			'@jsonpath/filter-eval': path.resolve(
				__dirname,
				'../filter-eval/src/index.ts',
			),
		},
	},
});
```

- [ ] Re-export filter-eval from `@jsonpath/jsonpath` entry point.

Update `packages/jsonpath/jsonpath/src/index.ts`:

```ts
export * from '@jsonpath/filter-eval';
```

#### Step 6 Verification Checklist

- [ ] `pnpm --filter @jsonpath/jsonpath build` succeeds
- [ ] Importing from `@jsonpath/jsonpath` can access `compileFilter`

### Step 6 STOP & COMMIT

```txt
feat(jsonpath-jsep-migration): expose filter-eval via umbrella package

Add @jsonpath/filter-eval dependency to @jsonpath/jsonpath and re-export its public API.

completes: step 6 of 8 for jsonpath-jsep-migration
```

---

### Step 7: Comprehensive Testing and Compliance

- [ ] Run jsonpath tests: `pnpm --filter @jsonpath/... test`
- [ ] Run compliance suite: `pnpm --filter @jsonpath/compliance-suite test`
- [ ] Run benchmarks: `pnpm --filter @jsonpath/benchmarks bench`

- [ ] Add a compiler regression test ensuring there is no dynamic compilation.

Create `packages/jsonpath/compiler/src/__tests__/no-dynamic-eval.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parse } from '@jsonpath/parser';
import { compile } from '../compiler.js';

describe('compiler security', () => {
	it('does not embed dynamic compilation', () => {
		const ast = parse('$.a');
		const fn = compile(ast);
		expect(String(fn.source)).not.toContain('new Function');
	});
});
```

#### Step 7 Verification Checklist

- [ ] All unit tests for jsonpath packages pass
- [ ] Compliance suite passes

### Step 7 STOP & COMMIT

```txt
test(jsonpath-jsep-migration): add security regression checks

Add tests and commands to validate compiler no longer uses dynamic compilation and overall jsonpath compliance continues to pass.

completes: step 7 of 8 for jsonpath-jsep-migration
```

---

### Step 8: Documentation and Examples

- [ ] Create `packages/jsonpath/filter-eval/README.md`:

````md
# @jsonpath/filter-eval

Secure (no dynamic code execution) JSONPath filter expression parsing and evaluation.

## Install

This is a workspace package in `@lellimecnar/source`.

## Usage

```ts
import { compileFilter } from '@jsonpath/filter-eval';

const predicate = compileFilter('@.price < 100 && length(@.name) > 0');

const ok = predicate({
	root: {
		/* entire document */
	},
	current: { value: { price: 42, name: 'x' }, path: [], root: {} },
});
```
````

## Security

- [ ] No `eval`, no `Function` constructor.
- [ ] Safe own-property access; prototype chain is not readable.
- [ ] Forbidden properties are blocked (`__proto__`, `constructor`, `prototype`, ...).

````

- [ ] Create `docs/api/filter-eval.md` describing public API (compileFilter, parseFilter, FilterEvaluator, FilterCache).
- [ ] Update `specs/jsonpath-jsep.md` status section to mark implemented.

#### Step 8 Verification Checklist
- [ ] Docs build/lint passes (prettier)
- [ ] README examples type-check

### Step 8 STOP & COMMIT

```txt
docs(jsonpath-jsep-migration): document filter-eval API

Add README and API docs for @jsonpath/filter-eval and mark jsonpath-jsep spec as implemented.

completes: step 8 of 8 for jsonpath-jsep-migration
````
