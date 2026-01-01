import { describe, expect, it } from 'vitest';

import { rootLocation } from '@jsonpath/core';

import { plugin } from './index';

describe('@jsonpath/plugin-syntax-descendant (additional)', () => {
	function getDescendantEvaluator() {
		let evaluator: any;
		plugin.hooks?.registerEvaluators?.({
			registerSegment: (kind: string, fn: any) => {
				if (kind === 'DescendantSegment') evaluator = fn;
			},
		} as any);
		expect(evaluator).toBeTypeOf('function');
		return evaluator;
	}

	it('exports stable plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-syntax-descendant');
		expect(plugin.meta.capabilities).toContain('syntax:rfc9535:descendant');
	});

	it('expands descendants-or-self in BFS order with sorted object keys', () => {
		const evalDesc = getDescendantEvaluator();
		const rootValue = { b: { x: 1 }, a: { y: 2 } };
		const rootNode = {
			value: rootValue,
			location: rootLocation(),
			root: rootValue,
		};

		// Selector evaluator that returns the input node (identity).
		const evaluators = {
			getSelector: (kind: string) =>
				kind === 'Identity' ? (n: any) => [n] : undefined,
		};

		const out = evalDesc(
			[rootNode],
			{ kind: 'DescendantSegment', selectors: [{ kind: 'Identity' }] },
			evaluators,
			{ root: rootNode },
		);

		// Root first, then children a,b (sorted), then their children.
		const pointers = out.map((n: any) =>
			n.location.components
				.map((c: any) => (c.kind === 'member' ? c.name : c.index))
				.join('.'),
		);
		expect(pointers.slice(0, 3)).toEqual(['', 'a', 'b']);
	});

	it('throws when a selector evaluator is missing', () => {
		const evalDesc = getDescendantEvaluator();
		const rootValue = { a: 1 };
		const rootNode = {
			value: rootValue,
			location: rootLocation(),
			root: rootValue,
		};

		expect(() =>
			evalDesc(
				[rootNode],
				{ kind: 'DescendantSegment', selectors: [{ kind: 'Missing' }] },
				{ getSelector: () => undefined },
				{ root: rootNode },
			),
		).toThrow(/No evaluator registered for selector kind/i);
	});

	it('includes array descendants', () => {
		const evalDesc = getDescendantEvaluator();
		const rootValue = [10, [20]];
		const rootNode = {
			value: rootValue,
			location: rootLocation(),
			root: rootValue,
		};

		const out = evalDesc(
			[rootNode],
			{ kind: 'DescendantSegment', selectors: [{ kind: 'Identity' }] },
			{
				getSelector: (k: string) =>
					k === 'Identity' ? (n: any) => [n] : undefined,
			},
			{ root: rootNode },
		);

		// root, [0], [1], [1][0]
		expect(out.map((n: any) => n.location.components.length)).toContain(2);
	});

	it('does not mutate the input nodes', () => {
		const evalDesc = getDescendantEvaluator();
		const rootValue = { a: 1 };
		const rootNode = {
			value: rootValue,
			location: rootLocation(),
			root: rootValue,
		};
		const before = rootNode.location.components.length;

		evalDesc(
			[rootNode],
			{ kind: 'DescendantSegment', selectors: [{ kind: 'Identity' }] },
			{
				getSelector: (k: string) =>
					k === 'Identity' ? (n: any) => [n] : undefined,
			},
			{ root: rootNode },
		);

		expect(rootNode.location.components.length).toBe(before);
	});
});
