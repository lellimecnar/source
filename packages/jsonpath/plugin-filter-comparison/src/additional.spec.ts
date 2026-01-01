import { describe, expect, it } from 'vitest';

import { plugin } from './index';

describe('@jsonpath/plugin-filter-comparison (additional)', () => {
	it('exports stable plugin id', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-filter-comparison');
	});

	it('declares the expected capability', () => {
		expect(plugin.meta.capabilities).toContain('filter:rfc9535:comparison');
	});

	it('has exactly one declared capability', () => {
		expect(plugin.meta.capabilities).toHaveLength(1);
	});

	it('does not register any hooks', () => {
		expect(plugin.hooks).toBeUndefined();
	});

	it('has only id + capabilities in meta', () => {
		expect(Object.keys(plugin.meta).sort()).toEqual(['capabilities', 'id']);
	});
});
