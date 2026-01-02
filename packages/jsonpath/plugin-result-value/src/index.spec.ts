import { describe, expect, it } from 'vitest';

import { plugin } from './index';

describe('@jsonpath/plugin-result-value', () => {
	it('exports plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-result-value');
		expect(plugin.meta.capabilities).toEqual(['result:value']);
	});
});
