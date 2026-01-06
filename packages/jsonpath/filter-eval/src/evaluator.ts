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
								default:
									return Nothing;
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
