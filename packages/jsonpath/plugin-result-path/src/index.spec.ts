import { describe, expect, it } from 'vitest';

import { plugin } from './index';

describe('@jsonpath/plugin-result-path', () => {
	it('exports plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-result-path');
		expect(plugin.meta.capabilities).toEqual(['result:path']);
	});
});
