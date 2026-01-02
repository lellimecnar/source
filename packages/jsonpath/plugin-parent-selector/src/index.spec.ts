import { describe, expect, it } from 'vitest';

import { plugin } from './index';

describe('@jsonpath/plugin-parent-selector', () => {
	it('exports plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-parent-selector');
		expect(plugin.meta.capabilities).toEqual(['extension:parent-selector']);
	});
});
