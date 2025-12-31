import { describe, expect, it } from 'vitest';

import { plugin, plugins } from './index';

describe('@jsonpath/plugin-result-types', () => {
	it('exports plugin list and metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-result-types');
		expect(plugins).toHaveLength(5);
	});
});
