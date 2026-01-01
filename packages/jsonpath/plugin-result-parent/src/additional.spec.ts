import { describe, expect, it } from 'vitest';

import { plugin } from './index';

describe('@jsonpath/plugin-result-parent (additional)', () => {
	function getParentMapper() {
		let mapper!: (nodes: any[]) => unknown[];
		plugin.hooks?.registerResults?.({
			register: (_type: any, fn: any) => {
				mapper = fn;
			},
		} as any);
		return mapper;
	}

	it('exports stable plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-result-parent');
		expect(plugin.meta.capabilities).toContain('result:parent');
	});

	it('returns undefined for root (no parent)', () => {
		const mapper = getParentMapper();
		expect(mapper([{ root: { a: 1 }, location: { components: [] } }])).toEqual([
			undefined,
		]);
	});

	it('returns the parent value via pointer lookup', () => {
		const mapper = getParentMapper();
		const root = { a: { b: 123 } };
		expect(
			mapper([
				{
					root,
					location: {
						components: [
							{ kind: 'member', name: 'a' },
							{ kind: 'member', name: 'b' },
						],
					},
				},
			]),
		).toEqual([root.a]);
	});

	it('supports array parent lookup', () => {
		const mapper = getParentMapper();
		const root = { xs: [10, 20, 30] };
		expect(
			mapper([
				{
					root,
					location: {
						components: [
							{ kind: 'member', name: 'xs' },
							{ kind: 'index', index: 1 },
						],
					},
				},
			]),
		).toEqual([root.xs]);
	});

	it('treats missing location as root (no parent)', () => {
		const mapper = getParentMapper();
		expect(mapper([{ root: { a: 1 }, location: undefined }])).toEqual([
			undefined,
		]);
	});

	it('does not declare dependsOn', () => {
		expect((plugin.meta as any).dependsOn).toBeUndefined();
	});
});
