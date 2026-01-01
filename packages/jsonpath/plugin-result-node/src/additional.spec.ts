import { describe, expect, it } from 'vitest';

import { plugin } from './index';

describe('@jsonpath/plugin-result-node (additional)', () => {
	it('exports stable plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-result-node');
		expect(plugin.meta.capabilities).toContain('result:node');
	});

	it('registers a node mapper', () => {
		let mapper: ((nodes: any[]) => unknown[]) | undefined;
		plugin.hooks?.registerResults?.({
			register: (type: any, fn: any) => {
				if (type === 'node') mapper = fn;
			},
		} as any);
		expect(mapper).toBeTypeOf('function');
	});

	it('maps nodes by identity', () => {
		let mapper!: (nodes: any[]) => unknown[];
		plugin.hooks?.registerResults?.({
			register: (_type: any, fn: any) => {
				mapper = fn;
			},
		} as any);

		const n1 = { value: 1 };
		const n2 = { value: 2 };
		expect(mapper([n1, n2])).toEqual([n1, n2]);
	});

	it('returns an empty array for empty input', () => {
		let mapper!: (nodes: any[]) => unknown[];
		plugin.hooks?.registerResults?.({
			register: (_type: any, fn: any) => {
				mapper = fn;
			},
		} as any);
		expect(mapper([])).toEqual([]);
	});

	it('does not register evaluators', () => {
		expect(plugin.hooks?.registerEvaluators).toBeUndefined();
	});
});
