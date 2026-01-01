import { describe, expect, it } from 'vitest';

import { FilterExprKinds, SelectorKinds } from '@jsonpath/ast';
import { rootLocation, appendMember } from '@jsonpath/core';

import { plugin } from './index';

describe('@jsonpath/plugin-syntax-filter (additional)', () => {
	function getFilterEvaluator() {
		let evaluator: any;
		plugin.setup({
			pluginId: plugin.meta.id,
			config: undefined,
			engine: {
				scanner: {} as any,
				parser: {} as any,
				evaluators: {
					registerSelector: (kind: string, fn: any) => {
						if (kind === SelectorKinds.Filter) evaluator = fn;
					},
					getSegment: () => undefined,
					getSelector: () => undefined,
				} as any,
				results: {} as any,
				lifecycle: {} as any,
			},
		});
		expect(evaluator).toBeTypeOf('function');
		return evaluator;
	}

	it('exports stable plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-syntax-filter');
		expect(plugin.meta.capabilities).toContain('syntax:rfc9535:filter');
	});

	it('passes through when filter expression is truthy', () => {
		const evalFilter = getFilterEvaluator();
		const root = { a: 1 };
		const input = { value: root, location: rootLocation(), root };
		const out = evalFilter(
			input,
			{
				kind: SelectorKinds.Filter,
				expr: { kind: FilterExprKinds.Literal, value: true },
			},
			{ root: input },
		);
		expect(out).toEqual([
			{
				value: 1,
				location: appendMember(rootLocation(), 'a'),
				root,
			},
		]);
	});

	it('filters out when expression is falsy', () => {
		const evalFilter = getFilterEvaluator();
		const root = { a: 1 };
		const input = { value: root, location: rootLocation(), root };
		const out = evalFilter(
			input,
			{
				kind: SelectorKinds.Filter,
				expr: { kind: FilterExprKinds.Literal, value: 0 },
			},
			{ root: input },
		);
		expect(out).toEqual([]);
	});

	it('supports comparisons with ==', () => {
		const evalFilter = getFilterEvaluator();
		const root = { a: 1 };
		const input = { value: root, location: rootLocation(), root };
		const out = evalFilter(
			input,
			{
				kind: SelectorKinds.Filter,
				expr: {
					kind: FilterExprKinds.Compare,
					operator: '==',
					left: { kind: FilterExprKinds.Literal, value: 1 },
					right: { kind: FilterExprKinds.Literal, value: 1 },
				},
			},
			{ root: input },
		);
		expect(out).toEqual([
			{
				value: 1,
				location: appendMember(rootLocation(), 'a'),
				root,
			},
		]);
	});

	it('length() counts Unicode scalar values', () => {
		const evalFilter = getFilterEvaluator();
		const root = { s: '💩' };
		const input = { value: root, location: rootLocation(), root };
		const out = evalFilter(
			input,
			{
				kind: SelectorKinds.Filter,
				expr: {
					kind: FilterExprKinds.Compare,
					operator: '==',
					left: {
						kind: FilterExprKinds.FunctionCall,
						name: 'length',
						args: [{ kind: FilterExprKinds.Literal, value: '💩' }],
					},
					right: { kind: FilterExprKinds.Literal, value: 1 },
				},
			},
			{ root: input },
		);
		expect(out).toEqual([
			{
				value: '💩',
				location: appendMember(rootLocation(), 's'),
				root,
			},
		]);
	});

	it('match() and search() differ (full vs partial)', () => {
		const evalFilter = getFilterEvaluator();
		const root = { a: 'abc' };
		const input = { value: root, location: rootLocation(), root };

		const matchOut = evalFilter(
			input,
			{
				kind: SelectorKinds.Filter,
				expr: {
					kind: FilterExprKinds.FunctionCall,
					name: 'match',
					args: [
						{ kind: FilterExprKinds.Literal, value: 'abc' },
						{ kind: FilterExprKinds.Literal, value: 'b' },
					],
				},
			},
			{ root: input },
		);

		const searchOut = evalFilter(
			input,
			{
				kind: SelectorKinds.Filter,
				expr: {
					kind: FilterExprKinds.FunctionCall,
					name: 'search',
					args: [
						{ kind: FilterExprKinds.Literal, value: 'abc' },
						{ kind: FilterExprKinds.Literal, value: 'b' },
					],
				},
			},
			{ root: input },
		);

		expect(matchOut).toEqual([]);
		expect(searchOut).toEqual([
			{
				value: 'abc',
				location: appendMember(rootLocation(), 'a'),
				root,
			},
		]);
	});
});
