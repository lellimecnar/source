import { describe, expect, it } from 'vitest';

import { plugin } from './index';

describe('@jsonpath/plugin-syntax-child-member', () => {
	it('exports plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-syntax-child-member');
		expect(plugin.meta.capabilities).toEqual(['syntax:rfc9535:child-member']);
	});
});
