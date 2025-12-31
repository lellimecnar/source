import { describe, expect, it } from 'vitest';

import { matchesEntire, searches, plugin } from './index';

describe('@jsonpath/plugin-iregexp', () => {
	it('matchesEntire anchors the pattern', () => {
		expect(matchesEntire('a', 'a')).toBe(true);
		expect(matchesEntire('a', 'xa')).toBe(false);
	});

	it('searches tests for substring matches', () => {
		expect(searches('a', 'xa')).toBe(true);
		expect(searches('a', 'bbb')).toBe(false);
	});

	it('returns false on invalid patterns', () => {
		expect(matchesEntire('(', 'abc')).toBe(false);
		expect(searches('(', 'abc')).toBe(false);
	});

	it('exports plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-iregexp');
	});
});
