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
	Nothing,
	isNothing,
	operatorRegistry,
	type EvaluatorOptions,
	type Path,
	type PathSegment,
	PluginManager,
} from '@jsonpath/core';
import { getFunction } from '@jsonpath/functions';
import {
	NodeType,
	type QueryNode,
	type SegmentNode,
	type SelectorNode,
	type ExpressionNode,
	type BinaryExprNode,
	type UnaryExprNode,
	type FunctionCallNode,
	type LiteralNode,
	isSingularQuery,
} from '@jsonpath/parser';

import { withDefaults } from './options.js';
import { QueryResultPool } from './query-result-pool.js';
import {
	QueryResult,
	type QueryResultNode,
	pointerStringForNode,
} from './query-result.js';

export interface NodeList {
	readonly nodes: QueryResultNode[];
	readonly __isNodeList: true;
	readonly isSingular?: boolean;
}

export class Evaluator {
	private root: any;
	private options: Required<EvaluatorOptions>;
	private startTime = 0;
	private nodesVisited = 0;
	private resultsFound = 0;
	private currentFilterDepth = 0;
	private readonly pool = new QueryResultPool();
	private readonly isNodeAllowed: (node: QueryResultNode) => boolean;

	constructor(root: any, options?: EvaluatorOptions) {
		this.root = root;
		this.options = withDefaults(options);

		const { allowPaths, blockPaths } = this.options.secure;
		if (!allowPaths?.length && !blockPaths?.length) {
			this.isNodeAllowed = () => true;
		} else {
			this.isNodeAllowed = (node) => this.checkPathRestrictions(node);
		}
	}

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
		let parent: any;
		let parentKey: any;
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
					current = current[sel.name];
					path.push(sel.name);
					continue;
				}
				return new QueryResult([]);
			}

			// Index
			if (sel.type !== NodeType.IndexSelector) {
				return new QueryResult([]);
			}
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

	public *stream(ast: QueryNode): Generator<QueryResultNode> {
		this.pool.reset();
		this.startTime = Date.now();
		this.nodesVisited = 0;
		this.resultsFound = 0;
		this.currentFilterDepth = 0;
		this.checkLimits(0);

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

		let currentNodes: Iterable<QueryResultNode> = [
			this.pool.acquire({
				value: this.root,
				root: this.root,
			}),
		];

		for (const segment of ast.segments) {
			currentNodes = this.streamSegment(segment, currentNodes);
		}

		for (const node of currentNodes) {
			if (
				this.options.maxResults > 0 &&
				this.resultsFound >= this.options.maxResults
			) {
				throw new JSONPathLimitError(
					`Maximum results exceeded: ${this.options.maxResults}`,
					{ code: 'LIMIT_ERROR' },
				);
			}
			if (
				this.options.limit !== undefined &&
				this.options.limit > 0 &&
				this.resultsFound >= this.options.limit
			) {
				return;
			}
			yield node;
			this.resultsFound++;
		}
	}

	private *streamSegment(
		segment: SegmentNode,
		nodes: Iterable<QueryResultNode>,
	): Generator<QueryResultNode> {
		const isDescendant = segment.type === NodeType.DescendantSegment;

		for (const node of nodes) {
			if (isDescendant) {
				yield* this.streamDescendants(segment, node);
			} else {
				yield* this.streamSelectors(segment.selectors, node);
			}
		}
	}

	private *streamDescendants(
		segment: SegmentNode,
		node: QueryResultNode,
		visited?: Set<any>,
	): Generator<QueryResultNode> {
		if (!this.isNodeAllowed(node)) {
			return;
		}
		this.checkLimits(node._depth ?? 0, this.resultsFound);

		if (this.options.detectCircular) {
			// Initialize visited set only on first call
			if (!visited) {
				visited = new Set();
			}
			if (visited.has(node.value)) {
				throw new JSONPathLimitError('Circular reference detected', {
					path: node.path.join('.'),
				});
			}
			if (node.value !== null && typeof node.value === 'object') {
				visited.add(node.value);
			}
		}

		yield* this.streamSelectors(segment.selectors, node);

		const val = node.value;
		if (val !== null && typeof val === 'object') {
			if (Array.isArray(val)) {
				for (let i = 0; i < val.length; i++) {
					yield* this.streamDescendants(
						segment,
						this.pool.acquire({
							value: val[i],
							root: node.root,
							parent: val,
							parentKey: i,
							pathParent: node,
							pathSegment: i,
						}),
						visited,
					);
				}
			} else {
				for (const k of Object.keys(val)) {
					yield* this.streamDescendants(
						segment,
						this.pool.acquire({
							value: (val as any)[k],
							root: node.root,
							parent: val,
							parentKey: k,
							pathParent: node,
							pathSegment: k,
						}),
						visited,
					);
				}
			}
		}
	}

	private *streamSelectors(
		selectors: SelectorNode[],
		node: QueryResultNode,
	): Generator<QueryResultNode> {
		for (const selector of selectors) {
			yield* this.streamSelector(selector, node);
		}
	}

	private *streamSelector(
		selector: SelectorNode,
		node: QueryResultNode,
	): Generator<QueryResultNode> {
		const val = node.value;

		switch (selector.type) {
			case NodeType.NameSelector:
				if (val !== null && typeof val === 'object') {
					if (
						!Array.isArray(val) &&
						Object.prototype.hasOwnProperty.call(val, selector.name)
					) {
						const result = this.pool.acquire({
							value: (val as any)[selector.name],
							root: node.root,
							parent: val,
							parentKey: selector.name,
							pathParent: node,
							pathSegment: selector.name,
						});
						if (this.isNodeAllowed(result)) {
							this.checkLimits(result._depth ?? 0);
							yield result;
						}
					}
				}
				break;
			case NodeType.IndexSelector:
				if (val !== null && typeof val === 'object') {
					if (Array.isArray(val)) {
						const idx =
							selector.index < 0 ? val.length + selector.index : selector.index;
						if (idx >= 0 && idx < val.length) {
							const result = this.pool.acquire({
								value: val[idx],
								root: node.root,
								parent: val,
								parentKey: idx,
								pathParent: node,
								pathSegment: idx,
							});
							if (this.isNodeAllowed(result)) {
								this.checkLimits(result._depth ?? 0);
								yield result;
							}
						}
					}
				}
				break;
			case NodeType.ParentSelector:
				if (node.path.length > 0) {
					const parentPath = node.path.slice(0, -1);
					let parentValue: any;
					let grandParent: any;
					let parentKey: any;

					if (parentPath.length === 0) {
						parentValue = node.root;
					} else {
						parentValue = node.root;
						for (let i = 0; i < parentPath.length; i++) {
							grandParent = parentValue;
							parentKey = parentPath[i];
							parentValue = parentValue[parentKey];
						}
					}

					const result = this.pool.acquire({
						value: parentValue,
						root: node.root,
						parent: grandParent,
						parentKey,
					});
					// Pre-cache the parent path since it's computed and doesn't have lazy chain
					result._cachedPath = parentPath;
					result._depth = parentPath.length;

					if (this.isNodeAllowed(result)) {
						this.checkLimits(result._depth ?? 0, this.resultsFound);
						this.resultsFound++;
						yield result;
					}
				}
				break;
			case NodeType.PropertySelector:
				if (node.parentKey !== undefined) {
					const result = this.pool.acquire({
						value: node.parentKey,
						root: node.root,
						parent: node.parent,
						parentKey: node.parentKey,
					});
					// Pre-cache the path since it's the same as the parent node
					result._cachedPath = [...node.path];
					result._depth = node._depth;

					if (this.isNodeAllowed(result)) {
						this.checkLimits(result._depth ?? 0, this.resultsFound);
						this.resultsFound++;
						yield result;
					}
				}
				break;
			case NodeType.WildcardSelector:
				if (val !== null && typeof val === 'object') {
					if (Array.isArray(val)) {
						for (let i = 0; i < val.length; i++) {
							const result = this.pool.acquire({
								value: val[i],
								root: node.root,
								parent: val,
								parentKey: i,
								pathParent: node,
								pathSegment: i,
							});
							if (this.isNodeAllowed(result)) {
								this.checkLimits(result._depth ?? 0);
								yield result;
							}
						}
					} else {
						for (const k of Object.keys(val)) {
							const result = this.pool.acquire({
								value: (val as any)[k],
								root: node.root,
								parent: val,
								parentKey: k,
								pathParent: node,
								pathSegment: k,
							});
							if (this.isNodeAllowed(result)) {
								this.checkLimits(result._depth ?? 0);
								yield result;
							}
						}
					}
				}
				break;
			case NodeType.SliceSelector:
				if (val !== null && typeof val === 'object') {
					if (Array.isArray(val)) {
						const { start, end, step: stepValue } = selector;
						const s = stepValue ?? 1;
						if (s === 0) return;

						const len = val.length;
						let from = start ?? (s > 0 ? 0 : len - 1);
						let to = end ?? (s > 0 ? len : -len - 1);

						if (from < 0) from = len + from;
						if (to < 0) to = len + to;

						if (s > 0) {
							from = Math.min(Math.max(from, 0), len);
							to = Math.min(Math.max(to, 0), len);
							for (let i = from; i < to; i += s) {
								const result = this.pool.acquire({
									value: val[i],
									root: node.root,
									parent: val,
									parentKey: i,
									pathParent: node,
									pathSegment: i,
								});
								if (this.isNodeAllowed(result)) {
									this.checkLimits(result._depth ?? 0);
									yield result;
								}
							}
						} else {
							from = Math.min(Math.max(from, -1), len - 1);
							to = Math.min(Math.max(to, -1), len - 1);
							for (let i = from; i > to; i += s) {
								const result = this.pool.acquire({
									value: val[i],
									root: node.root,
									parent: val,
									parentKey: i,
									pathParent: node,
									pathSegment: i,
								});
								if (this.isNodeAllowed(result)) {
									this.checkLimits(result._depth ?? 0);
									yield result;
								}
							}
						}
					}
				}
				break;
			case NodeType.FilterSelector:
				if (val !== null && typeof val === 'object') {
					if (Array.isArray(val)) {
						for (let i = 0; i < val.length; i++) {
							const item = this.pool.acquire({
								value: val[i],
								root: node.root,
								parent: val,
								parentKey: i,
								pathParent: node,
								pathSegment: i,
							});
							if (this.evaluateFilter(selector.expression, item)) {
								if (this.isNodeAllowed(item)) {
									this.checkLimits(item._depth ?? 0);
									yield item;
								}
							}
						}
					} else {
						for (const k of Object.keys(val)) {
							const item = this.pool.acquire({
								value: (val as any)[k],
								root: node.root,
								parent: val,
								parentKey: k,
								pathParent: node,
								pathSegment: k,
							});
							if (this.evaluateFilter(selector.expression, item)) {
								if (this.isNodeAllowed(item)) {
									this.checkLimits(item._depth ?? 0);
									yield item;
								}
							}
						}
					}
				}
				break;
		}
	}

	private checkLimits(depth: number, resultsFound?: number): void {
		this.nodesVisited++;

		if (this.options.signal.aborted) {
			throw new JSONPathTimeoutError('Evaluation aborted by signal', {
				code: 'TIMEOUT',
			});
		}

		if (
			this.options.maxNodes > 0 &&
			this.nodesVisited > this.options.maxNodes
		) {
			throw new JSONPathLimitError(
				`Maximum nodes visited exceeded: ${this.options.maxNodes}`,
				{ code: 'MAX_NODES_EXCEEDED' },
			);
		}

		if (this.options.maxDepth > 0 && depth > this.options.maxDepth) {
			throw new JSONPathLimitError(
				`Maximum depth exceeded: ${this.options.maxDepth}`,
				{ code: 'MAX_DEPTH_EXCEEDED' },
			);
		}

		if (
			resultsFound !== undefined &&
			this.options.maxResults > 0 &&
			resultsFound >= this.options.maxResults
		) {
			throw new JSONPathLimitError(
				`Maximum results exceeded: ${this.options.maxResults}`,
				{ code: 'MAX_RESULTS_EXCEEDED' },
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

	private checkPathRestrictions(node: QueryResultNode): boolean {
		// Avoid node.path here.
		const pointer = this.pointerStringForNode(node);

		if (this.options.secure.blockPaths?.length) {
			for (const blocked of this.options.secure.blockPaths) {
				if (pointer === blocked || pointer.startsWith(`${blocked}/`))
					return false;
			}
		}

		if (this.options.secure.allowPaths?.length) {
			for (const allowed of this.options.secure.allowPaths) {
				if (
					pointer === allowed ||
					pointer.startsWith(`${allowed}/`) ||
					(allowed.startsWith(pointer) &&
						(pointer === '/' || allowed[pointer.length] === '/'))
				) {
					return true;
				}
			}
			return false;
		}

		return true;
	}

	private pointerStringForNode(node: QueryResultNode): string {
		if (node._cachedPointer) return node._cachedPointer;

		// Root path
		if (node._pathSegment === undefined) {
			node._cachedPointer = '/';
			return '/';
		}

		const segments: PathSegment[] = [];
		let curr: QueryResultNode | undefined = node;
		while (curr?._pathSegment !== undefined) {
			segments.push(curr._pathSegment);
			curr = curr._pathParent;
		}

		let out = '';
		for (let i = segments.length - 1; i >= 0; i--) {
			const s = String(segments[i]).replace(/~/g, '~0').replace(/\//g, '~1');
			out += `/${s}`;
		}

		node._cachedPointer = out;
		return out;
	}

	private evaluateFilter(
		expr: ExpressionNode,
		current: QueryResultNode,
	): boolean {
		return this.isTruthy(this.evaluateExpression(expr, current));
	}

	private evaluateExpression(
		expr: ExpressionNode,
		current: QueryResultNode,
	): any {
		this.currentFilterDepth++;
		if (
			this.options.maxFilterDepth > 0 &&
			this.currentFilterDepth > this.options.maxFilterDepth
		) {
			throw new JSONPathLimitError(
				`Maximum filter depth exceeded: ${this.options.maxFilterDepth}`,
			);
		}

		try {
			switch (expr.type) {
				case NodeType.Literal:
					return expr.value;
				case NodeType.ArrayLiteral:
					return expr.elements.map((el) =>
						this.unwrap(this.evaluateExpression(el, current)),
					);
				case NodeType.ObjectLiteral: {
					const obj: Record<string, any> = {};
					for (const [key, valNode] of Object.entries(expr.properties)) {
						obj[key] = this.unwrap(this.evaluateExpression(valNode, current));
					}
					return obj;
				}
				case NodeType.BinaryExpr: {
					const left = this.evaluateExpression(expr.left, current);
					const right = this.evaluateExpression(expr.right, current);

					const op = operatorRegistry.get(expr.operator);
					if (op) {
						return op.evaluate(this.unwrap(left), this.unwrap(right));
					}

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
					if (expr.operator === '-') {
						const val = this.unwrap(operand);
						if (typeof val === 'number') return -val;
						return Nothing;
					}
					return false;
				}
				case NodeType.Query: {
					return this.evaluateEmbeddedQuery(expr, current);
				}
				case NodeType.FunctionCall: {
					const fn = expr.resolvedFn ?? getFunction(expr.name);
					if (!fn || expr.args.length !== fn.signature.length) {
						// RFC 9535: Unknown function or wrong arg count results in "Nothing"
						return Nothing;
					}
					const args = expr.args.map((a) =>
						this.evaluateExpression(a, current),
					);

					// RFC 9535: If any argument is "Nothing", the result is "Nothing"
					if (args.some((arg) => isNothing(arg))) {
						return Nothing;
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
								if (!isNodeList) return Nothing; // Type mismatch
								processedArgs.push(arg.nodes);
							} else if (paramType === 'LogicalType') {
								processedArgs.push(this.isTruthy(arg));
							} else {
								// ValueType
								if (isNodeList) {
									if (arg.nodes.length === 1) {
										processedArgs.push(arg.nodes[0].value);
									} else {
										return Nothing; // Non-singular query for ValueType
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
						if (result === undefined) return Nothing;

						if (fn.returns === 'LogicalType') {
							return { value: result, __isLogicalType: true };
						}
						return { value: result, __isFunctionResult: true };
					} catch (err) {
						// RFC 9535: Errors in function evaluation result in "Nothing"
						return Nothing;
					}
				}
				default:
					return Nothing;
			}
		} finally {
			this.currentFilterDepth--;
		}
	}

	private isTruthy(val: any): boolean {
		if (isNothing(val)) return false;
		if (val && typeof val === 'object') {
			if (val.__isLogicalType === true) {
				return Boolean(val.value);
			}
			if (val.__isNodeList === true) {
				// RFC 9535: A result set is truthy if it is not empty.
				return val.nodes.length > 0;
			}
			if (val.__isFunctionResult === true) {
				return this.isTruthy(val.value);
			}
		}
		// RFC 9535: A value is truthy if it is not false, null, or an empty NodeList.
		return val !== false && val !== null;
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
		const leftVal = this.unwrap(left);
		const rightVal = this.unwrap(right);

		// RFC 9535 Section 2.4.4.1:
		// If both operands are Nothing, the result of the comparison is true for ==, <=, and >=;
		// it is false for !=, <, and >.
		if (isNothing(leftVal) && isNothing(rightVal)) {
			return operator === '==' || operator === '<=' || operator === '>=';
		}

		// If one operand is Nothing and the other is a value (ValueType),
		// the result of the comparison is false for ==, <, <=, >, and >=; it is true for !=.
		if (isNothing(leftVal) || isNothing(rightVal)) {
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
		let nodes: Iterable<QueryResultNode> = query.root
			? [
					this.pool.acquire({
						value: this.root,
						root: this.root,
					}),
				]
			: [current];

		for (const segment of query.segments) {
			nodes = Array.from(this.streamSegment(segment, nodes));
		}

		return {
			nodes: Array.from(nodes),
			__isNodeList: true,
			isSingular: isSingularQuery(query),
		};
	}

	private unwrap(val: any): any {
		if (val && typeof val === 'object') {
			if (val.__isNodeList === true) {
				return val.nodes.length === 1 ? val.nodes[0].value : Nothing;
			}
			if (val.__isLogicalType === true || val.__isFunctionResult === true) {
				return val.value;
			}
		}
		return val;
	}
}

export function evaluate(
	root: any,
	ast: QueryNode,
	options?: EvaluatorOptions,
): QueryResult {
	const plugins = PluginManager.from(options);
	plugins.beforeEvaluate({ root, query: ast, options });
	try {
		const result = new Evaluator(root, options).evaluate(ast);
		plugins.afterEvaluate({ result });
		return result;
	} catch (error) {
		plugins.onError({ error });
		throw error;
	}
}

/**
 * Executes a JSONPath query and returns a generator of results.
 *
 * @param root - The root object to query.
 * @param ast - The parsed query AST.
 * @param options - Evaluator options.
 * @returns A generator of query result nodes.
 */
export function* stream(
	root: any,
	ast: QueryNode,
	options?: EvaluatorOptions,
): Generator<QueryResultNode> {
	const plugins = PluginManager.from(options);
	plugins.beforeEvaluate({ root, query: ast, options });
	try {
		const evaluator = new Evaluator(root, options);
		yield* evaluator.stream(ast);
	} catch (error) {
		plugins.onError({ error });
		throw error;
	}
}
