import { describe, expect, it } from 'vitest';

import { compile, matchesEntire, searches, plugin } from './index';

describe('@jsonpath/plugin-iregexp (additional)', () => {
	it('exports stable plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-iregexp');
		expect(plugin.meta.capabilities).toContain('regex:rfc9485:iregexp');
	});

	it('rejects lookaround / named group constructs', () => {
		expect(compile('(?=a)a')).toBeNull();
	});

	it('rejects backreferences', () => {
		expect(compile('(a)\\1')).toBeNull();
	});

	it('rejects non-greedy quantifiers', () => {
		expect(compile('a+?')).toBeNull();
	});

	it('anchors full matches for matchesEntire()', () => {
		expect(matchesEntire('a+', 'aaaa')).toBe(true);
		expect(matchesEntire('a+', 'aaab')).toBe(false);
	});

	it('supports partial matches for searches()', () => {
		expect(searches('b', 'abc')).toBe(true);
		expect(searches('d', 'abc')).toBe(false);
	});
});
