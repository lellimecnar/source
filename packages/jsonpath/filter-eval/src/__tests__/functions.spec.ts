import { describe, it, expect } from 'vitest';
import { compileFilter } from '../compiler.js';

function ctx(currentValue: any) {
	return {
		root: currentValue,
		current: {
			value: currentValue,
			path: [],
			root: currentValue,
		},
	};
}

describe('functions integration', () => {
	it('match() works on strings', () => {
		const f = compileFilter('match(@.s, "abc")');
		expect(f(ctx({ s: 'abc' }))).toBe(true);
		expect(f(ctx({ s: 'ab' }))).toBe(false);
	});

	it('search() works on strings', () => {
		const f = compileFilter('search(@.s, "bc")');
		expect(f(ctx({ s: 'abc' }))).toBe(true);
		expect(f(ctx({ s: 'a' }))).toBe(false);
	});
});
