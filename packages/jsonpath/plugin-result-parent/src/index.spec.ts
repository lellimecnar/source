import { describe, expect, it } from 'vitest';

import { plugin } from './index';

describe('@jsonpath/plugin-result-parent', () => {
	it('exports plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-result-parent');
		expect(plugin.meta.capabilities).toEqual(['result:parent']);
	});
});
