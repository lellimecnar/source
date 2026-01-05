import { describe, it, expect } from 'vitest';
import { getFunction } from '../index.js';
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
		// RFC 9535: invalid pattern => LogicalFalse
		expect(match.evaluate('abc', '[')).toBe(false);
		expect(match.evaluate('abc', 123 as any)).toBe(false);
	});

	it('search() should perform partial regex match', () => {
		const search = getFunction('search')!;
		expect(search.evaluate('abcd', 'bc')).toBe(true);
		expect(search.evaluate('abcd', 'ef')).toBe(false);
		// RFC 9535: invalid pattern => LogicalFalse
		expect(search.evaluate('abcd', '[')).toBe(false);
		expect(search.evaluate('abcd', 123 as any)).toBe(false);
	});

	it('value() should extract single value', () => {
		const value = getFunction('value')!;
		const nodes = [{ value: 42, path: ['x'], root: {} }] as any[];
		expect(value.evaluate(nodes)).toBe(42);
		expect(value.evaluate([...nodes, ...nodes])).toBe(undefined);
		expect(value.evaluate([])).toBe(undefined);
	});

	it('registers min/max/sum/avg', () => {
		const min = getFunction('min')!;
		const max = getFunction('max')!;
		const sum = getFunction('sum')!;
		const avg = getFunction('avg')!;

		const nodes = [{ value: 1 }, { value: 3 }, { value: 2 }] as any;
		expect(min.evaluate(nodes)).toBe(1);
		expect(max.evaluate(nodes)).toBe(3);
		expect(sum.evaluate(nodes)).toBe(6);
		expect(avg.evaluate(nodes)).toBe(2);
	});

	it('registers keys/type', () => {
		const keys = getFunction('keys')!;
		const type = getFunction('type')!;
		expect(keys.evaluate({ a: 1, b: 2 } as any)).toEqual(['a', 'b']);
		expect(type.evaluate(null as any)).toBe('null');
		expect(type.evaluate([1] as any)).toBe('array');
		expect(type.evaluate(1 as any)).toBe('number');
	});
});
