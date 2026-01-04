/**
 * @jsonpath/evaluator
 *
 * AST interpreter for JSONPath.
 *
 * @packageDocumentation
 */

import { JSONPathError, JSONPathTypeError } from '@jsonpath/core';
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
import { globalRegistry } from '@jsonpath/functions';
import { QueryResult, type QueryResultNode } from './query-result.js';

export class Evaluator {
	private root: any;

	constructor(root: any) {
		this.root = root;
	}

	public evaluate(ast: QueryNode): QueryResult {
		let currentNodes: QueryResultNode[] = [{ value: this.root, path: [] }];

		for (const segment of ast.segments) {
			currentNodes = this.evaluateSegment(segment, currentNodes);
		}

		return new QueryResult(currentNodes);
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
			const key = n.path.join('\0');
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
	}

	private walkDescendants(
		node: QueryResultNode,
		callback: (n: QueryResultNode) => void,
	): void {
		callback(node);
		const val = node.value;
		if (val !== null && typeof val === 'object') {
			if (Array.isArray(val)) {
				val.forEach((v, i) => {
					this.walkDescendants(
						{ value: v, path: [...node.path, String(i)] },
						callback,
					);
				});
			} else {
				Object.entries(val).forEach(([k, v]) => {
					this.walkDescendants({ value: v, path: [...node.path, k] }, callback);
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
		const val = node.value;
		if (val === null || typeof val !== 'object') return;

		switch (selector.type) {
			case NodeType.NameSelector:
				if (
					!Array.isArray(val) &&
					Object.prototype.hasOwnProperty.call(val, selector.name)
				) {
					results.push({
						value: val[selector.name],
						path: [...node.path, selector.name],
					});
				}
				break;
			case NodeType.IndexSelector:
				if (Array.isArray(val)) {
					const idx =
						selector.index < 0 ? val.length + selector.index : selector.index;
					if (idx >= 0 && idx < val.length) {
						results.push({
							value: val[idx],
							path: [...node.path, String(idx)],
						});
					}
				}
				break;
			case NodeType.WildcardSelector:
				if (Array.isArray(val)) {
					val.forEach((v, i) =>
						results.push({ value: v, path: [...node.path, String(i)] }),
					);
				} else {
					Object.entries(val).forEach(([k, v]) =>
						results.push({ value: v, path: [...node.path, k] }),
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
							results.push({ value: val[i], path: [...node.path, String(i)] });
						}
					} else {
						for (let i = start; i > end; i += step) {
							results.push({ value: val[i], path: [...node.path, String(i)] });
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
								path: [...node.path, String(i)],
							})
						) {
							results.push({ value: v, path: [...node.path, String(i)] });
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
							})
						) {
							results.push({ value: v, path: [...node.path, k] });
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
				return nodes.length > 0 ? nodes[0].value : undefined;
			}
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
		}
	}

	private evaluateSingularQuery(
		query: SingularQueryNode,
		current: QueryResultNode,
	): QueryResultNode[] {
		let nodes: QueryResultNode[] = query.root
			? [{ value: this.root, path: [] }]
			: [current];
		for (const segment of query.segments) {
			nodes = this.evaluateSegment(segment, nodes);
		}
		return nodes;
	}
}

export function evaluate(root: any, ast: QueryNode): QueryResult {
	return new Evaluator(root).evaluate(ast);
}
