import { describe, expect, it } from 'vitest';

import { plugin } from './index';

describe('@jsonpath/plugin-syntax-root', () => {
	it('exports plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-syntax-root');
		expect(plugin.meta.capabilities).toEqual(['syntax:rfc9535:root']);
	});
});
