import { describe, expect, it } from 'vitest';

import { plugin } from './index';

describe('@jsonpath/plugin-result-pointer (additional)', () => {
	function getPointerMapper() {
		let mapper!: (nodes: any[]) => unknown[];
		plugin.hooks?.registerResults?.({
			register: (_type: any, fn: any) => {
				mapper = fn;
			},
		} as any);
		return mapper;
	}

	it('exports stable plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-result-pointer');
		expect(plugin.meta.capabilities).toContain('result:pointer');
	});

	it('formats root pointer as empty string', () => {
		const mapper = getPointerMapper();
		expect(mapper([{ location: { components: [] } }])).toEqual(['']);
	});

	it('formats member and index components', () => {
		const mapper = getPointerMapper();
		expect(
			mapper([
				{
					location: {
						components: [
							{ kind: 'member', name: 'a' },
							{ kind: 'index', index: 0 },
						],
					},
				},
			]),
		).toEqual(['/a/0']);
	});

	it('escapes ~ and / in pointer segments', () => {
		const mapper = getPointerMapper();
		expect(
			mapper([
				{
					location: {
						components: [{ kind: 'member', name: 'a~/b' }],
					},
				},
			]),
		).toEqual(['/a~0~1b']);
	});

	it('treats missing location as root pointer', () => {
		const mapper = getPointerMapper();
		expect(mapper([{ location: undefined }])).toEqual(['']);
	});

	it('does not declare dependsOn', () => {
		expect((plugin.meta as any).dependsOn).toBeUndefined();
	});
});
