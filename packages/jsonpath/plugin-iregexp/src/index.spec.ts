import { describe, expect, it } from 'vitest';

import { matches, plugin } from './index';

describe('@jsonpath/plugin-iregexp', () => {
	it('matches via RegExp', () => {
		expect(matches('^a', 'abc')).toBe(true);
		expect(matches('^a', 'xbc')).toBe(false);
	});

	it('returns false on invalid patterns', () => {
		expect(matches('(', 'abc')).toBe(false);
	});

	it('exports plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-iregexp');
	});
});
