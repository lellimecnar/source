import { describe, expect, it } from 'vitest';

import { plugin } from './index';

describe('@jsonpath/plugin-type-selectors', () => {
	it('exports plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-type-selectors');
		expect(plugin.meta.capabilities).toEqual(['extension:type-selectors']);
	});
});
