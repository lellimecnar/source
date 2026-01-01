import { describe, expect, it } from 'vitest';

import { PluginRegistry } from './registry';

describe('PluginRegistry', () => {
	it('registers and retrieves plugins by id', () => {
		const r = new PluginRegistry();
		r.register({ meta: { id: 'a' } });
		expect(r.get('a')?.meta.id).toBe('a');
		expect(r.all().map((p) => p.meta.id)).toEqual(['a']);
	});

	it('throws on duplicate plugin ids', () => {
		const r = new PluginRegistry();
		r.register({ meta: { id: 'a' } });
		expect(() => r.register({ meta: { id: 'a' } })).toThrow(
			/Duplicate plugin id registered/,
		);
	});
});
