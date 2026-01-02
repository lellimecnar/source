import { describe, expect, it } from 'vitest';

import { plugin } from './index';

describe('@jsonpath/plugin-result-node', () => {
	it('exports plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-result-node');
		expect(plugin.meta.capabilities).toEqual(['result:node']);
	});
});
