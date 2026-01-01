import { describe, expect, it } from 'vitest';

import { plugin } from './index';

describe('@jsonpath/plugin-result-node (additional)', () => {
	it('exports stable plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-result-node');
		expect(plugin.meta.capabilities).toContain('result:node');
	});

	it('registers a node mapper', () => {
		let mapper: ((nodes: any[]) => unknown[]) | undefined;
		plugin.setup({
			pluginId: plugin.meta.id,
			config: undefined,
			engine: {
				scanner: {} as any,
				parser: {} as any,
				evaluators: {} as any,
				results: {
					register: (type: any, fn: any) => {
						if (type === 'node') mapper = fn;
					},
				} as any,
				lifecycle: {} as any,
			},
		});
		expect(mapper).toBeTypeOf('function');
	});

	it('maps nodes by identity', () => {
		let mapper!: (nodes: any[]) => unknown[];
		plugin.setup({
			pluginId: plugin.meta.id,
			config: undefined,
			engine: {
				scanner: {} as any,
				parser: {} as any,
				evaluators: {} as any,
				results: {
					register: (_type: any, fn: any) => {
						mapper = fn;
					},
				} as any,
				lifecycle: {} as any,
			},
		});

		const n1 = { value: 1 };
		const n2 = { value: 2 };
		expect(mapper([n1, n2])).toEqual([n1, n2]);
	});

	it('returns an empty array for empty input', () => {
		let mapper!: (nodes: any[]) => unknown[];
		plugin.setup({
			pluginId: plugin.meta.id,
			config: undefined,
			engine: {
				scanner: {} as any,
				parser: {} as any,
				evaluators: {} as any,
				results: {
					register: (_type: any, fn: any) => {
						mapper = fn;
					},
				} as any,
				lifecycle: {} as any,
			},
		});
		expect(mapper([])).toEqual([]);
	});

	it('exposes setup()', () => {
		expect(plugin.setup).toBeTypeOf('function');
	});
});
