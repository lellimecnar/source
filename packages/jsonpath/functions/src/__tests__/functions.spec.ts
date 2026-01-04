import { describe, it, expect } from 'vitest';
import { getFunction } from '@jsonpath/core';
import '../registry.js'; // Ensure built-ins are registered

describe('Functions', () => {
	it('length() should return correct length', () => {
		const length = getFunction('length')!;
		expect(length.evaluate('abc')).toBe(3);
		expect(length.evaluate([1, 2])).toBe(2);
		expect(length.evaluate({ a: 1, b: 2 })).toBe(2);
	});

	it('count() should return node count', () => {
		const count = getFunction('count')!;
		const nodes = [
			{ value: 1, path: [0], root: {} },
			{ value: 2, path: [1], root: {} },
			{ value: 3, path: [2], root: {} },
		] as any[];
		expect(count.evaluate(nodes)).toBe(3);
		expect(count.evaluate([])).toBe(0);
	});

	it('match() should perform full regex match', () => {
		const match = getFunction('match')!;
		expect(match.evaluate('abc', 'a.c')).toBe(true);
		expect(match.evaluate('abcd', 'a.c')).toBe(false);
	});

	it('search() should perform partial regex match', () => {
		const search = getFunction('search')!;
		expect(search.evaluate('abcd', 'bc')).toBe(true);
		expect(search.evaluate('abcd', 'ef')).toBe(false);
	});

	it('value() should extract single value', () => {
		const value = getFunction('value')!;
		const nodes = [{ value: 42, path: ['x'], root: {} }] as any[];
		expect(value.evaluate(nodes)).toBe(42);
		expect(value.evaluate([...nodes, ...nodes])).toBe(undefined);
		expect(value.evaluate([])).toBe(undefined);
	});
});
