import { describe, expect, it } from 'vitest';

import { plugin } from './index';

describe('@jsonpath/plugin-filter-literals', () => {
	it('exports plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-filter-literals');
	});
});
