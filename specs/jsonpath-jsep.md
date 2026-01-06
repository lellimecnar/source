# jsep Integration Specification for @jsonpath/\*

## RFC 9535 Filter Expression Evaluator

**Version:** 1.0.0-draft  
**Last Updated:** 2026-01-05  
**Package:** `@jsonpath/filter-eval`  
**Status:** Draft Specification

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Goals and Non-Goals](#2-goals-and-non-goals)
3. [RFC 9535 Filter Expression Grammar](#3-rfc-9535-filter-expression-grammar)
4. [jsep Configuration](#4-jsep-configuration)
5. [AST Node Types](#5-ast-node-types)
6. [Secure Evaluator Architecture](#6-secure-evaluator-architecture)
7. [Type System](#7-type-system)
8. [Built-in Functions](#8-built-in-functions)
9. [Custom Function Extensions](#9-custom-function-extensions)
10. [Performance Optimization](#10-performance-optimization)
11. [Security Considerations](#11-security-considerations)
12. [Error Handling](#12-error-handling)
13. [Testing Strategy](#13-testing-strategy)
14. [API Reference](#14-api-reference)
15. [Integration with @jsonpath/core](#15-integration-with-jsonpathcore)
16. [Migration Path](#16-migration-path)
17. [Appendix A: ABNF Grammar Reference](#appendix-a-abnf-grammar-reference)
18. [Appendix B: Benchmark Suite](#appendix-b-benchmark-suite)

---

## 1. Executive Summary

This specification defines the integration of [jsep](https://github.com/EricSmekens/jsep) (JavaScript Expression Parser) into the `@jsonpath/*` package ecosystem to provide secure, RFC 9535-compliant filter expression evaluation.

### Why jsep?

| Criterion             | jsep                         | Alternatives    |
| --------------------- | ---------------------------- | --------------- |
| Bundle size           | ~6KB minified                | esprima: ~100KB |
| Parse speed           | ~500k expr/sec               | Comparable      |
| ESTree-compatible AST | ✓                            | Varies          |
| Plugin system         | ✓ Hooks API                  | Limited         |
| Active maintenance    | Moderate (last release 2023) | Varies          |
| Zero dependencies     | ✓                            | Often not       |

### Key Design Decisions

1. **Parse-then-interpret** — No `eval()` or `new Function()` anywhere
2. **Strict RFC 9535 semantics** — Not JavaScript semantics
3. **Whitelist-only property access** — `hasOwn` + forbidden property set
4. **Pre-compiled filters** — Parse once, evaluate many times
5. **Pluggable function registry** — Support RFC 9535 function extensions

---

## 2. Goals and Non-Goals

### Goals

- ✅ Full RFC 9535 filter expression compliance
- ✅ Pass 100% of JSONPath Compliance Test Suite filter tests
- ✅ Zero possibility of prototype pollution or global access
- ✅ < 10KB bundle size (including jsep)
- ✅ < 1μs evaluation time for simple filters on warm paths
- ✅ Support all RFC 9535 built-in functions (`length`, `count`, `match`, `search`, `value`)
- ✅ Extensible function registry for custom functions
- ✅ TypeScript-first with full type inference
- ✅ Tree-shakeable exports

### Non-Goals

- ❌ General-purpose JavaScript expression evaluation
- ❌ Support for JavaScript-specific syntax (template literals, destructuring, etc.)
- ❌ Async expression evaluation
- ❌ Statement parsing (assignments, declarations, control flow)
- ❌ Object literal syntax in expressions

---

## 3. RFC 9535 Filter Expression Grammar

The following ABNF from RFC 9535 §2.3.5 defines the filter expression syntax:

```abnf
filter-selector     = "?" S logical-expr

logical-expr        = logical-or-expr
logical-or-expr     = logical-and-expr *(S "||" S logical-and-expr)
logical-and-expr    = basic-expr *(S "&&" S basic-expr)

basic-expr          = paren-expr / comparison-expr / test-expr
paren-expr          = [logical-not-op S] "(" S logical-expr S ")"
logical-not-op      = "!"

test-expr           = [logical-not-op S] (filter-query / function-expr)
filter-query        = rel-query / jsonpath-query
rel-query           = current-node-identifier segments
current-node-identifier = "@"

comparison-expr     = comparable S comparison-op S comparable
comparison-op       = "==" / "!=" / "<=" / ">=" / "<" / ">"

comparable          = literal / singular-query / function-expr
literal             = number / string-literal / true / false / null

function-expr       = function-name "(" S [function-argument
                      *(S "," S function-argument)] S ")"
function-argument   = literal / filter-query / function-expr / logical-expr
```

### Deviations from JavaScript

| Feature           | RFC 9535                   | JavaScript       | Implementation                |
| ----------------- | -------------------------- | ---------------- | ----------------------------- | ---- | ---- |
| Equality          | `==` means strict equality | `==` is loose    | Map to `===`                  |
| String comparison | Codepoint comparison       | Locale-dependent | Use `<` etc. directly         |
| Type coercion     | None                       | Implicit         | Throw on type mismatch        |
| Logical operators | `&&`, `                    |                  | `, `!`                        | Same | Same |
| Existence test    | Query as boolean           | Truthy/falsy     | NodeList → boolean conversion |
| Regex             | I-Regexp (RFC 9485)        | ECMAScript regex | Validate + restricted flags   |

---

## 4. jsep Configuration

### 4.1 Base Configuration

```typescript
import jsep from 'jsep';

// Remove JavaScript-specific features not in RFC 9535
jsep.removeUnaryOp('~'); // Bitwise NOT
jsep.removeUnaryOp('typeof'); // typeof operator
jsep.removeBinaryOp('|'); // Bitwise OR
jsep.removeBinaryOp('^'); // Bitwise XOR
jsep.removeBinaryOp('&'); // Bitwise AND
jsep.removeBinaryOp('>>>'); // Unsigned right shift
jsep.removeBinaryOp('>>'); // Right shift
jsep.removeBinaryOp('<<'); // Left shift
jsep.removeBinaryOp('**'); // Exponentiation
jsep.removeBinaryOp('%'); // Modulo (not in RFC 9535)
jsep.removeBinaryOp('in'); // in operator
jsep.removeBinaryOp('instanceof'); // instanceof

// Add JSONPath-specific identifier characters
jsep.addIdentifierChar('@'); // Current node
jsep.addIdentifierChar('$'); // Root node
```

### 4.2 Required Plugins

```typescript
import jsep from 'jsep';
import ternary from '@jsep-plugin/ternary'; // For RFC 9535 extension support
import regex from '@jsep-plugin/regex'; // For match/search functions

// Register plugins
jsep.plugins.register(ternary);
jsep.plugins.register(regex);
```

### 4.3 Custom JSONPath Plugin

Create a custom plugin to handle JSONPath-specific syntax:

```typescript
// @jsonpath/filter-eval/src/plugins/jsonpath-plugin.ts

import type { Plugin, Expression } from 'jsep';

export interface FilterQueryNode extends Expression {
	type: 'FilterQuery';
	root: '@' | '$';
	segments: PathSegment[];
}

export interface PathSegment {
	type: 'member' | 'index' | 'wildcard' | 'slice' | 'filter' | 'descendant';
	value?: string | number;
	expression?: Expression;
	start?: number;
	end?: number;
	step?: number;
}

export const jsonpathPlugin: Plugin = {
	name: 'jsonpath',
	init(jsep) {
		// Register @ and $ as special identifiers that start path expressions
		jsep.hooks.add('gobble-token', function (env) {
			const char = this.char;

			if (char === '@' || char === '$') {
				const start = this.index;
				this.index++;

				// Parse the rest as a path expression
				const segments = parsePathSegments.call(this);

				env.node = {
					type: 'FilterQuery',
					root: char,
					segments,
				} as FilterQueryNode;
			}
		});
	},
};

function parsePathSegments(this: any): PathSegment[] {
	const segments: PathSegment[] = [];

	while (this.index < this.expr.length) {
		this.gobbleSpaces();
		const char = this.char;

		if (char === '.') {
			this.index++;
			if (this.char === '.') {
				// Descendant segment
				this.index++;
				segments.push({ type: 'descendant' });
			}
			// Member access
			if (this.char === '*') {
				this.index++;
				segments.push({ type: 'wildcard' });
			} else {
				const ident = this.gobbleIdentifier();
				if (ident) {
					segments.push({ type: 'member', value: ident.name });
				}
			}
		} else if (char === '[') {
			this.index++;
			this.gobbleSpaces();

			if (this.char === '*') {
				// [*] wildcard
				this.index++;
				this.gobbleSpaces();
				if (this.char !== ']') this.throwError('Expected ]');
				this.index++;
				segments.push({ type: 'wildcard' });
			} else if (this.char === '?') {
				// [?expr] filter - delegate to jsep for the expression
				this.index++;
				const expr = this.gobbleExpression();
				this.gobbleSpaces();
				if (this.char !== ']') this.throwError('Expected ]');
				this.index++;
				segments.push({ type: 'filter', expression: expr });
			} else {
				// Index or slice
				const segment = parseIndexOrSlice.call(this);
				segments.push(segment);
			}
		} else {
			// End of path expression
			break;
		}
	}

	return segments;
}

function parseIndexOrSlice(this: any): PathSegment {
	// Simplified - full implementation would handle:
	// - Numeric indices: [0], [-1]
	// - String keys: ['key'], ["key"]
	// - Slices: [0:5], [::2], [1:-1:2]
	// - Union: [0,1,2], ['a','b']

	const token = this.gobbleToken();
	this.gobbleSpaces();

	if (this.char === ':') {
		// Slice notation
		return parseSlice.call(this, token);
	}

	if (this.char !== ']') this.throwError('Expected ]');
	this.index++;

	if (token?.type === 'Literal') {
		if (typeof token.value === 'number') {
			return { type: 'index', value: token.value };
		}
		if (typeof token.value === 'string') {
			return { type: 'member', value: token.value };
		}
	}

	this.throwError('Invalid bracket notation');
}

function parseSlice(this: any, startToken: any): PathSegment {
	// Parse slice notation [start:end:step]
	let start: number | undefined;
	let end: number | undefined;
	let step: number | undefined;

	if (startToken?.type === 'Literal' && typeof startToken.value === 'number') {
		start = startToken.value;
	}

	this.index++; // consume first ':'
	this.gobbleSpaces();

	if (this.char !== ':' && this.char !== ']') {
		const endToken = this.gobbleToken();
		if (endToken?.type === 'Literal' && typeof endToken.value === 'number') {
			end = endToken.value;
		}
		this.gobbleSpaces();
	}

	if (this.char === ':') {
		this.index++;
		this.gobbleSpaces();
		if (this.char !== ']') {
			const stepToken = this.gobbleToken();
			if (
				stepToken?.type === 'Literal' &&
				typeof stepToken.value === 'number'
			) {
				step = stepToken.value;
			}
			this.gobbleSpaces();
		}
	}

	if (this.char !== ']') this.throwError('Expected ]');
	this.index++;

	return { type: 'slice', start, end, step };
}
```

---

## 5. AST Node Types

### 5.1 Node Type Definitions

```typescript
// @jsonpath/filter-eval/src/types.ts

import type { Expression } from 'jsep';

/**
 * All possible AST node types produced by jsep + jsonpath plugin
 */
export type FilterNode =
	| LiteralNode
	| IdentifierNode
	| UnaryExpressionNode
	| BinaryExpressionNode
	| LogicalExpressionNode
	| CallExpressionNode
	| MemberExpressionNode
	| ArrayExpressionNode
	| ConditionalExpressionNode
	| FilterQueryNode;

export interface LiteralNode {
	type: 'Literal';
	value: string | number | boolean | null | RegExp;
	raw: string;
}

export interface IdentifierNode {
	type: 'Identifier';
	name: string;
}

export interface UnaryExpressionNode {
	type: 'UnaryExpression';
	operator: '!' | '-' | '+';
	argument: FilterNode;
	prefix: boolean;
}

export interface BinaryExpressionNode {
	type: 'BinaryExpression';
	operator: '==' | '!=' | '<' | '>' | '<=' | '>=' | '+' | '-' | '*' | '/';
	left: FilterNode;
	right: FilterNode;
}

export interface LogicalExpressionNode {
	type: 'LogicalExpression';
	operator: '&&' | '||';
	left: FilterNode;
	right: FilterNode;
}

export interface CallExpressionNode {
	type: 'CallExpression';
	callee: IdentifierNode;
	arguments: FilterNode[];
}

export interface MemberExpressionNode {
	type: 'MemberExpression';
	object: FilterNode;
	property: FilterNode;
	computed: boolean;
}

export interface ArrayExpressionNode {
	type: 'ArrayExpression';
	elements: FilterNode[];
}

export interface ConditionalExpressionNode {
	type: 'ConditionalExpression';
	test: FilterNode;
	consequent: FilterNode;
	alternate: FilterNode;
}

export interface FilterQueryNode {
	type: 'FilterQuery';
	root: '@' | '$';
	segments: PathSegment[];
}

export interface PathSegment {
	type: 'member' | 'index' | 'wildcard' | 'slice' | 'filter' | 'descendant';
	value?: string | number;
	expression?: FilterNode;
	start?: number;
	end?: number;
	step?: number;
}
```

### 5.2 Node Type Guards

```typescript
// @jsonpath/filter-eval/src/guards.ts

import type { FilterNode, FilterQueryNode } from './types';

export function isLiteral(node: FilterNode): node is LiteralNode {
	return node.type === 'Literal';
}

export function isFilterQuery(node: FilterNode): node is FilterQueryNode {
	return node.type === 'FilterQuery';
}

export function isBinaryExpression(
	node: FilterNode,
): node is BinaryExpressionNode {
	return node.type === 'BinaryExpression';
}

export function isLogicalExpression(
	node: FilterNode,
): node is LogicalExpressionNode {
	return node.type === 'LogicalExpression';
}

export function isCallExpression(node: FilterNode): node is CallExpressionNode {
	return node.type === 'CallExpression';
}

// ... etc
```

---

## 6. Secure Evaluator Architecture

### 6.1 Core Evaluator Class

```typescript
// @jsonpath/filter-eval/src/evaluator.ts

import type { FilterNode, FilterQueryNode, PathSegment } from './types';
import type { FunctionRegistry } from './functions';
import { defaultFunctions } from './functions';

export interface EvaluatorOptions {
	/** Custom function registry (merged with defaults) */
	functions?: FunctionRegistry;
	/** Maximum expression depth (default: 50) */
	maxDepth?: number;
	/** Maximum array size for operations (default: 10000) */
	maxArraySize?: number;
	/** Enable strict RFC 9535 mode (default: true) */
	strict?: boolean;
}

export interface EvaluationContext {
	/** Root document ($) */
	root: unknown;
	/** Current node (@) */
	current: unknown;
	/** Current node's parent (for structural operations) */
	parent?: unknown;
	/** Current node's key in parent */
	key?: string | number;
}

/**
 * Security-hardened properties that are never accessible
 */
const FORBIDDEN_PROPERTIES = new Set([
	'constructor',
	'__proto__',
	'prototype',
	'__defineGetter__',
	'__defineSetter__',
	'__lookupGetter__',
	'__lookupSetter__',
	'hasOwnProperty',
	'isPrototypeOf',
	'propertyIsEnumerable',
	'toLocaleString',
	'toString',
	'valueOf',
]);

export class FilterEvaluator {
	private readonly functions: FunctionRegistry;
	private readonly maxDepth: number;
	private readonly maxArraySize: number;
	private readonly strict: boolean;

	constructor(options: EvaluatorOptions = {}) {
		this.functions = { ...defaultFunctions, ...options.functions };
		this.maxDepth = options.maxDepth ?? 50;
		this.maxArraySize = options.maxArraySize ?? 10000;
		this.strict = options.strict ?? true;
	}

	/**
	 * Evaluate a pre-parsed AST against a context
	 */
	evaluate(ast: FilterNode, context: EvaluationContext): unknown {
		return this.#eval(ast, context, 0);
	}

	/**
	 * Evaluate and coerce result to boolean (for filter predicates)
	 */
	evaluateAsBoolean(ast: FilterNode, context: EvaluationContext): boolean {
		const result = this.evaluate(ast, context);
		return this.#toLogical(result);
	}

	#eval(node: FilterNode, ctx: EvaluationContext, depth: number): unknown {
		if (depth > this.maxDepth) {
			throw new FilterEvaluationError('Expression depth limit exceeded', node);
		}

		switch (node.type) {
			case 'Literal':
				return node.value;

			case 'Identifier':
				return this.#resolveIdentifier(node.name, ctx);

			case 'FilterQuery':
				return this.#resolveFilterQuery(node, ctx);

			case 'UnaryExpression':
				return this.#evalUnary(node, ctx, depth);

			case 'BinaryExpression':
				return this.#evalBinary(node, ctx, depth);

			case 'LogicalExpression':
				return this.#evalLogical(node, ctx, depth);

			case 'CallExpression':
				return this.#evalCall(node, ctx, depth);

			case 'MemberExpression':
				return this.#evalMember(node, ctx, depth);

			case 'ArrayExpression':
				return this.#evalArray(node, ctx, depth);

			case 'ConditionalExpression':
				return this.#evalConditional(node, ctx, depth);

			default:
				throw new FilterEvaluationError(
					`Unsupported node type: ${(node as any).type}`,
					node,
				);
		}
	}

	#resolveIdentifier(name: string, ctx: EvaluationContext): unknown {
		switch (name) {
			case '@':
				return ctx.current;
			case '$':
				return ctx.root;
			case 'true':
				return true;
			case 'false':
				return false;
			case 'null':
				return null;
			default:
				if (this.strict) {
					throw new FilterEvaluationError(`Unknown identifier: ${name}`);
				}
				return undefined;
		}
	}

	#resolveFilterQuery(node: FilterQueryNode, ctx: EvaluationContext): unknown {
		let value = node.root === '@' ? ctx.current : ctx.root;

		for (const segment of node.segments) {
			if (value == null) return undefined;
			value = this.#resolveSegment(segment, value, ctx);
		}

		return value;
	}

	#resolveSegment(
		segment: PathSegment,
		value: unknown,
		ctx: EvaluationContext,
	): unknown {
		switch (segment.type) {
			case 'member':
				return this.#accessProperty(value, segment.value as string);

			case 'index':
				return this.#accessIndex(value, segment.value as number);

			case 'wildcard':
				return this.#resolveWildcard(value);

			case 'slice':
				return this.#resolveSlice(value, segment);

			case 'filter':
				return this.#resolveFilter(value, segment.expression!, ctx);

			case 'descendant':
				// Descendant requires special handling - collect all descendants
				return this.#resolveDescendant(value);

			default:
				throw new FilterEvaluationError(
					`Unknown segment type: ${segment.type}`,
				);
		}
	}

	#accessProperty(obj: unknown, prop: string): unknown {
		// Security: block forbidden properties
		if (FORBIDDEN_PROPERTIES.has(prop)) {
			throw new FilterEvaluationError(`Access to '${prop}' is forbidden`);
		}

		if (obj == null) return undefined;
		if (typeof obj !== 'object') return undefined;

		// Security: only own properties
		if (!Object.hasOwn(obj as object, prop)) {
			// Special case: allow 'length' on arrays and strings
			if (prop === 'length') {
				if (Array.isArray(obj)) return obj.length;
				// Note: strings are handled separately
			}
			return undefined;
		}

		return (obj as Record<string, unknown>)[prop];
	}

	#accessIndex(arr: unknown, index: number): unknown {
		if (!Array.isArray(arr)) return undefined;

		// Handle negative indices (from end)
		const normalizedIndex = index < 0 ? arr.length + index : index;

		if (normalizedIndex < 0 || normalizedIndex >= arr.length) {
			return undefined;
		}

		return arr[normalizedIndex];
	}

	#resolveWildcard(value: unknown): unknown[] {
		if (Array.isArray(value)) {
			return value;
		}
		if (value != null && typeof value === 'object') {
			return Object.values(value);
		}
		return [];
	}

	#resolveSlice(value: unknown, segment: PathSegment): unknown[] {
		if (!Array.isArray(value)) return [];

		const len = value.length;
		const step = segment.step ?? 1;

		if (step === 0) {
			throw new FilterEvaluationError('Slice step cannot be zero');
		}

		let start = segment.start ?? (step > 0 ? 0 : len - 1);
		let end = segment.end ?? (step > 0 ? len : -len - 1);

		// Normalize negative indices
		if (start < 0) start = Math.max(0, len + start);
		if (end < 0) end = Math.max(0, len + end);

		// Clamp to bounds
		start = Math.min(start, len);
		end = Math.min(end, len);

		const result: unknown[] = [];

		if (step > 0) {
			for (let i = start; i < end; i += step) {
				result.push(value[i]);
			}
		} else {
			for (let i = start; i > end; i += step) {
				result.push(value[i]);
			}
		}

		return result;
	}

	#resolveFilter(
		value: unknown,
		expression: FilterNode,
		ctx: EvaluationContext,
	): unknown[] {
		if (!Array.isArray(value)) {
			if (value != null && typeof value === 'object') {
				value = Object.values(value);
			} else {
				return [];
			}
		}

		if ((value as unknown[]).length > this.maxArraySize) {
			throw new FilterEvaluationError(
				`Array size ${(value as unknown[]).length} exceeds limit ${this.maxArraySize}`,
			);
		}

		return (value as unknown[]).filter((item) => {
			const itemCtx: EvaluationContext = {
				root: ctx.root,
				current: item,
			};
			return this.evaluateAsBoolean(expression, itemCtx);
		});
	}

	#resolveDescendant(value: unknown): unknown[] {
		const results: unknown[] = [];
		const seen = new WeakSet<object>();

		const collect = (v: unknown) => {
			if (v == null) return;

			if (typeof v === 'object') {
				if (seen.has(v as object)) return; // Cycle detection
				seen.add(v as object);
			}

			results.push(v);

			if (Array.isArray(v)) {
				for (const item of v) {
					collect(item);
				}
			} else if (typeof v === 'object') {
				for (const key of Object.keys(v as object)) {
					collect((v as Record<string, unknown>)[key]);
				}
			}
		};

		collect(value);
		return results;
	}

	#evalUnary(
		node: UnaryExpressionNode,
		ctx: EvaluationContext,
		depth: number,
	): unknown {
		const arg = this.#eval(node.argument, ctx, depth + 1);

		switch (node.operator) {
			case '!':
				return !this.#toLogical(arg);
			case '-':
				if (typeof arg !== 'number') {
					if (this.strict) {
						throw new FilterEvaluationError('Unary - requires number operand');
					}
					return NaN;
				}
				return -arg;
			case '+':
				if (typeof arg !== 'number') {
					if (this.strict) {
						throw new FilterEvaluationError('Unary + requires number operand');
					}
					return NaN;
				}
				return +arg;
			default:
				throw new FilterEvaluationError(
					`Unknown unary operator: ${node.operator}`,
				);
		}
	}

	#evalBinary(
		node: BinaryExpressionNode,
		ctx: EvaluationContext,
		depth: number,
	): unknown {
		const left = this.#eval(node.left, ctx, depth + 1);
		const right = this.#eval(node.right, ctx, depth + 1);

		switch (node.operator) {
			// Comparison (RFC 9535 §2.3.5.2)
			case '==':
				return this.#deepEqual(left, right);
			case '!=':
				return !this.#deepEqual(left, right);
			case '<':
				return this.#compare(left, right) < 0;
			case '>':
				return this.#compare(left, right) > 0;
			case '<=':
				return this.#compare(left, right) <= 0;
			case '>=':
				return this.#compare(left, right) >= 0;

			// Arithmetic (not in RFC 9535 but useful for extensions)
			case '+':
				return this.#arithmetic(left, right, (a, b) => a + b);
			case '-':
				return this.#arithmetic(left, right, (a, b) => a - b);
			case '*':
				return this.#arithmetic(left, right, (a, b) => a * b);
			case '/':
				return this.#arithmetic(left, right, (a, b) => a / b);

			default:
				throw new FilterEvaluationError(`Unknown operator: ${node.operator}`);
		}
	}

	#evalLogical(
		node: LogicalExpressionNode,
		ctx: EvaluationContext,
		depth: number,
	): boolean {
		// Short-circuit evaluation
		const left = this.#toLogical(this.#eval(node.left, ctx, depth + 1));

		switch (node.operator) {
			case '&&':
				return left && this.#toLogical(this.#eval(node.right, ctx, depth + 1));
			case '||':
				return left || this.#toLogical(this.#eval(node.right, ctx, depth + 1));
			default:
				throw new FilterEvaluationError(
					`Unknown logical operator: ${node.operator}`,
				);
		}
	}

	#evalCall(
		node: CallExpressionNode,
		ctx: EvaluationContext,
		depth: number,
	): unknown {
		if (node.callee.type !== 'Identifier') {
			throw new FilterEvaluationError('Only direct function calls are allowed');
		}

		const fnName = node.callee.name;
		const fn = this.functions[fnName];

		if (!fn) {
			throw new FilterEvaluationError(`Unknown function: ${fnName}`);
		}

		// Evaluate arguments
		const args = node.arguments.map((arg) => this.#eval(arg, ctx, depth + 1));

		// Type checking based on function signature
		if (fn.signature) {
			this.#validateFunctionArgs(fnName, args, fn.signature);
		}

		return fn.impl(args, ctx, this);
	}

	#evalMember(
		node: MemberExpressionNode,
		ctx: EvaluationContext,
		depth: number,
	): unknown {
		const obj = this.#eval(node.object, ctx, depth + 1);

		if (node.computed) {
			const prop = this.#eval(node.property, ctx, depth + 1);
			if (typeof prop === 'string') {
				return this.#accessProperty(obj, prop);
			}
			if (typeof prop === 'number') {
				return this.#accessIndex(obj, prop);
			}
			return undefined;
		} else {
			const prop = (node.property as IdentifierNode).name;
			return this.#accessProperty(obj, prop);
		}
	}

	#evalArray(
		node: ArrayExpressionNode,
		ctx: EvaluationContext,
		depth: number,
	): unknown[] {
		return node.elements.map((el) => this.#eval(el, ctx, depth + 1));
	}

	#evalConditional(
		node: ConditionalExpressionNode,
		ctx: EvaluationContext,
		depth: number,
	): unknown {
		const test = this.#toLogical(this.#eval(node.test, ctx, depth + 1));
		return test
			? this.#eval(node.consequent, ctx, depth + 1)
			: this.#eval(node.alternate, ctx, depth + 1);
	}

	/**
	 * RFC 9535 §2.3.5.2: Convert to LogicalType
	 * - NodeList: true if non-empty
	 * - Other: JavaScript truthiness
	 */
	#toLogical(value: unknown): boolean {
		if (Array.isArray(value)) {
			// NodeList existence test
			return value.length > 0;
		}
		return Boolean(value);
	}

	/**
	 * RFC 9535 comparison semantics
	 */
	#compare(left: unknown, right: unknown): number {
		// Only compare same types
		if (typeof left !== typeof right) {
			return NaN; // Incomparable
		}

		if (typeof left === 'string' && typeof right === 'string') {
			// Codepoint comparison
			return left < right ? -1 : left > right ? 1 : 0;
		}

		if (typeof left === 'number' && typeof right === 'number') {
			return left - right;
		}

		// Other types are not comparable in RFC 9535
		return NaN;
	}

	/**
	 * Deep equality for RFC 9535
	 */
	#deepEqual(a: unknown, b: unknown): boolean {
		if (a === b) return true;
		if (a == null || b == null) return a === b;
		if (typeof a !== typeof b) return false;

		if (Array.isArray(a) && Array.isArray(b)) {
			if (a.length !== b.length) return false;
			return a.every((v, i) => this.#deepEqual(v, b[i]));
		}

		if (typeof a === 'object' && typeof b === 'object') {
			const keysA = Object.keys(a);
			const keysB = Object.keys(b);
			if (keysA.length !== keysB.length) return false;
			return keysA.every(
				(key) =>
					Object.hasOwn(b as object, key) &&
					this.#deepEqual(
						(a as Record<string, unknown>)[key],
						(b as Record<string, unknown>)[key],
					),
			);
		}

		return false;
	}

	#arithmetic(
		left: unknown,
		right: unknown,
		op: (a: number, b: number) => number,
	): number {
		if (typeof left !== 'number' || typeof right !== 'number') {
			if (this.strict) {
				throw new FilterEvaluationError('Arithmetic requires number operands');
			}
			return NaN;
		}
		return op(left, right);
	}

	#validateFunctionArgs(
		fnName: string,
		args: unknown[],
		signature: FunctionSignature,
	): void {
		if (args.length < signature.minArgs) {
			throw new FilterEvaluationError(
				`${fnName} requires at least ${signature.minArgs} arguments`,
			);
		}
		if (signature.maxArgs !== undefined && args.length > signature.maxArgs) {
			throw new FilterEvaluationError(
				`${fnName} accepts at most ${signature.maxArgs} arguments`,
			);
		}

		// Type validation per argument
		for (let i = 0; i < args.length; i++) {
			const expectedType = signature.argTypes?.[i] ?? signature.argTypes?.[0];
			if (expectedType && !this.#checkType(args[i], expectedType)) {
				throw new FilterEvaluationError(
					`${fnName} argument ${i + 1} expected ${expectedType}`,
				);
			}
		}
	}

	#checkType(value: unknown, expected: ValueType): boolean {
		switch (expected) {
			case 'ValueType':
				return true; // Any value
			case 'LogicalType':
				return typeof value === 'boolean';
			case 'NodesType':
				return Array.isArray(value);
			case 'string':
				return typeof value === 'string';
			case 'number':
				return typeof value === 'number';
			default:
				return true;
		}
	}
}

export class FilterEvaluationError extends Error {
	constructor(
		message: string,
		public readonly node?: FilterNode,
	) {
		super(message);
		this.name = 'FilterEvaluationError';
	}
}
```

---

## 7. Type System

RFC 9535 §2.4.1 defines a type system for function expressions:

```typescript
// @jsonpath/filter-eval/src/types/value-types.ts

/**
 * RFC 9535 Type System
 */
export type ValueType =
	| 'ValueType' // Any JSON value (null, boolean, number, string, array, object)
	| 'LogicalType' // Boolean result (true/false)
	| 'NodesType'; // Nodelist (array of matched nodes)

/**
 * Type conversion rules (RFC 9535 §2.4.2)
 */
export const TYPE_CONVERSIONS: Record<string, ValueType[]> = {
	// NodesType can convert to LogicalType (existence test)
	NodesType: ['LogicalType'],
	// No other implicit conversions
};

export function canConvert(from: ValueType, to: ValueType): boolean {
	if (from === to) return true;
	return TYPE_CONVERSIONS[from]?.includes(to) ?? false;
}
```

---

## 8. Built-in Functions

RFC 9535 §2.4.4 defines these built-in functions:

```typescript
// @jsonpath/filter-eval/src/functions/index.ts

import type { EvaluationContext, FilterEvaluator } from '../evaluator';

export interface FunctionSignature {
	minArgs: number;
	maxArgs?: number;
	argTypes?: ValueType[];
	returnType: ValueType;
}

export interface FilterFunction {
	signature?: FunctionSignature;
	impl: (
		args: unknown[],
		ctx: EvaluationContext,
		evaluator: FilterEvaluator,
	) => unknown;
}

export type FunctionRegistry = Record<string, FilterFunction>;

/**
 * RFC 9535 Built-in Functions
 */
export const defaultFunctions: FunctionRegistry = {
	/**
	 * length(value) → number
	 * Returns the length of a string or array
	 */
	length: {
		signature: {
			minArgs: 1,
			maxArgs: 1,
			argTypes: ['ValueType'],
			returnType: 'ValueType',
		},
		impl: ([value]) => {
			if (typeof value === 'string') return value.length;
			if (Array.isArray(value)) return value.length;
			if (value != null && typeof value === 'object') {
				return Object.keys(value).length;
			}
			return undefined;
		},
	},

	/**
	 * count(nodes) → number
	 * Returns the number of nodes in a nodelist
	 */
	count: {
		signature: {
			minArgs: 1,
			maxArgs: 1,
			argTypes: ['NodesType'],
			returnType: 'ValueType',
		},
		impl: ([nodes]) => {
			if (Array.isArray(nodes)) return nodes.length;
			return 0;
		},
	},

	/**
	 * match(string, pattern) → boolean
	 * Tests if the entire string matches the I-Regexp pattern
	 */
	match: {
		signature: {
			minArgs: 2,
			maxArgs: 2,
			argTypes: ['ValueType', 'ValueType'],
			returnType: 'LogicalType',
		},
		impl: ([str, pattern]) => {
			if (typeof str !== 'string' || typeof pattern !== 'string') {
				return false;
			}
			try {
				// I-Regexp (RFC 9485): anchor the pattern for full match
				const regex = iRegexpToRegex(pattern);
				const anchored = new RegExp(`^(?:${regex.source})$`, regex.flags);
				return anchored.test(str);
			} catch {
				return false;
			}
		},
	},

	/**
	 * search(string, pattern) → boolean
	 * Tests if any substring matches the I-Regexp pattern
	 */
	search: {
		signature: {
			minArgs: 2,
			maxArgs: 2,
			argTypes: ['ValueType', 'ValueType'],
			returnType: 'LogicalType',
		},
		impl: ([str, pattern]) => {
			if (typeof str !== 'string' || typeof pattern !== 'string') {
				return false;
			}
			try {
				const regex = iRegexpToRegex(pattern);
				return regex.test(str);
			} catch {
				return false;
			}
		},
	},

	/**
	 * value(nodes) → value
	 * Extracts the value from a singleton nodelist
	 */
	value: {
		signature: {
			minArgs: 1,
			maxArgs: 1,
			argTypes: ['NodesType'],
			returnType: 'ValueType',
		},
		impl: ([nodes]) => {
			if (!Array.isArray(nodes)) return undefined;
			if (nodes.length !== 1) return undefined;
			return nodes[0];
		},
	},
};

/**
 * Convert I-Regexp (RFC 9485) pattern to JavaScript RegExp
 *
 * Key differences:
 * - In I-Regexp, `.` does not match `\n` or `\r`
 * - Unicode is always enabled
 */
function iRegexpToRegex(pattern: string): RegExp {
	// I-Regexp validation: no unsupported features
	// This is a simplified implementation; full compliance requires more work

	// Replace `.` with `[^\n\r]` to match I-Regexp semantics
	// (only outside character classes)
	let converted = '';
	let inCharClass = false;
	let escaped = false;

	for (const char of pattern) {
		if (escaped) {
			converted += char;
			escaped = false;
		} else if (char === '\\') {
			converted += char;
			escaped = true;
		} else if (char === '[') {
			inCharClass = true;
			converted += char;
		} else if (char === ']' && inCharClass) {
			inCharClass = false;
			converted += char;
		} else if (char === '.' && !inCharClass) {
			converted += '[^\\n\\r]';
		} else {
			converted += char;
		}
	}

	return new RegExp(converted, 'u');
}
```

---

## 9. Custom Function Extensions

### 9.1 Function Registration API

```typescript
// @jsonpath/filter-eval/src/functions/registry.ts

import type {
	FilterFunction,
	FunctionRegistry,
	FunctionSignature,
} from './index';

export interface FunctionDefinition {
	name: string;
	signature: FunctionSignature;
	impl: FilterFunction['impl'];
}

export function createFunctionRegistry(
	...definitions: FunctionDefinition[]
): FunctionRegistry {
	const registry: FunctionRegistry = {};

	for (const def of definitions) {
		registry[def.name] = {
			signature: def.signature,
			impl: def.impl,
		};
	}

	return registry;
}

/**
 * Merge multiple registries, later ones override earlier
 */
export function mergeFunctionRegistries(
	...registries: FunctionRegistry[]
): FunctionRegistry {
	return Object.assign({}, ...registries);
}
```

### 9.2 Example Custom Functions

```typescript
// @jsonpath/filter-eval/src/functions/extensions.ts

import { createFunctionRegistry } from './registry';

/**
 * Additional useful functions (not in RFC 9535)
 */
export const extensionFunctions = createFunctionRegistry(
	{
		name: 'floor',
		signature: { minArgs: 1, maxArgs: 1, returnType: 'ValueType' },
		impl: ([n]) => (typeof n === 'number' ? Math.floor(n) : undefined),
	},
	{
		name: 'ceil',
		signature: { minArgs: 1, maxArgs: 1, returnType: 'ValueType' },
		impl: ([n]) => (typeof n === 'number' ? Math.ceil(n) : undefined),
	},
	{
		name: 'round',
		signature: { minArgs: 1, maxArgs: 1, returnType: 'ValueType' },
		impl: ([n]) => (typeof n === 'number' ? Math.round(n) : undefined),
	},
	{
		name: 'abs',
		signature: { minArgs: 1, maxArgs: 1, returnType: 'ValueType' },
		impl: ([n]) => (typeof n === 'number' ? Math.abs(n) : undefined),
	},
	{
		name: 'min',
		signature: { minArgs: 1, argTypes: ['NodesType'], returnType: 'ValueType' },
		impl: ([nodes]) => {
			if (!Array.isArray(nodes)) return undefined;
			const nums = nodes.filter((n): n is number => typeof n === 'number');
			return nums.length > 0 ? Math.min(...nums) : undefined;
		},
	},
	{
		name: 'max',
		signature: { minArgs: 1, argTypes: ['NodesType'], returnType: 'ValueType' },
		impl: ([nodes]) => {
			if (!Array.isArray(nodes)) return undefined;
			const nums = nodes.filter((n): n is number => typeof n === 'number');
			return nums.length > 0 ? Math.max(...nums) : undefined;
		},
	},
	{
		name: 'sum',
		signature: { minArgs: 1, argTypes: ['NodesType'], returnType: 'ValueType' },
		impl: ([nodes]) => {
			if (!Array.isArray(nodes)) return undefined;
			return nodes.reduce((acc: number, n) => {
				return typeof n === 'number' ? acc + n : acc;
			}, 0);
		},
	},
	{
		name: 'avg',
		signature: { minArgs: 1, argTypes: ['NodesType'], returnType: 'ValueType' },
		impl: ([nodes]) => {
			if (!Array.isArray(nodes) || nodes.length === 0) return undefined;
			const nums = nodes.filter((n): n is number => typeof n === 'number');
			if (nums.length === 0) return undefined;
			return nums.reduce((a, b) => a + b, 0) / nums.length;
		},
	},
	{
		name: 'lower',
		signature: { minArgs: 1, maxArgs: 1, returnType: 'ValueType' },
		impl: ([s]) => (typeof s === 'string' ? s.toLowerCase() : undefined),
	},
	{
		name: 'upper',
		signature: { minArgs: 1, maxArgs: 1, returnType: 'ValueType' },
		impl: ([s]) => (typeof s === 'string' ? s.toUpperCase() : undefined),
	},
	{
		name: 'trim',
		signature: { minArgs: 1, maxArgs: 1, returnType: 'ValueType' },
		impl: ([s]) => (typeof s === 'string' ? s.trim() : undefined),
	},
	{
		name: 'contains',
		signature: { minArgs: 2, maxArgs: 2, returnType: 'LogicalType' },
		impl: ([haystack, needle]) => {
			if (typeof haystack === 'string' && typeof needle === 'string') {
				return haystack.includes(needle);
			}
			if (Array.isArray(haystack)) {
				return haystack.some((item) => item === needle);
			}
			return false;
		},
	},
	{
		name: 'startsWith',
		signature: { minArgs: 2, maxArgs: 2, returnType: 'LogicalType' },
		impl: ([str, prefix]) => {
			if (typeof str !== 'string' || typeof prefix !== 'string') return false;
			return str.startsWith(prefix);
		},
	},
	{
		name: 'endsWith',
		signature: { minArgs: 2, maxArgs: 2, returnType: 'LogicalType' },
		impl: ([str, suffix]) => {
			if (typeof str !== 'string' || typeof suffix !== 'string') return false;
			return str.endsWith(suffix);
		},
	},
	{
		name: 'type',
		signature: { minArgs: 1, maxArgs: 1, returnType: 'ValueType' },
		impl: ([value]) => {
			if (value === null) return 'null';
			if (Array.isArray(value)) return 'array';
			return typeof value;
		},
	},
	{
		name: 'keys',
		signature: { minArgs: 1, maxArgs: 1, returnType: 'NodesType' },
		impl: ([obj]) => {
			if (obj == null || typeof obj !== 'object') return [];
			if (Array.isArray(obj)) return obj.map((_, i) => i);
			return Object.keys(obj);
		},
	},
	{
		name: 'values',
		signature: { minArgs: 1, maxArgs: 1, returnType: 'NodesType' },
		impl: ([obj]) => {
			if (obj == null || typeof obj !== 'object') return [];
			return Object.values(obj);
		},
	},
);
```

---

## 10. Performance Optimization

### 10.1 Compilation Strategy

```typescript
// @jsonpath/filter-eval/src/compiler.ts

import jsep from 'jsep';
import type { FilterNode } from './types';
import {
	FilterEvaluator,
	EvaluatorOptions,
	EvaluationContext,
} from './evaluator';
import { jsonpathPlugin } from './plugins/jsonpath-plugin';

// Configure jsep once at module load
jsep.plugins.register(jsonpathPlugin);

export type CompiledFilter = (context: EvaluationContext) => boolean;

/**
 * Parse and compile a filter expression for repeated evaluation
 */
export function compileFilter(
	expression: string,
	options?: EvaluatorOptions,
): CompiledFilter {
	// Parse once
	const ast = jsep(expression) as FilterNode;

	// Create evaluator (can be shared across multiple expressions)
	const evaluator = new FilterEvaluator(options);

	// Return bound evaluation function
	return (context: EvaluationContext): boolean => {
		return evaluator.evaluateAsBoolean(ast, context);
	};
}

/**
 * Pre-parse an expression without compiling an evaluator
 * Useful when you want to share an evaluator across expressions
 */
export function parseFilter(expression: string): FilterNode {
	return jsep(expression) as FilterNode;
}

/**
 * Compilation cache for frequently-used expressions
 */
export class FilterCache {
	private readonly cache = new Map<string, CompiledFilter>();
	private readonly maxSize: number;
	private readonly evaluator: FilterEvaluator;

	constructor(options?: EvaluatorOptions & { maxCacheSize?: number }) {
		this.maxSize = options?.maxCacheSize ?? 1000;
		this.evaluator = new FilterEvaluator(options);
	}

	compile(expression: string): CompiledFilter {
		let compiled = this.cache.get(expression);

		if (!compiled) {
			const ast = jsep(expression) as FilterNode;
			compiled = (ctx) => this.evaluator.evaluateAsBoolean(ast, ctx);

			// LRU eviction (simple version - delete oldest on overflow)
			if (this.cache.size >= this.maxSize) {
				const firstKey = this.cache.keys().next().value;
				if (firstKey) this.cache.delete(firstKey);
			}

			this.cache.set(expression, compiled);
		}

		return compiled;
	}

	clear(): void {
		this.cache.clear();
	}

	get size(): number {
		return this.cache.size;
	}
}
```

### 10.2 JIT Optimization Patterns

For hot paths, consider generating optimized evaluation functions:

```typescript
// @jsonpath/filter-eval/src/jit.ts

import type {
	FilterNode,
	BinaryExpressionNode,
	FilterQueryNode,
} from './types';

/**
 * Analyze an AST to determine if it's a "fast path" candidate
 */
export function canJIT(ast: FilterNode): boolean {
	// Fast paths for common patterns:
	// - Simple property comparison: @.price < 100
	// - Existence test: @.isbn
	// - String equality: @.category == "fiction"

	switch (ast.type) {
		case 'BinaryExpression':
			return isSimpleComparison(ast);
		case 'FilterQuery':
			return isSimplePath(ast);
		case 'LogicalExpression':
			return canJIT(ast.left) && canJIT(ast.right);
		default:
			return false;
	}
}

function isSimpleComparison(node: BinaryExpressionNode): boolean {
	// Pattern: @.prop op literal
	const isLeftSimplePath =
		node.left.type === 'FilterQuery' &&
		isSimplePath(node.left as FilterQueryNode);
	const isRightLiteral = node.right.type === 'Literal';

	return isLeftSimplePath && isRightLiteral;
}

function isSimplePath(node: FilterQueryNode): boolean {
	// Only direct member access, no wildcards/filters/descendants
	return node.segments.every((s) => s.type === 'member' || s.type === 'index');
}

/**
 * Generate an optimized function for simple patterns
 */
export function jitCompile(
	ast: FilterNode,
): ((ctx: EvaluationContext) => boolean) | null {
	if (!canJIT(ast)) return null;

	if (ast.type === 'BinaryExpression') {
		return jitComparison(ast as BinaryExpressionNode);
	}

	if (ast.type === 'FilterQuery') {
		return jitExistence(ast as FilterQueryNode);
	}

	return null;
}

function jitComparison(
	node: BinaryExpressionNode,
): (ctx: EvaluationContext) => boolean {
	const path = node.left as FilterQueryNode;
	const literal = (node.right as { value: unknown }).value;
	const op = node.operator;

	// Build path accessor
	const segments = path.segments;
	const accessor = buildAccessor(path.root, segments);

	// Return optimized comparison function
	switch (op) {
		case '==':
			return (ctx) => accessor(ctx) === literal;
		case '!=':
			return (ctx) => accessor(ctx) !== literal;
		case '<':
			return (ctx) => (accessor(ctx) as number) < (literal as number);
		case '>':
			return (ctx) => (accessor(ctx) as number) > (literal as number);
		case '<=':
			return (ctx) => (accessor(ctx) as number) <= (literal as number);
		case '>=':
			return (ctx) => (accessor(ctx) as number) >= (literal as number);
		default:
			return () => false;
	}
}

function jitExistence(
	node: FilterQueryNode,
): (ctx: EvaluationContext) => boolean {
	const accessor = buildAccessor(node.root, node.segments);
	return (ctx) => accessor(ctx) !== undefined;
}

function buildAccessor(
	root: '@' | '$',
	segments: PathSegment[],
): (ctx: EvaluationContext) => unknown {
	// Generate direct property access chain
	return (ctx: EvaluationContext): unknown => {
		let value: unknown = root === '@' ? ctx.current : ctx.root;

		for (const segment of segments) {
			if (value == null) return undefined;

			if (segment.type === 'member') {
				if (typeof value !== 'object') return undefined;
				if (!Object.hasOwn(value as object, segment.value as string)) {
					return undefined;
				}
				value = (value as Record<string, unknown>)[segment.value as string];
			} else if (segment.type === 'index') {
				if (!Array.isArray(value)) return undefined;
				value = value[segment.value as number];
			}
		}

		return value;
	};
}
```

### 10.3 Performance Benchmarks Target

| Scenario                 | Target | Notes                               |
| ------------------------ | ------ | ----------------------------------- |
| Parse simple expression  | < 10μs | `@.price < 100`                     |
| Parse complex expression | < 50μs | Nested filters, functions           |
| Evaluate simple filter   | < 1μs  | Compiled, single property           |
| Evaluate complex filter  | < 10μs | Multiple conditions, function calls |
| Filter 1000 items        | < 1ms  | Simple predicate                    |
| Filter 1000 items        | < 5ms  | Complex predicate with functions    |

---

## 11. Security Considerations

### 11.1 Threat Model

| Threat                 | Mitigation                              |
| ---------------------- | --------------------------------------- |
| Prototype pollution    | Forbidden property set, `hasOwn` checks |
| Global access          | No identifiers resolve to globals       |
| DoS via deep recursion | Depth limit (default 50)                |
| DoS via large arrays   | Array size limit (default 10000)        |
| ReDoS via regex        | I-Regexp validation, timeout wrapper    |
| Code injection         | No eval/Function, parse-only approach   |
| Information leakage    | Generic error messages in production    |

### 11.2 Security Checklist

```typescript
// @jsonpath/filter-eval/src/security.ts

/**
 * Validate that an expression is safe to evaluate
 */
export function validateExpression(ast: FilterNode): ValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	walkAST(ast, (node, depth) => {
		// Check depth
		if (depth > 100) {
			errors.push('Expression exceeds maximum nesting depth');
			return false; // Stop walking
		}

		// Check for dangerous patterns
		if (node.type === 'Identifier') {
			const name = (node as IdentifierNode).name;
			if (FORBIDDEN_IDENTIFIERS.has(name)) {
				errors.push(`Forbidden identifier: ${name}`);
			}
		}

		if (node.type === 'MemberExpression') {
			const prop = getMemberProperty(node as MemberExpressionNode);
			if (prop && FORBIDDEN_PROPERTIES.has(prop)) {
				errors.push(`Forbidden property access: ${prop}`);
			}
		}

		if (node.type === 'CallExpression') {
			const callee = (node as CallExpressionNode).callee;
			if (callee.type !== 'Identifier') {
				errors.push('Computed function calls are not allowed');
			}
		}

		return true; // Continue walking
	});

	return { valid: errors.length === 0, errors, warnings };
}

const FORBIDDEN_IDENTIFIERS = new Set([
	'eval',
	'Function',
	'constructor',
	'window',
	'global',
	'globalThis',
	'process',
	'require',
	'import',
	'module',
	'exports',
]);

const FORBIDDEN_PROPERTIES = new Set([
	'constructor',
	'__proto__',
	'prototype',
	'__defineGetter__',
	'__defineSetter__',
	'__lookupGetter__',
	'__lookupSetter__',
]);

interface ValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}
```

### 11.3 Safe Regex Evaluation

```typescript
// @jsonpath/filter-eval/src/regex-sandbox.ts

/**
 * Execute regex with timeout protection against ReDoS
 */
export function safeRegexTest(
	regex: RegExp,
	input: string,
	timeoutMs: number = 100,
): boolean {
	// For browsers, we can't easily timeout sync operations
	// Option 1: Use Web Workers
	// Option 2: Limit input length
	// Option 3: Use a safe-regex library to validate pattern first

	// Simple approach: limit input length
	const MAX_INPUT_LENGTH = 10000;
	if (input.length > MAX_INPUT_LENGTH) {
		throw new FilterEvaluationError(
			`Input string exceeds maximum length for regex matching`,
		);
	}

	// Validate regex complexity
	if (!isSafeRegex(regex.source)) {
		throw new FilterEvaluationError('Regex pattern is potentially unsafe');
	}

	return regex.test(input);
}

/**
 * Basic ReDoS detection heuristics
 */
function isSafeRegex(pattern: string): boolean {
	// Detect common ReDoS patterns:
	// - Nested quantifiers: (a+)+
	// - Overlapping alternations: (a|a)+

	// This is a simplified check; consider using 'safe-regex' package
	const dangerousPatterns = [
		/\([^)]*[+*][^)]*\)[+*]/, // Nested quantifiers
		/\([^)]*\|[^)]*\)[+*]/, // Alternation with quantifier
	];

	return !dangerousPatterns.some((p) => p.test(pattern));
}
```

---

## 12. Error Handling

### 12.1 Error Types

```typescript
// @jsonpath/filter-eval/src/errors.ts

export class FilterError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'FilterError';
	}
}

export class FilterParseError extends FilterError {
	constructor(
		message: string,
		public readonly expression: string,
		public readonly position?: number,
	) {
		super(message);
		this.name = 'FilterParseError';
	}
}

export class FilterEvaluationError extends FilterError {
	constructor(
		message: string,
		public readonly node?: FilterNode,
	) {
		super(message);
		this.name = 'FilterEvaluationError';
	}
}

export class FilterTypeError extends FilterError {
	constructor(
		message: string,
		public readonly expected: string,
		public readonly received: string,
	) {
		super(message);
		this.name = 'FilterTypeError';
	}
}

export class FilterSecurityError extends FilterError {
	constructor(message: string) {
		super(message);
		this.name = 'FilterSecurityError';
	}
}
```

### 12.2 Error Messages

```typescript
// @jsonpath/filter-eval/src/error-messages.ts

export const ERROR_MESSAGES = {
	// Parse errors
	UNEXPECTED_TOKEN: (char: string) => `Unexpected token: ${char}`,
	UNTERMINATED_STRING: 'Unterminated string literal',
	INVALID_NUMBER: 'Invalid number literal',
	EXPECTED_BRACKET: 'Expected closing bracket',

	// Evaluation errors
	UNKNOWN_IDENTIFIER: (name: string) => `Unknown identifier: ${name}`,
	UNKNOWN_FUNCTION: (name: string) => `Unknown function: ${name}`,
	UNSUPPORTED_NODE: (type: string) => `Unsupported node type: ${type}`,
	UNSUPPORTED_OPERATOR: (op: string) => `Unsupported operator: ${op}`,

	// Type errors
	TYPE_MISMATCH: (expected: string, received: string) =>
		`Type mismatch: expected ${expected}, got ${received}`,
	ARG_COUNT_MIN: (fn: string, min: number) =>
		`${fn} requires at least ${min} argument(s)`,
	ARG_COUNT_MAX: (fn: string, max: number) =>
		`${fn} accepts at most ${max} argument(s)`,

	// Security errors
	FORBIDDEN_PROPERTY: (prop: string) => `Access to '${prop}' is forbidden`,
	DEPTH_EXCEEDED: 'Expression depth limit exceeded',
	ARRAY_SIZE_EXCEEDED: 'Array size limit exceeded',

	// Production-safe generic messages
	GENERIC_PARSE_ERROR: 'Invalid filter expression',
	GENERIC_EVAL_ERROR: 'Filter evaluation failed',
} as const;
```

---

## 13. Testing Strategy

### 13.1 Test Categories

```typescript
// @jsonpath/filter-eval/tests/categories.ts

export const TEST_CATEGORIES = {
	// Unit tests for individual components
	PARSER: 'parser',
	EVALUATOR: 'evaluator',
	FUNCTIONS: 'functions',
	SECURITY: 'security',

	// Integration tests
	RFC_COMPLIANCE: 'rfc-compliance',
	CTS: 'compliance-test-suite',

	// Performance tests
	BENCHMARK: 'benchmark',
	STRESS: 'stress',
} as const;
```

### 13.2 RFC 9535 Compliance Tests

```typescript
// @jsonpath/filter-eval/tests/rfc-compliance.test.ts

import { describe, it, expect } from 'vitest';
import { compileFilter } from '../src/compiler';

describe('RFC 9535 Filter Expression Compliance', () => {
	describe('§2.3.5.2 Comparison Operators', () => {
		const data = {
			store: {
				book: [
					{ title: 'A', price: 10 },
					{ title: 'B', price: 20 },
					{ title: 'C', price: 30 },
				],
			},
		};

		it.each([
			['@.price == 10', [true, false, false]],
			['@.price != 10', [false, true, true]],
			['@.price < 20', [true, false, false]],
			['@.price <= 20', [true, true, false]],
			['@.price > 20', [false, false, true]],
			['@.price >= 20', [false, true, true]],
		])('evaluates %s correctly', (expr, expected) => {
			const filter = compileFilter(expr);
			const results = data.store.book.map((book) =>
				filter({ root: data, current: book }),
			);
			expect(results).toEqual(expected);
		});
	});

	describe('§2.3.5.3 Logical Operators', () => {
		it.each([
			['@.price > 10 && @.price < 30', [false, true, false]],
			['@.price < 15 || @.price > 25', [true, false, true]],
			['!(@.price == 20)', [true, false, true]],
		])('evaluates %s correctly', (expr, expected) => {
			const filter = compileFilter(expr);
			const data = { items: [{ price: 10 }, { price: 20 }, { price: 30 }] };
			const results = data.items.map((item) =>
				filter({ root: data, current: item }),
			);
			expect(results).toEqual(expected);
		});
	});

	describe('§2.4.4 Built-in Functions', () => {
		describe('length()', () => {
			it('returns string length', () => {
				const filter = compileFilter('length(@.name) > 3');
				expect(filter({ root: {}, current: { name: 'Alice' } })).toBe(true);
				expect(filter({ root: {}, current: { name: 'Bob' } })).toBe(false);
			});

			it('returns array length', () => {
				const filter = compileFilter('length(@.items) == 2');
				expect(filter({ root: {}, current: { items: [1, 2] } })).toBe(true);
			});
		});

		describe('match()', () => {
			it('matches entire string', () => {
				const filter = compileFilter('match(@.name, "A.*")');
				expect(filter({ root: {}, current: { name: 'Alice' } })).toBe(true);
				expect(filter({ root: {}, current: { name: 'Bob' } })).toBe(false);
			});
		});

		describe('search()', () => {
			it('finds substring match', () => {
				const filter = compileFilter('search(@.text, "world")');
				expect(filter({ root: {}, current: { text: 'hello world' } })).toBe(
					true,
				);
				expect(filter({ root: {}, current: { text: 'hello' } })).toBe(false);
			});
		});
	});
});
```

### 13.3 Security Tests

```typescript
// @jsonpath/filter-eval/tests/security.test.ts

import { describe, it, expect } from 'vitest';
import { compileFilter, FilterEvaluator } from '../src';

describe('Security', () => {
	describe('Prototype Pollution Prevention', () => {
		const maliciousExpressions = [
			'@.constructor',
			'@.__proto__',
			'@.prototype',
			'@["constructor"]',
			'@["__proto__"]',
			'$.constructor.constructor',
		];

		it.each(maliciousExpressions)('blocks access to %s', (expr) => {
			expect(() => {
				const filter = compileFilter(expr);
				filter({ root: {}, current: {} });
			}).toThrow(/forbidden/i);
		});
	});

	describe('Global Access Prevention', () => {
		it('cannot access window/global', () => {
			const evaluator = new FilterEvaluator({ strict: true });
			expect(() => {
				evaluator.evaluate(
					{ type: 'Identifier', name: 'window' },
					{ root: {}, current: {} },
				);
			}).toThrow(/unknown identifier/i);
		});
	});

	describe('DoS Prevention', () => {
		it('rejects deeply nested expressions', () => {
			// Generate deeply nested expression
			let expr = '@.a';
			for (let i = 0; i < 100; i++) {
				expr = `(${expr})`;
			}

			const filter = compileFilter(expr);
			expect(() => {
				filter({ root: {}, current: { a: 1 } });
			}).toThrow(/depth/i);
		});

		it('rejects overly large arrays', () => {
			const filter = compileFilter('@[*]');
			const largeArray = new Array(100000).fill(1);

			expect(() => {
				filter({ root: {}, current: largeArray });
			}).toThrow(/size/i);
		});
	});
});
```

### 13.4 JSONPath Compliance Test Suite Integration

```typescript
// @jsonpath/filter-eval/tests/cts.test.ts

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { compileFilter } from '../src/compiler';

// Load the official JSONPath Compliance Test Suite
// https://github.com/jsonpath-standard/jsonpath-compliance-test-suite
const CTS_PATH = './node_modules/jsonpath-compliance-test-suite/cts.json';

interface CTSTestCase {
	name: string;
	selector: string;
	document: unknown;
	result?: unknown[];
	invalid_selector?: boolean;
}

describe('JSONPath Compliance Test Suite - Filter Tests', () => {
	const cts = JSON.parse(readFileSync(CTS_PATH, 'utf-8')) as {
		tests: CTSTestCase[];
	};

	// Filter to only filter-related tests
	const filterTests = cts.tests.filter(
		(t) => t.selector.includes('[?') && !t.invalid_selector,
	);

	it.each(filterTests.map((t) => [t.name, t]))('%s', (_, test) => {
		// Extract filter expression from selector
		const filterMatch = test.selector.match(/\[\?([^\]]+)\]/);
		if (!filterMatch) return;

		const filterExpr = filterMatch[1];
		const filter = compileFilter(filterExpr);

		// This is a simplified test - full implementation would
		// apply the entire JSONPath query and compare results
		expect(filter).toBeDefined();
	});
});
```

---

## 14. API Reference

### 14.1 Main Exports

```typescript
// @jsonpath/filter-eval/src/index.ts

// Core classes
export {
	FilterEvaluator,
	type EvaluatorOptions,
	type EvaluationContext,
} from './evaluator';
export { FilterCache } from './compiler';

// Functions
export { compileFilter, parseFilter } from './compiler';
export { validateExpression } from './security';

// Types
export type {
	FilterNode,
	FilterQueryNode,
	PathSegment,
	LiteralNode,
	BinaryExpressionNode,
	LogicalExpressionNode,
	CallExpressionNode,
} from './types';

// Function registry
export type {
	FilterFunction,
	FunctionRegistry,
	FunctionSignature,
} from './functions';
export { defaultFunctions } from './functions';
export { extensionFunctions } from './functions/extensions';
export {
	createFunctionRegistry,
	mergeFunctionRegistries,
} from './functions/registry';

// Errors
export {
	FilterError,
	FilterParseError,
	FilterEvaluationError,
	FilterTypeError,
	FilterSecurityError,
} from './errors';
```

### 14.2 Quick Start

```typescript
import { compileFilter, FilterCache } from '@jsonpath/filter-eval';

// Simple usage
const filter = compileFilter('@.price < 100 && @.inStock == true');

const products = [
	{ name: 'A', price: 50, inStock: true },
	{ name: 'B', price: 150, inStock: true },
	{ name: 'C', price: 75, inStock: false },
];

const results = products.filter((product) =>
	filter({ root: products, current: product }),
);
// results: [{ name: 'A', price: 50, inStock: true }]

// With caching for repeated expressions
const cache = new FilterCache({ maxCacheSize: 500 });
const cachedFilter = cache.compile('@.category == "electronics"');

// With custom functions
import {
	FilterEvaluator,
	mergeFunctionRegistries,
	defaultFunctions,
} from '@jsonpath/filter-eval';

const customFunctions = {
	inRange: {
		impl: ([value, min, max]) =>
			typeof value === 'number' && value >= min && value <= max,
	},
};

const evaluator = new FilterEvaluator({
	functions: { ...defaultFunctions, ...customFunctions },
});
```

---

## 15. Integration with @jsonpath/core

### 15.1 Package Structure

```
@jsonpath/
├── core/              # Main JSONPath query engine
│   ├── src/
│   │   ├── parser.ts      # JSONPath parser
│   │   ├── query.ts       # Query execution
│   │   └── index.ts
│   └── package.json
├── filter-eval/       # This package
│   ├── src/
│   │   ├── evaluator.ts
│   │   ├── compiler.ts
│   │   └── ...
│   └── package.json
├── pointer/           # JSON Pointer (RFC 6901)
├── patch/             # JSON Patch (RFC 6902)
└── merge-patch/       # JSON Merge Patch (RFC 7396)
```

### 15.2 Integration Interface

```typescript
// @jsonpath/core/src/filter-integration.ts

import type {
	CompiledFilter,
	FilterNode,
	EvaluationContext,
} from '@jsonpath/filter-eval';
import { compileFilter, FilterCache } from '@jsonpath/filter-eval';

export interface FilterProvider {
	compile(expression: string): CompiledFilter;
	evaluate(
		expression: string | FilterNode,
		context: EvaluationContext,
	): boolean;
}

/**
 * Create a filter provider for use with @jsonpath/core
 */
export function createFilterProvider(
	options?: FilterProviderOptions,
): FilterProvider {
	const cache = new FilterCache(options);

	return {
		compile: (expression: string) => cache.compile(expression),
		evaluate: (expression, context) => {
			if (typeof expression === 'string') {
				return cache.compile(expression)(context);
			}
			// Handle pre-parsed AST
			return evaluator.evaluateAsBoolean(expression, context);
		},
	};
}

// Usage in @jsonpath/core
import { createFilterProvider } from './filter-integration';

const filterProvider = createFilterProvider();

function executeFilterSelector(
	selector: FilterSelector,
	nodes: Node[],
	root: unknown,
): Node[] {
	const filter = filterProvider.compile(selector.expression);

	return nodes.flatMap((node) => {
		if (!Array.isArray(node.value) && typeof node.value !== 'object') {
			return [];
		}

		const items = Array.isArray(node.value)
			? node.value
			: Object.values(node.value);

		return items
			.filter((item) => filter({ root, current: item }))
			.map((item) => createNode(item, node));
	});
}
```

---

## 16. Migration Path

### 16.1 From eval-based Implementation

If migrating from a `new Function()` or `eval()` based filter implementation:

```typescript
// Before (unsafe)
function evaluateFilter(expr: string, context: any): boolean {
	const fn = new Function('$', '@', `return ${expr}`);
	return fn(context.root, context.current);
}

// After (safe)
import { compileFilter } from '@jsonpath/filter-eval';

function evaluateFilter(expr: string, context: EvaluationContext): boolean {
	const filter = compileFilter(expr);
	return filter(context);
}
```

### 16.2 From json-p3 or Similar

```typescript
// Before (using json-p3's built-in filter)
import { query } from 'json-p3';

const results = query('$.store.book[?@.price < 10]', data);

// After (hybrid approach - use @jsonpath/filter-eval for custom needs)
import { query } from 'json-p3';
import { compileFilter } from '@jsonpath/filter-eval';

// json-p3 for standard queries (already safe)
const results = query('$.store.book[?@.price < 10]', data);

// @jsonpath/filter-eval for advanced/custom filters
const customFilter = compileFilter(
	'inRange(@.price, 5, 15) && contains(@.tags, "sale")',
);
```

---

## Appendix A: ABNF Grammar Reference

Complete RFC 9535 filter expression ABNF:

```abnf
; Filter selector (§2.3.5)
filter-selector     = "?" S logical-expr

; Logical expressions (§2.3.5.1)
logical-expr        = logical-or-expr
logical-or-expr     = logical-and-expr *(S "||" S logical-and-expr)
logical-and-expr    = basic-expr *(S "&&" S basic-expr)

basic-expr          = paren-expr / comparison-expr / test-expr
paren-expr          = [logical-not-op S] "(" S logical-expr S ")"
logical-not-op      = "!"

test-expr           = [logical-not-op S] (filter-query / function-expr)
filter-query        = rel-query / jsonpath-query
rel-query           = current-node-identifier segments
current-node-identifier = "@"

; Comparison (§2.3.5.2)
comparison-expr     = comparable S comparison-op S comparable
comparison-op       = "==" / "!=" / "<=" / ">=" / "<" / ">"

comparable          = literal / singular-query / function-expr

; Literals (§2.3.5.3)
literal             = number / string-literal / true / false / null
number              = (int / "-0") [ frac ] [ exp ]
int                 = "0" / ( DIGIT1 *DIGIT )
DIGIT1              = %x31-39
frac                = "." 1*DIGIT
exp                 = "e" [ "-" / "+" ] 1*DIGIT
true                = %x74.72.75.65      ; true
false               = %x66.61.6c.73.65   ; false
null                = %x6e.75.6c.6c      ; null

; Functions (§2.4)
function-expr       = function-name "(" S [function-argument
                      *(S "," S function-argument)] S ")"
function-name       = function-name-first *function-name-char
function-name-first = LCALPHA
function-name-char  = function-name-first / "_" / DIGIT
LCALPHA             = %x61-7A            ; a-z

function-argument   = literal / filter-query / function-expr / logical-expr

; Whitespace
S                   = *( %x20 / %x09 / %x0A / %x0D )
```

---

## Appendix B: Benchmark Suite

```typescript
// @jsonpath/filter-eval/benchmarks/suite.ts

import { bench, describe } from 'vitest';
import {
	compileFilter,
	FilterCache,
	parseFilter,
	FilterEvaluator,
} from '../src';

const SAMPLE_DATA = {
	store: {
		book: Array.from({ length: 1000 }, (_, i) => ({
			title: `Book ${i}`,
			price: Math.random() * 100,
			category: ['fiction', 'non-fiction', 'reference'][i % 3],
			inStock: Math.random() > 0.3,
		})),
	},
};

describe('Parsing', () => {
	bench('parse simple expression', () => {
		parseFilter('@.price < 50');
	});

	bench('parse complex expression', () => {
		parseFilter('@.price < 50 && @.inStock == true && length(@.title) > 5');
	});

	bench('parse with functions', () => {
		parseFilter('match(@.title, "Book.*") && @.price >= 10');
	});
});

describe('Compilation', () => {
	bench('compile simple expression', () => {
		compileFilter('@.price < 50');
	});

	bench('compile with cache hit', () => {
		const cache = new FilterCache();
		cache.compile('@.price < 50'); // Warm up
		return () => cache.compile('@.price < 50');
	});
});

describe('Evaluation', () => {
	const simpleFilter = compileFilter('@.price < 50');
	const complexFilter = compileFilter(
		'@.price < 50 && @.inStock == true && @.category == "fiction"',
	);
	const functionFilter = compileFilter(
		'length(@.title) > 7 && match(@.title, "Book [0-9]+")',
	);

	bench('simple filter - single item', () => {
		simpleFilter({ root: SAMPLE_DATA, current: SAMPLE_DATA.store.book[0] });
	});

	bench('complex filter - single item', () => {
		complexFilter({ root: SAMPLE_DATA, current: SAMPLE_DATA.store.book[0] });
	});

	bench('function filter - single item', () => {
		functionFilter({ root: SAMPLE_DATA, current: SAMPLE_DATA.store.book[0] });
	});

	bench('simple filter - 1000 items', () => {
		SAMPLE_DATA.store.book.filter((book) =>
			simpleFilter({ root: SAMPLE_DATA, current: book }),
		);
	});

	bench('complex filter - 1000 items', () => {
		SAMPLE_DATA.store.book.filter((book) =>
			complexFilter({ root: SAMPLE_DATA, current: book }),
		);
	});
});

describe('Memory', () => {
	bench('cache 1000 unique expressions', () => {
		const cache = new FilterCache({ maxCacheSize: 1000 });
		for (let i = 0; i < 1000; i++) {
			cache.compile(`@.price < ${i}`);
		}
	});
});
```

---

## Document History

| Version     | Date       | Author       | Changes       |
| ----------- | ---------- | ------------ | ------------- |
| 1.0.0-draft | 2026-01-05 | Lance Miller | Initial draft |

---

## References

1. [RFC 9535 - JSONPath: Query Expressions for JSON](https://datatracker.ietf.org/doc/rfc9535/)
2. [RFC 9485 - I-Regexp: Interoperable Regular Expressions](https://datatracker.ietf.org/doc/rfc9485/)
3. [jsep - JavaScript Expression Parser](https://github.com/EricSmekens/jsep)
4. [JSONPath Compliance Test Suite](https://github.com/jsonpath-standard/jsonpath-compliance-test-suite)
5. [json-p3 - RFC 9535 Implementation](https://github.com/jg-rp/json-p3)
