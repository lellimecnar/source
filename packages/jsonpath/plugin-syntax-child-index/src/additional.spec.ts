import { describe, expect, it } from 'vitest';

import { SelectorKinds } from '@jsonpath/ast';
import { rootLocation } from '@jsonpath/core';

import { plugin } from './index';

describe('@jsonpath/plugin-syntax-child-index (additional)', () => {
	function getIndexEvaluator() {
		let evaluator: any;
		plugin.setup({
			pluginId: plugin.meta.id,
			config: undefined,
			engine: {
				scanner: {} as any,
				parser: {} as any,
				evaluators: {
					registerSelector: (kind: string, fn: any) => {
						if (kind === SelectorKinds.Index) evaluator = fn;
					},
				} as any,
				results: {} as any,
				lifecycle: {} as any,
			},
		});
		expect(evaluator).toBeTypeOf('function');
		return evaluator;
	}

	function getSliceEvaluator() {
		let evaluator: any;
		plugin.setup({
			pluginId: plugin.meta.id,
			config: undefined,
			engine: {
				scanner: {} as any,
				parser: {} as any,
				evaluators: {
					registerSelector: (kind: string, fn: any) => {
						if (kind === SelectorKinds.Slice) evaluator = fn;
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
		expect(plugin.meta.id).toBe('@jsonpath/plugin-syntax-child-index');
		expect(plugin.meta.capabilities).toContain('syntax:rfc9535:child-index');
		expect(plugin.meta.capabilities).toContain('syntax:rfc9535:slice');
	});

	it('selects by positive index', () => {
		const evalIndex = getIndexEvaluator();
		const root = [10, 20, 30];
		const input = { value: root, location: rootLocation(), root };
		const out = evalIndex(
			input,
			{ kind: SelectorKinds.Index, index: 1 },
			{ root: input },
		);
		expect(out).toHaveLength(1);
		expect(out[0].value).toBe(20);
		expect(out[0].location.components[0]).toEqual({ kind: 'index', index: 1 });
	});

	it('supports negative indices', () => {
		const evalIndex = getIndexEvaluator();
		const root = [10, 20, 30];
		const input = { value: root, location: rootLocation(), root };
		const out = evalIndex(
			input,
			{ kind: SelectorKinds.Index, index: -1 },
			{ root: input },
		);
		expect(out).toHaveLength(1);
		expect(out[0].value).toBe(30);
	});

	it('returns empty for out-of-bounds indices', () => {
		const evalIndex = getIndexEvaluator();
		const root = [10, 20, 30];
		const input = { value: root, location: rootLocation(), root };
		expect(
			evalIndex(
				input,
				{ kind: SelectorKinds.Index, index: 99 },
				{ root: input },
			),
		).toEqual([]);
		expect(
			evalIndex(
				input,
				{ kind: SelectorKinds.Index, index: -99 },
				{ root: input },
			),
		).toEqual([]);
	});

	it('slices with default start/end', () => {
		const evalSlice = getSliceEvaluator();
		const root = [0, 1, 2, 3];
		const input = { value: root, location: rootLocation(), root };
		const out = evalSlice(
			input,
			{ kind: SelectorKinds.Slice, start: undefined, end: undefined, step: 2 },
			{ root: input },
		);
		expect(out.map((n: any) => n.value)).toEqual([0, 2]);
	});

	it('returns empty for slice step=0', () => {
		const evalSlice = getSliceEvaluator();
		const root = [0, 1, 2, 3];
		const input = { value: root, location: rootLocation(), root };
		const out = evalSlice(
			input,
			{ kind: SelectorKinds.Slice, step: 0 },
			{ root: input },
		);
		expect(out).toEqual([]);
	});
});
