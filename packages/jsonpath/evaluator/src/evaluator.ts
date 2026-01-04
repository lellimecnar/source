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
	type EvaluatorOptions,
} from '@jsonpath/core';
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
} from '@jsonpath/parser';
import '@jsonpath/functions';
import { getFunction } from '@jsonpath/core';
import { QueryResult, type QueryResultNode } from './query-result.js';
import type { PathSegment } from '@jsonpath/core';
import { withDefaults } from './options.js';

export class Evaluator {
	private root: any;
	private options: Required<EvaluatorOptions>;
	private startTime: number = 0;

	constructor(root: any, options?: EvaluatorOptions) {
		this.root = root;
		this.options = withDefaults(options);
	}

	public evaluate(ast: QueryNode): QueryResult {
		this.startTime = Date.now();

		if (this.options.noRecursive) {
			const hasRecursive = ast.segments.some(
				(s) => s.type === NodeType.DescendantSegment,
			);
			if (hasRecursive) {
				throw new JSONPathError(
					'Recursive descent is disabled',
					'SECURITY_ERROR',
				);
			}
		}

		if (this.options.noFilters) {
			const hasFilters = ast.segments.some((s) =>
				s.selectors.some((sel) => sel.type === NodeType.FilterSelector),
			);
			if (hasFilters) {
				throw new JSONPathError('Filters are disabled', 'SECURITY_ERROR');
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
			throw new JSONPathError(
				`Maximum depth exceeded: ${this.options.maxDepth}`,
				'LIMIT_ERROR',
			);
		}

		if (this.options.maxResults > 0 && resultCount >= this.options.maxResults) {
			throw new JSONPathError(
				`Maximum results exceeded: ${this.options.maxResults}`,
				'LIMIT_ERROR',
			);
		}

		if (this.options.timeout > 0) {
			if (Date.now() - this.startTime > this.options.timeout) {
				throw new JSONPathError(
					`Query timed out after ${this.options.timeout}ms`,
					'TIMEOUT_ERROR',
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

		// Deduplicate nodes by path
		const seen = new Set<string>();
		return nextNodes.filter((n) => {
			const key = n.path.map(String).join('\0');
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
	}

	private walkDescendants(
		node: QueryResultNode,
		callback: (n: QueryResultNode) => void,
		visited: Set<any> = new Set(),
	): void {
		this.checkLimits(node.path.length, 0); // resultCount check is handled in evaluateSegment

		if (this.options.detectCircular) {
			if (visited.has(node.value)) {
				throw new JSONPathError('Circular reference detected', 'LIMIT_ERROR');
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

	private evaluateSelector(
		selector: SelectorNode,
		node: QueryResultNode,
		results: QueryResultNode[],
	): void {
		const val = node.value as any;
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
					val.forEach((v, i) =>
						this.addResult(results, {
							value: v,
							path: [...node.path, i],
							root: node.root,
							parent: val,
							parentKey: i,
						}),
					);
				} else {
					Object.entries(val).forEach(([k, v]) =>
						this.addResult(results, {
							value: v,
							path: [...node.path, k],
							root: node.root,
							parent: val,
							parentKey: k,
						}),
					);
				}
				break;
			case NodeType.SliceSelector:
				if (Array.isArray(val)) {
					const { startValue, endValue, stepValue } = selector;
					const step = stepValue ?? 1;
					if (step === 0) return;

					const len = val.length;
					let start = startValue ?? (step > 0 ? 0 : len - 1);
					let end = endValue ?? (step > 0 ? len : -len - 1);

					start = start < 0 ? Math.max(0, len + start) : Math.min(len, start);
					end = end < 0 ? Math.max(-1, len + end) : Math.min(len, end);

					if (step > 0) {
						for (let i = start; i < end; i += step) {
							this.addResult(results, {
								value: val[i],
								path: [...node.path, i],
								root: node.root,
								parent: val,
								parentKey: i,
							});
						}
					} else {
						for (let i = start; i > end; i += step) {
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
						if (
							this.evaluateExpression(selector.expression, {
								value: v,
								path: [...node.path, i],
								root: node.root,
								parent: val,
								parentKey: i,
							})
						) {
							this.addResult(results, {
								value: v,
								path: [...node.path, i],
								root: node.root,
								parent: val,
								parentKey: i,
							});
						}
					});
				} else {
					// RFC 9535: Filter on object applies to the object itself if it matches?
					// Actually, it applies to the values of the object.
					Object.entries(val).forEach(([k, v]) => {
						if (
							this.evaluateExpression(selector.expression, {
								value: v,
								path: [...node.path, k],
								root: node.root,
								parent: val,
								parentKey: k,
							})
						) {
							this.addResult(results, {
								value: v,
								path: [...node.path, k],
								root: node.root,
								parent: val,
								parentKey: k,
							});
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
				return (expr as LiteralNode).value;
			case NodeType.BinaryExpr: {
				const left = this.evaluateExpression(expr.left, current);
				const right = this.evaluateExpression(expr.right, current);
				switch (expr.operator) {
					case '==':
						return left === right;
					case '!=':
						return left !== right;
					case '<':
						return left < right;
					case '<=':
						return left <= right;
					case '>':
						return left > right;
					case '>=':
						return left >= right;
					case '&&':
						return left && right;
					case '||':
						return left || right;
					default:
						return false;
				}
			}
			case NodeType.UnaryExpr: {
				const operand = this.evaluateExpression(expr.operand, current);
				if (expr.operator === '!') return !operand;
				return false;
			}
			case NodeType.SingularQuery: {
				const nodes = this.evaluateSingularQuery(expr, current);
				return nodes[0]?.value;
			}
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
		}
	}

	private evaluateSingularQuery(
		query: SingularQueryNode,
		current: QueryResultNode,
	): QueryResultNode[] {
		let nodes: QueryResultNode[] = query.root
			? [{ value: this.root, path: [], root: this.root }]
			: [current];
		for (const segment of query.segments) {
			nodes = this.evaluateSegment(segment, nodes);
		}
		return nodes;
	}
}

export function evaluate(
	root: any,
	ast: QueryNode,
	options?: EvaluatorOptions,
): QueryResult {
	return new Evaluator(root, options).evaluate(ast);
}
