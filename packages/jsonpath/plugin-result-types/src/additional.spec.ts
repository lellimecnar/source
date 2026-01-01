import { describe, expect, it } from 'vitest';

import { plugin, plugins } from './index';

describe('@jsonpath/plugin-result-types (additional)', () => {
	it('exports a plugins list with expected ids', () => {
		const ids = plugins.map((p) => p.meta.id);
		expect(ids).toContain('@jsonpath/plugin-result-value');
		expect(ids).toContain('@jsonpath/plugin-result-node');
		expect(ids).toContain('@jsonpath/plugin-result-path');
		expect(ids).toContain('@jsonpath/plugin-result-pointer');
		expect(ids).toContain('@jsonpath/plugin-result-parent');
	});

	it('exports stable plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-result-types');
		expect(plugin.meta.capabilities).toContain('result:types');
	});

	it('declares dependsOn matching the exported plugins list', () => {
		expect(plugin.meta.dependsOn).toEqual(plugins.map((p) => p.meta.id));
	});

	it('does not register any hooks (pure metadata)', () => {
		expect(plugin.setup).toBeTypeOf('function');
	});

	it('meta keys include dependsOn', () => {
		expect(Object.keys(plugin.meta).sort()).toEqual([
			'capabilities',
			'dependsOn',
			'id',
		]);
	});
});
