import { SelectorKinds, FilterExprKinds } from '@jsonpath/ast';
import type { JsonPathPlugin, EvalContext } from '@jsonpath/core';
import { compile } from '@jsonpath/plugin-iregexp';

// Sentinel value for "Nothing" (empty nodelist or absent embedded query result)
const Nothing = Symbol('Nothing');
type Nothing = typeof Nothing;

const compiledPatternCache = new Map<string, ReturnType<typeof compile>>();

function getCompiled(pattern: string) {
	if (compiledPatternCache.has(pattern))
		return compiledPatternCache.get(pattern);
	const c = compile(pattern);
	compiledPatternCache.set(pattern, c);
	return c;
}

function isNothing(v: any): v is Nothing {
	return v === Nothing;
}

function unicodeScalarLength(value: string): number {
	let n = 0;
	for (const _ of value) n++;
	return n;
}

function evalValueExpr(
	expr: any,
	currentNode: any,
	ctx: EvalContext,
	evaluators: any,
): any | Nothing {
	switch (expr.kind) {
		case FilterExprKinds.Literal:
			return expr.value;

		case FilterExprKinds.EmbeddedQuery: {
			// In ValueType contexts, embedded queries must behave like singular queries.
			const results = evalEmbeddedQuery(expr, currentNode, ctx, evaluators);
			if (results.length === 1) return results[0].value;
			return Nothing;
		}

		case FilterExprKinds.FunctionCall:
			return evalFunctionCall(expr, currentNode, ctx, evaluators);

		default:
			return Nothing;
	}
}

function evalNodesExpr(
	expr: any,
	currentNode: any,
	ctx: EvalContext,
	evaluators: any,
): any[] {
	if (expr.kind !== FilterExprKinds.EmbeddedQuery) return [];
	return evalEmbeddedQuery(expr, currentNode, ctx, evaluators);
}

function evalFunctionCall(
	call: any,
	currentNode: any,
	ctx: EvalContext,
	evaluators: any,
): any | Nothing {
	switch (call.name) {
		case 'length': {
			const v = evalValueExpr(call.args[0], currentNode, ctx, evaluators);
			if (isNothing(v)) return Nothing;
			if (typeof v === 'string') return unicodeScalarLength(v);
			if (Array.isArray(v)) return v.length;
			if (typeof v === 'object' && v !== null) return Object.keys(v).length;
			return Nothing;
		}

		case 'count': {
			const nodes = evalNodesExpr(call.args[0], currentNode, ctx, evaluators);
			return nodes.length;
		}

		case 'match': {
			const value = evalValueExpr(call.args[0], currentNode, ctx, evaluators);
			const pattern = evalValueExpr(call.args[1], currentNode, ctx, evaluators);
			if (typeof value !== 'string' || typeof pattern !== 'string')
				return false;
			const c = getCompiled(pattern);
			if (!c) return false;
			return c.full.test(value);
		}

		case 'search': {
			const value = evalValueExpr(call.args[0], currentNode, ctx, evaluators);
			const pattern = evalValueExpr(call.args[1], currentNode, ctx, evaluators);
			if (typeof value !== 'string' || typeof pattern !== 'string')
				return false;
			const c = getCompiled(pattern);
			if (!c) return false;
			return c.partial.test(value);
		}

		case 'value': {
			const nodes = evalNodesExpr(call.args[0], currentNode, ctx, evaluators);
			if (nodes.length === 1) return nodes[0].value;
			return Nothing;
		}

		default:
			return Nothing;
	}
}

function evalFilterExpr(
	expr: any,
	currentNode: any,
	ctx: EvalContext,
	evaluators: any,
): boolean | Nothing {
	switch (expr.kind) {
		case FilterExprKinds.Literal:
			return expr.value;

		case FilterExprKinds.Not:
			const innerVal = evalFilterExpr(expr.expr, currentNode, ctx, evaluators);
			if (isNothing(innerVal)) return Nothing;
			return !innerVal;

		case FilterExprKinds.And:
			const leftAnd = evalFilterExpr(expr.left, currentNode, ctx, evaluators);
			if (isNothing(leftAnd)) return Nothing;
			if (!leftAnd) return false;
			const rightAnd = evalFilterExpr(expr.right, currentNode, ctx, evaluators);
			if (isNothing(rightAnd)) return Nothing;
			return rightAnd;

		case FilterExprKinds.Or:
			const leftOr = evalFilterExpr(expr.left, currentNode, ctx, evaluators);
			if (isNothing(leftOr)) return Nothing;
			if (leftOr) return true;
			const rightOr = evalFilterExpr(expr.right, currentNode, ctx, evaluators);
			if (isNothing(rightOr)) return Nothing;
			return rightOr;

		case FilterExprKinds.Compare:
			const leftCmp = evalComparable(expr.left, currentNode, ctx, evaluators);
			const rightCmp = evalComparable(expr.right, currentNode, ctx, evaluators);
			return compareValues(expr.operator, leftCmp, rightCmp);

		case FilterExprKinds.EmbeddedQuery:
			// Embedded query used directly as filter expression (existence test)
			const result = evalEmbeddedQuery(expr, currentNode, ctx, evaluators);
			return result.length > 0;

		case FilterExprKinds.FunctionCall:
			return evalFunctionCall(expr, currentNode, ctx, evaluators);

		default:
			return Nothing;
	}
}

function evalComparable(
	expr: any,
	currentNode: any,
	ctx: EvalContext,
	evaluators: any,
): any | Nothing {
	switch (expr.kind) {
		case FilterExprKinds.Literal:
			return expr.value;

		case FilterExprKinds.EmbeddedQuery:
			// Singular embedded query in comparison
			const results = evalEmbeddedQuery(expr, currentNode, ctx, evaluators);
			if (results.length === 1) {
				return results[0].value;
			}
			// Empty or multiple results = Nothing
			return Nothing;

		case FilterExprKinds.FunctionCall:
			return evalFunctionCall(expr, currentNode, ctx, evaluators);

		default:
			return Nothing;
	}
}

function evalEmbeddedQuery(
	query: any,
	currentNode: any,
	ctx: EvalContext,
	evaluators: any,
): any[] {
	const rootNode = query.scope === 'root' ? ctx.root : currentNode;
	let nodes = [rootNode];

	for (const seg of query.segments) {
		const evalSegment = evaluators.getSegment(seg.kind);
		if (evalSegment) {
			nodes = [...evalSegment(nodes, seg, evaluators, ctx)];
			continue;
		}

		const selectors = seg.selectors;
		if (!Array.isArray(selectors)) {
			continue;
		}

		const next: any[] = [];
		for (const inputNode of nodes) {
			for (const selector of selectors) {
				const evalSelector = evaluators.getSelector(selector.kind);
				if (!evalSelector) {
					continue;
				}
				next.push(...evalSelector(inputNode, selector, ctx));
			}
		}
		nodes = next;
	}

	return nodes;
}

function compareValues(operator: string, left: any, right: any): boolean {
	// Nothing == Nothing → true
	if (isNothing(left) && isNothing(right)) {
		return operator === '==';
	}

	// Nothing == value → false (or true for !=)
	if (isNothing(left) || isNothing(right)) {
		return operator === '!=';
	}

	// Normal comparisons
	switch (operator) {
		case '==':
			return left === right;
		case '!=':
			return left !== right;
		case '<':
			return typeof left === typeof right && left < right;
		case '<=':
			return typeof left === typeof right && left <= right;
		case '>':
			return typeof left === typeof right && left > right;
		case '>=':
			return typeof left === typeof right && left >= right;
		default:
			return false;
	}
}

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-syntax-filter',
		capabilities: ['syntax:rfc9535:filter'],
	},
	setup: ({ engine }) => {
		engine.evaluators.registerSelector(
			SelectorKinds.Filter,
			(input, selector: any, ctx: EvalContext) => {
				const result = evalFilterExpr(
					selector.expr,
					input,
					ctx,
					engine.evaluators,
				);
				// Truthy result (including true, non-zero, non-empty strings, etc.)
				// but not Nothing or falsy
				if (!isNothing(result) && result) {
					return [input];
				}
				return [];
			},
		);
	},
};
