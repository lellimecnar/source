import { describe, expect, it } from 'vitest';

import { PluginRegistry } from './registry';
import { PluginPhases } from './phases';

describe('PluginRegistry', () => {
	it('registers and retrieves plugins by id', () => {
		const r = new PluginRegistry();
		r.register({
			meta: { id: 'a', phases: [PluginPhases.syntax] },
			setup: () => {},
		});
		expect(r.get('a')?.meta.id).toBe('a');
		expect(r.all().map((p) => p.meta.id)).toEqual(['a']);
	});

	it('throws on duplicate plugin ids', () => {
		const r = new PluginRegistry();
		r.register({
			meta: { id: 'a', phases: [PluginPhases.syntax] },
			setup: () => {},
		});
		expect(() =>
			r.register({
				meta: { id: 'a', phases: [PluginPhases.syntax] },
				setup: () => {},
			}),
		).toThrow(/Duplicate plugin id registered/);
	});
});
