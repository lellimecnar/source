import { describe, it, expect } from 'vitest';
import { globalRegistry } from '../registry.js';

describe('Functions', () => {
	it('length() should return correct length', () => {
		const length = globalRegistry.get('length')!;
		expect(length.execute('abc')).toBe(3);
		expect(length.execute([1, 2])).toBe(2);
		expect(length.execute({ a: 1, b: 2 })).toBe(2);
	});

	it('count() should return node count', () => {
		const count = globalRegistry.get('count')!;
		expect(count.execute([1, 2, 3])).toBe(3);
		expect(count.execute([])).toBe(0);
	});

	it('match() should perform full regex match', () => {
		const match = globalRegistry.get('match')!;
		expect(match.execute('abc', 'a.c')).toBe(true);
		expect(match.execute('abcd', 'a.c')).toBe(false);
	});

	it('search() should perform partial regex match', () => {
		const search = globalRegistry.get('search')!;
		expect(search.execute('abcd', 'bc')).toBe(true);
		expect(search.execute('abcd', 'ef')).toBe(false);
	});

	it('value() should extract single value', () => {
		const value = globalRegistry.get('value')!;
		expect(value.execute([42])).toBe(42);
		expect(value.execute([1, 2])).toBe(null);
		expect(value.execute([])).toBe(null);
	});
});
