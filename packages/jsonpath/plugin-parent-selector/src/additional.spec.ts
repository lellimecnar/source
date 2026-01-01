import { describe, expect, it } from 'vitest';

import { plugin } from './index';

describe('@jsonpath/plugin-parent-selector (additional)', () => {
	it('exports stable plugin id', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-parent-selector');
	});

	it('declares the expected capability', () => {
		expect(plugin.meta.capabilities).toContain('extension:parent-selector');
	});

	it('has exactly one declared capability', () => {
		expect(plugin.meta.capabilities).toHaveLength(1);
	});

	it('does not register any hooks', () => {
		expect(plugin.setup).toBeTypeOf('function');
	});

	it('has only id + capabilities in meta', () => {
		expect(Object.keys(plugin.meta).sort()).toEqual(['capabilities', 'id']);
	});
});
