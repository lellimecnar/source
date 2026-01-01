import { describe, expect, it } from 'vitest';

import { plugin } from './index';

describe('@jsonpath/plugin-result-path (additional)', () => {
	function getPathMapper() {
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
		return mapper;
	}

	it('exports stable plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-result-path');
		expect(plugin.meta.capabilities).toContain('result:path');
	});

	it('formats simple identifiers with dot notation', () => {
		const mapper = getPathMapper();
		expect(
			mapper([{ location: { components: [{ kind: 'member', name: 'foo' }] } }]),
		).toEqual(['$.foo']);
	});

	it('formats non-identifiers using bracket notation', () => {
		const mapper = getPathMapper();
		expect(
			mapper([{ location: { components: [{ kind: 'member', name: 'a-b' }] } }]),
		).toEqual(["$['a-b']"]);
	});

	it('escapes quotes and backslashes in bracket notation', () => {
		const mapper = getPathMapper();
		expect(
			mapper([
				{ location: { components: [{ kind: 'member', name: "a'\\b" }] } },
			]),
		).toEqual(["$['a\\'\\\\b']"]);
	});

	it('formats indices in brackets', () => {
		const mapper = getPathMapper();
		expect(
			mapper([{ location: { components: [{ kind: 'index', index: 3 }] } }]),
		).toEqual(['$[3]']);
	});

	it('defaults to $ for missing/empty locations', () => {
		const mapper = getPathMapper();
		expect(
			mapper([{ location: { components: [] } }, { location: null }]),
		).toEqual(['$', '$']);
	});
});
