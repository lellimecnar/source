import { describe, expect, it } from 'vitest';

import { SelectorKinds } from '@jsonpath/ast';
import { rootLocation } from '@jsonpath/core';

import { plugin } from './index';

describe('@jsonpath/plugin-syntax-child-member (additional)', () => {
	function getNameEvaluator() {
		let evaluator: any;
		plugin.setup({
			pluginId: plugin.meta.id,
			config: undefined,
			engine: {
				scanner: {} as any,
				parser: {} as any,
				evaluators: {
					registerSelector: (kind: string, fn: any) => {
						if (kind === SelectorKinds.Name) evaluator = fn;
					},
				} as any,
				results: {} as any,
				lifecycle: {} as any,
			},
		});
		expect(evaluator).toBeTypeOf('function');
		return evaluator;
	}

	it('exports stable plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-syntax-child-member');
		expect(plugin.meta.capabilities).toContain('syntax:rfc9535:child-member');
	});

	it('selects a member from an object', () => {
		const evalName = getNameEvaluator();
		const root = { a: 1 };
		const input = { value: root, location: rootLocation(), root };
		const out = evalName(
			input,
			{ kind: SelectorKinds.Name, name: 'a' },
			{ root: input },
		);
		expect(out).toHaveLength(1);
		expect(out[0].value).toBe(1);
	});

	it('returns empty for missing member', () => {
		const evalName = getNameEvaluator();
		const root = { a: 1 };
		const input = { value: root, location: rootLocation(), root };
		expect(
			evalName(input, { kind: SelectorKinds.Name, name: 'b' }, { root: input }),
		).toEqual([]);
	});

	it('returns empty for non-record inputs', () => {
		const evalName = getNameEvaluator();
		const root = [1, 2, 3];
		const input = { value: root, location: rootLocation(), root };
		expect(
			evalName(input, { kind: SelectorKinds.Name, name: '0' }, { root: input }),
		).toEqual([]);
	});

	it('appends a member component to the location', () => {
		const evalName = getNameEvaluator();
		const root = { a: 1 };
		const loc = rootLocation();
		const input = { value: root, location: loc, root };
		const out = evalName(
			input,
			{ kind: SelectorKinds.Name, name: 'a' },
			{ root: input },
		);
		expect(input.location.components).toHaveLength(0);
		expect(out[0].location.components).toHaveLength(1);
		expect(out[0].location.components[0]).toEqual({
			kind: 'member',
			name: 'a',
		});
	});
});
