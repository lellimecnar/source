import { describe, expect, it } from 'vitest';

import { plugin } from './index';

describe('@jsonpath/plugin-result-value (additional)', () => {
	it('exports stable plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-result-value');
		expect(plugin.meta.capabilities).toContain('result:value');
	});

	it('registers a value mapper', () => {
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
						if (type === 'value') mapper = fn;
					},
				} as any,
				lifecycle: {} as any,
			},
		});
		expect(mapper).toBeTypeOf('function');
	});

	it('maps node values in order', () => {
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

		expect(mapper([{ value: 1 }, { value: 2 }])).toEqual([1, 2]);
	});

	it('preserves undefined values', () => {
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

		expect(mapper([{ value: undefined }])).toEqual([undefined]);
	});

	it('does not declare dependsOn', () => {
		expect((plugin.meta as any).dependsOn).toBeUndefined();
	});
});
