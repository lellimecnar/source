/**
 * @jsonpath/evaluator
 *
 * AST interpreter for JSONPath.
 *
 * @packageDocumentation
 */

import {
	JSONPathError,
	JSONPathTypeError,
	JSONPathSyntaxError,
	JSONPathSecurityError,
	JSONPathLimitError,
	JSONPathTimeoutError,
	JSONPathFunctionError,
	type EvaluatorOptions,
	PathSegment,
} from '@jsonpath/core';
import { getFunction } from '@jsonpath/functions';
import {
	NodeType,
	type QueryNode,
	type SegmentNode,
	type SelectorNode,
	type ExpressionNode,
	type SingularQueryNode,
	type BinaryExprNode,
	type UnaryExprNode,
	type FunctionCallNode,
	type LiteralNode,
	isSingularQuery,
} from '@jsonpath/parser';

import { withDefaults } from './options.js';
import { QueryResult, type QueryResultNode } from './query-result.js';

export interface NodeList {
	readonly nodes: QueryResultNode[];
	readonly __isNodeList: true;
	readonly isSingular?: boolean;
}

class Evaluator {
	private root: any;
	private options: Required<EvaluatorOptions>;
	private startTime = 0;

	constructor(root: any, options?: EvaluatorOptions) {
		this.root = root;
		this.options = withDefaults(options);
	}

	public evaluate(ast: QueryNode): QueryResult {
		this.startTime = Date.now();
		this.checkLimits(0, 0);

		if (this.options.secure.noRecursive) {
			const hasRecursive = ast.segments.some(
				(s) => s.type === NodeType.DescendantSegment,
			);
			if (hasRecursive) {
				throw new JSONPathSecurityError('Recursive descent is disabled');
			}
		}

		if (this.options.secure.noFilters) {
			const hasFilters = ast.segments.some((s) =>
				s.selectors.some((sel) => sel.type === NodeType.FilterSelector),
			);
			if (hasFilters) {
				throw new JSONPathSecurityError('Filters are disabled');
			}
		}

		let currentNodes: QueryResultNode[] = [
			{ value: this.root, path: [], root: this.root },
		];

		for (const segment of ast.segments) {
			currentNodes = this.evaluateSegment(segment, currentNodes);
		}

		return new QueryResult(currentNodes);
	}

	private checkLimits(depth: number, resultCount: number): void {
		if (this.options.maxDepth > 0 && depth > this.options.maxDepth) {
			throw new JSONPathLimitError(
				`Maximum depth exceeded: ${this.options.maxDepth}`,
				{ code: 'MAX_DEPTH_EXCEEDED' },
			);
		}

		if (this.options.maxResults > 0 && resultCount >= this.options.maxResults) {
			throw new JSONPathLimitError(
				`Maximum results exceeded: ${this.options.maxResults}`,
				{ code: 'LIMIT_ERROR' },
			);
		}

		if (this.options.timeout > 0) {
			if (Date.now() - this.startTime > this.options.timeout) {
				throw new JSONPathTimeoutError(
					`Query timed out after ${this.options.timeout}ms`,
					{ code: 'TIMEOUT' },
				);
			}
		}
	}

	private addResult(results: QueryResultNode[], node: QueryResultNode): void {
		this.checkLimits(node.path.length, results.length);
		results.push(node);
	}

	private evaluateSegment(
		segment: SegmentNode,
		nodes: QueryResultNode[],
	): QueryResultNode[] {
		const nextNodes: QueryResultNode[] = [];
		const isDescendant = segment.type === NodeType.DescendantSegment;

		for (const node of nodes) {
			if (isDescendant) {
				this.walkDescendants(node, (n) => {
					this.applySelectors(segment.selectors, n, nextNodes);
				});
			} else {
				this.applySelectors(segment.selectors, node, nextNodes);
			}
		}

		return nextNodes;
	}

	private walkDescendants(
		node: QueryResultNode,
		callback: (n: QueryResultNode) => void,
		visited = new Set<any>(),
	): void {
		this.checkLimits(node.path.length, 0); // resultCount check is handled in evaluateSegment

		if (this.options.detectCircular) {
			if (visited.has(node.value)) {
				throw new JSONPathLimitError('Circular reference detected', {
					path: node.path.join('.'),
				});
			}
			if (node.value !== null && typeof node.value === 'object') {
				visited.add(node.value);
			}
		}

		callback(node);
		const val = node.value;
		if (val !== null && typeof val === 'object') {
			if (Array.isArray(val)) {
				val.forEach((v, i) => {
					this.walkDescendants(
						{
							value: v,
							path: [...node.path, i],
							root: node.root,
							parent: val,
							parentKey: i,
						},
						callback,
						new Set(visited),
					);
				});
			} else {
				Object.entries(val).forEach(([k, v]) => {
					this.walkDescendants(
						{
							value: v,
							path: [...node.path, k],
							root: node.root,
							parent: val,
							parentKey: k,
						},
						callback,
						new Set(visited),
					);
				});
			}
		}
	}

	private applySelectors(
		selectors: SelectorNode[],
		node: QueryResultNode,
		results: QueryResultNode[],
	): void {
		for (const selector of selectors) {
			this.evaluateSelector(selector, node, results);
		}
	}

	/**
	 * RFC 9535 Section 2.3.4: normalize(i, len)
	 */
	private normalize(i: number, len: number): number {
		return i < 0 ? Math.max(len + i, 0) : Math.min(i, len);
	}

	private evaluateSelector(
		selector: SelectorNode,
		node: QueryResultNode,
		results: QueryResultNode[],
	): void {
		const val = node.value;
		if (val === null || typeof val !== 'object') return;

		switch (selector.type) {
			case NodeType.NameSelector:
				if (
					!Array.isArray(val) &&
					Object.prototype.hasOwnProperty.call(val, selector.name)
				) {
					this.addResult(results, {
						value: val[selector.name],
						path: [...node.path, selector.name],
						root: node.root,
						parent: val,
						parentKey: selector.name,
					});
				}
				break;
			case NodeType.IndexSelector:
				if (Array.isArray(val)) {
					const idx =
						selector.index < 0 ? val.length + selector.index : selector.index;
					if (idx >= 0 && idx < val.length) {
						this.addResult(results, {
							value: val[idx],
							path: [...node.path, idx],
							root: node.root,
							parent: val,
							parentKey: idx,
						});
					}
				}
				break;
			case NodeType.WildcardSelector:
				if (Array.isArray(val)) {
					val.forEach((v, i) => {
						this.addResult(results, {
							value: v,
							path: [...node.path, i],
							root: node.root,
							parent: val,
							parentKey: i,
						});
					});
				} else {
					Object.entries(val).forEach(([k, v]) => {
						this.addResult(results, {
							value: v,
							path: [...node.path, k],
							root: node.root,
							parent: val,
							parentKey: k,
						});
					});
				}
				break;
			case NodeType.SliceSelector:
				if (Array.isArray(val)) {
					const { start, end, step: stepValue } = selector;
					const s = stepValue ?? 1;

					if (s === 0) {
						return;
					}

					const len = val.length;

					// Defaults depend on direction.
					let from = start ?? (s > 0 ? 0 : len - 1);
					let to = end ?? (s > 0 ? len : -len - 1);

					// Normalize negative indices.
					if (from < 0) from = len + from;
					if (to < 0) to = len + to;

					if (s > 0) {
						// Clamp to [0, len]
						from = Math.min(Math.max(from, 0), len);
						to = Math.min(Math.max(to, 0), len);

						for (let i = from; i < to; i += s) {
							this.addResult(results, {
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
							this.addResult(results, {
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
			case NodeType.FilterSelector:
				if (Array.isArray(val)) {
					val.forEach((v, i) => {
						const nodeContext = {
							value: v,
							path: [...node.path, i],
							root: node.root,
							parent: val,
							parentKey: i,
						};
						if (
							this.isTruthy(
								this.evaluateExpression(selector.expression, nodeContext),
							)
						) {
							this.addResult(results, nodeContext);
						}
					});
				} else {
					Object.entries(val).forEach(([k, v]) => {
						const nodeContext = {
							value: v,
							path: [...node.path, k],
							root: node.root,
							parent: val,
							parentKey: k,
						};
						if (
							this.isTruthy(
								this.evaluateExpression(selector.expression, nodeContext),
							)
						) {
							this.addResult(results, nodeContext);
						}
					});
				}
				break;
		}
	}

	private evaluateExpression(
		expr: ExpressionNode,
		current: QueryResultNode,
	): any {
		switch (expr.type) {
			case NodeType.Literal:
				return expr.value;
			case NodeType.BinaryExpr: {
				const left = this.evaluateExpression(expr.left, current);
				const right = this.evaluateExpression(expr.right, current);
				switch (expr.operator) {
					case '==':
						return {
							value: this.compare(left, right, '=='),
							__isLogicalType: true,
						};
					case '!=':
						return {
							value: !this.compare(left, right, '=='),
							__isLogicalType: true,
						};
					case '<':
						return {
							value: this.compare(left, right, '<'),
							__isLogicalType: true,
						};
					case '<=':
						return {
							value: this.compare(left, right, '<='),
							__isLogicalType: true,
						};
					case '>':
						return {
							value: this.compare(left, right, '>'),
							__isLogicalType: true,
						};
					case '>=':
						return {
							value: this.compare(left, right, '>='),
							__isLogicalType: true,
						};
					case '&&':
						return {
							value: this.isTruthy(left) && this.isTruthy(right),
							__isLogicalType: true,
						};
					case '||':
						return {
							value: this.isTruthy(left) || this.isTruthy(right),
							__isLogicalType: true,
						};
					default:
						return false;
				}
			}
			case NodeType.UnaryExpr: {
				const operand = this.evaluateExpression(expr.operand, current);
				if (expr.operator === '!') {
					return {
						value: !this.isTruthy(operand),
						__isLogicalType: true,
					};
				}
				return false;
			}
			case NodeType.Query: {
				return this.evaluateEmbeddedQuery(expr, current);
			}
			case NodeType.FunctionCall: {
				const fn = getFunction(expr.name);
				if (!fn || expr.args.length !== fn.signature.length) {
					// RFC 9535: Unknown function or wrong arg count results in "Nothing"
					return undefined;
				}
				const args = expr.args.map((a) => this.evaluateExpression(a, current));

				// RFC 9535: If any argument is "Nothing", the result is "Nothing"
				if (args.some((arg) => arg === undefined)) {
					return undefined;
				}

				try {
					// RFC 9535: Functions receive result sets for NodesType arguments.
					// For ValueType arguments, they receive the single value or "Nothing".
					const processedArgs: any[] = [];
					for (let i = 0; i < args.length; i++) {
						const arg = args[i];
						const paramType = fn.signature[i];
						const isNodeList =
							arg && typeof arg === 'object' && arg.__isNodeList === true;

						if (paramType === 'NodesType') {
							if (!isNodeList) return undefined; // Type mismatch
							processedArgs.push(arg.nodes);
						} else if (paramType === 'LogicalType') {
							processedArgs.push(this.isTruthy(arg));
						} else {
							// ValueType
							if (isNodeList) {
								if (arg.nodes.length === 1) {
									processedArgs.push(arg.nodes[0].value);
								} else {
									return undefined; // Non-singular query for ValueType
								}
							} else if (
								arg &&
								typeof arg === 'object' &&
								(arg.__isFunctionResult || arg.__isLogicalType)
							) {
								processedArgs.push(arg.value);
							} else {
								processedArgs.push(arg);
							}
						}
					}

					const result = fn.evaluate(...processedArgs);
					if (result === undefined) return undefined;

					if (fn.returns === 'LogicalType') {
						return { value: result, __isLogicalType: true };
					}
					return { value: result, __isFunctionResult: true };
				} catch (err) {
					// RFC 9535: Errors in function evaluation result in "Nothing"
					return undefined;
				}
			}
			default:
				return undefined;
		}
	}

	private isTruthy(val: any): boolean {
		if (val === undefined) return false; // "Nothing" is falsy
		if (val && typeof val === 'object') {
			if (val.__isLogicalType === true) {
				return Boolean(val.value);
			}
			if (val.__isNodeList === true) {
				// RFC 9535: A result set is truthy if it is not empty.
				return val.nodes.length > 0;
			}
		}
		// RFC 9535: Literals and ValueType results (from functions) are not truthy
		// on their own in a filter context. They must be compared.
		return false;
	}

	private compare(left: any, right: any, operator: string): boolean {
		// RFC 9535 Section 2.4.4.1:
		// A comparison is valid if both sides are comparable.
		// A value is comparable if it is a literal or a singular query.
		// If a query is not singular, it is not comparable.
		// If a comparison is not valid, the result is false.
		const isComparable = (val: any) => {
			if (val && typeof val === 'object') {
				if (val.__isNodeList === true) {
					return val.isSingular === true;
				}
				// Function results (ValueType) are comparable
				if (val.__isFunctionResult === true) {
					return true;
				}
				// LogicalType results are NOT comparable
				if (val.__isLogicalType === true) {
					return false;
				}
			}
			return true; // Literals are comparable
		};

		if (!isComparable(left) || !isComparable(right)) {
			return false;
		}

		// RFC 9535: If a comparison operand is a query, it is evaluated as a result set.
		// If the result set contains exactly one node, its value is used.
		// Otherwise, the operand is "Nothing".
		const unwrap = (val: any) => {
			if (val && typeof val === 'object') {
				if (val.__isNodeList === true) {
					return val.nodes.length === 1 ? val.nodes[0].value : undefined;
				}
				if (val.__isLogicalType === true || val.__isFunctionResult === true) {
					return val.value;
				}
			}
			return val;
		};

		const leftVal = unwrap(left);
		const rightVal = unwrap(right);

		// RFC 9535 Section 2.4.4.1:
		// If both operands are Nothing, the result of the comparison is true for ==, <=, and >=;
		// it is false for !=, <, and >.
		if (leftVal === undefined && rightVal === undefined) {
			return operator === '==' || operator === '<=' || operator === '>=';
		}

		// If one operand is Nothing and the other is a value (ValueType),
		// the result of the comparison is false for ==, <, <=, >, and >=; it is true for !=.
		if (leftVal === undefined || rightVal === undefined) {
			return operator === '!=';
		}

		if (operator === '==') {
			return this.deepEqual(leftVal, rightVal);
		}
		if (operator === '!=') {
			return !this.deepEqual(leftVal, rightVal);
		}

		// RFC 9535: Comparison operators <, <=, >, >= are only defined for
		// numbers and strings of the same type.
		if (typeof leftVal === 'number' && typeof rightVal === 'number') {
			switch (operator) {
				case '<':
					return leftVal < rightVal;
				case '<=':
					return leftVal <= rightVal;
				case '>':
					return leftVal > rightVal;
				case '>=':
					return leftVal >= rightVal;
			}
		}

		if (typeof leftVal === 'string' && typeof rightVal === 'string') {
			switch (operator) {
				case '<':
					return leftVal < rightVal;
				case '<=':
					return leftVal <= rightVal;
				case '>':
					return leftVal > rightVal;
				case '>=':
					return leftVal >= rightVal;
			}
		}

		// CTS compatibility: Some tests expect <= and >= to work for equal values of other types (null, bool)
		if (this.deepEqual(leftVal, rightVal)) {
			if (operator === '<=' || operator === '>=') return true;
		}

		return false;
	}

	private deepEqual(a: any, b: any): boolean {
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
				if (!this.deepEqual(a[i], b[i])) return false;
			}
			return true;
		}

		if (Array.isArray(b)) return false;

		const keysA = Object.keys(a);
		const keysB = Object.keys(b);
		if (keysA.length !== keysB.length) return false;

		for (const key of keysA) {
			if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
			if (!this.deepEqual(a[key], b[key])) return false;
		}

		return true;
	}

	private evaluateEmbeddedQuery(
		query: QueryNode,
		current: QueryResultNode,
	): NodeList {
		let nodes: QueryResultNode[] = query.root
			? [{ value: this.root, path: [], root: this.root }]
			: [current];
		for (const segment of query.segments) {
			nodes = this.evaluateSegment(segment, nodes);
		}
		return {
			nodes,
			__isNodeList: true,
			isSingular: isSingularQuery(query),
		};
	}
}

export function evaluate(
	root: any,
	ast: QueryNode,
	options?: EvaluatorOptions,
): QueryResult {
	return new Evaluator(root, options).evaluate(ast);
}
