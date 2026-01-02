import { describe, expect, it } from 'vitest';

import { plugin } from './index';

describe('@jsonpath/plugin-result-pointer', () => {
	it('exports plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-result-pointer');
		expect(plugin.meta.capabilities).toEqual(['result:pointer']);
	});
});
