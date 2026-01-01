import { describe, expect, it } from 'vitest';

import {
	FilterExprKinds,
	SelectorKinds,
	embeddedQuery,
	filterAnd,
	filterCompare,
	filterFunctionCall,
	filterLiteral,
	filterNot,
	filterOr,
	filterSelector,
	indexSelector,
	nameSelector,
	path,
	segment,
	sliceSelector,
	wildcardSelector,
} from './index';

describe('@jsonpath/ast (additional)', () => {
	it('exports stable kind enums', () => {
		expect(SelectorKinds.Name).toBe('Selector:Name');
		expect(FilterExprKinds.Literal).toBe('FilterExpr:Literal');
	});

	it('builds a basic path AST', () => {
		const ast = path([segment([nameSelector('a')])]);
		expect(ast.kind).toBe('Path');
		expect(ast.segments).toHaveLength(1);
		const seg: any = ast.segments[0];
		expect(seg.kind).toBe('Segment');
		expect(seg.selectors[0].kind).toBe(SelectorKinds.Name);
	});

	it('creates selectors with correct shapes', () => {
		expect(indexSelector(0)).toEqual({ kind: SelectorKinds.Index, index: 0 });
		expect(wildcardSelector()).toEqual({ kind: SelectorKinds.Wildcard });
		expect(sliceSelector({ start: 1, end: 3, step: 2 })).toEqual({
			kind: SelectorKinds.Slice,
			start: 1,
			end: 3,
			step: 2,
		});
	});

	it('creates filter expression nodes', () => {
		const a = filterLiteral(1);
		const b = filterLiteral(2);
		expect(filterCompare('>=', a, b)).toMatchObject({
			kind: FilterExprKinds.Compare,
			operator: '>=',
		});
		expect(filterAnd(a, b).kind).toBe(FilterExprKinds.And);
		expect(filterOr(a, b).kind).toBe(FilterExprKinds.Or);
		expect(filterNot(a).kind).toBe(FilterExprKinds.Not);
		expect(filterFunctionCall('length', [a]).kind).toBe(
			FilterExprKinds.FunctionCall,
		);
	});

	it('creates embedded queries and filter selectors', () => {
		const q = embeddedQuery('current', [segment([nameSelector('x')])], true);
		expect(q).toMatchObject({
			kind: FilterExprKinds.EmbeddedQuery,
			scope: 'current',
			singular: true,
		});
		const sel = filterSelector(filterLiteral(true));
		expect(sel.kind).toBe(SelectorKinds.Filter);
	});
});
