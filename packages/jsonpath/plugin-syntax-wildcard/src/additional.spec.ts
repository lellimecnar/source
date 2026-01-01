import { describe, expect, it } from 'vitest';

import { SelectorKinds } from '@jsonpath/ast';
import { rootLocation } from '@jsonpath/core';

import { plugin } from './index';

describe('@jsonpath/plugin-syntax-wildcard (additional)', () => {
	function getWildcardEvaluator() {
		let evaluator: any;
		plugin.hooks?.registerEvaluators?.({
			registerSelector: (kind: string, fn: any) => {
				if (kind === SelectorKinds.Wildcard) evaluator = fn;
			},
		} as any);
		expect(evaluator).toBeTypeOf('function');
		return evaluator;
	}

	it('exports stable plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-syntax-wildcard');
		expect(plugin.meta.capabilities).toContain('syntax:rfc9535:wildcard');
	});

	it('wildcards arrays left-to-right', () => {
		const evalWildcard = getWildcardEvaluator();
		const root = [3, 2, 1];
		const input = { value: root, location: rootLocation(), root };
		const out = evalWildcard(
			input,
			{ kind: SelectorKinds.Wildcard },
			{ root: input },
		);
		expect(out.map((n: any) => n.value)).toEqual([3, 2, 1]);
		expect(out.map((n: any) => n.location.components[0].index)).toEqual([
			0, 1, 2,
		]);
	});

	it('wildcards objects in sorted key order', () => {
		const evalWildcard = getWildcardEvaluator();
		const root = { b: 1, a: 2 };
		const input = { value: root, location: rootLocation(), root };
		const out = evalWildcard(
			input,
			{ kind: SelectorKinds.Wildcard },
			{ root: input },
		);
		expect(out.map((n: any) => n.location.components[0].name)).toEqual([
			'a',
			'b',
		]);
		expect(out.map((n: any) => n.value)).toEqual([2, 1]);
	});

	it('returns empty for primitives', () => {
		const evalWildcard = getWildcardEvaluator();
		const root = 123;
		const input = { value: root, location: rootLocation(), root };
		expect(
			evalWildcard(input, { kind: SelectorKinds.Wildcard }, { root: input }),
		).toEqual([]);
	});

	it('does not mutate the input location', () => {
		const evalWildcard = getWildcardEvaluator();
		const root = [1];
		const loc = rootLocation();
		const input = { value: root, location: loc, root };
		evalWildcard(input, { kind: SelectorKinds.Wildcard }, { root: input });
		expect(input.location.components).toHaveLength(0);
	});
});
