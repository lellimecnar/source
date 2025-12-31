import { describe, expect, it } from 'vitest';

import { plugin } from './index';

describe('@jsonpath/plugin-property-name-selector', () => {
	it('exports plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-property-name-selector');
		expect(plugin.meta.capabilities).toEqual([
			'extension:property-name-selector',
		]);
	});
});
