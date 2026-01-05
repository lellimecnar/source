import { describe, it, expect } from 'vitest';
import { query } from '../index';

describe('JSONPath Expressions (RFC 9535)', () => {
	const data = [
		{ a: 1, b: 2, c: 3, i: true, j: 0, k: 'foo' },
		{ d: { e: 4 }, f: [5, 6] },
		{ g: null, h: false, k: '' },
	];

	describe('Existence Tests', () => {
		it('should return true if node exists (primitive)', () => {
			expect(query(data, '$[?@.a]')).toHaveLength(1);
			expect(query(data, '$[?@.g]')).toHaveLength(1);
			expect(query(data, '$[?@.h]')).toHaveLength(1);
			expect(query(data, '$[?@.j]')).toHaveLength(1);
		});

		it('should return false if node does not exist', () => {
			expect(query(data, '$[?@.absent]')).toHaveLength(0);
		});

		it('should handle negated existence', () => {
			expect(query(data, '$[?!@.a]')).toHaveLength(2);
			expect(query(data, '$[?!@.absent]')).toHaveLength(3);
		});
	});

	describe('Comparison Operators', () => {
		it('should handle ==', () => {
			expect(query(data, '$[?@.a == 1]')).toHaveLength(1);
			expect(query(data, '$[?@.a == 4]')).toHaveLength(0);
			expect(query(data, '$[?@.g == null]')).toHaveLength(1);
		});

		it('should handle !=', () => {
			expect(query(data, '$[?@.a != 1]')).toHaveLength(2); // {d...} and {g...} don't have 'a', so @.a is Nothing. Nothing != 1 is true.
		});

		it('should handle <, <=, >, >=', () => {
			expect(query(data, '$[?@.a < 2]')).toHaveLength(1);
			expect(query(data, '$[?@.a <= 1]')).toHaveLength(1);
			expect(query(data, '$[?@.b > 1]')).toHaveLength(1);
			expect(query(data, '$[?@.b >= 2]')).toHaveLength(1);
		});

		it('should handle Nothing in comparisons', () => {
			expect(query([{}], '$[?@.absent1 == @.absent2]')).toHaveLength(1);
			expect(query([{}], '$[?@.absent == 1]')).toHaveLength(0);
			expect(query([{}], '$[?@.absent != 1]')).toHaveLength(1);
		});
	});

	describe('Logical Operators', () => {
		it('should handle &&', () => {
			expect(query(data, '$[?@.a == 1 && @.b == 2]')).toHaveLength(1);
			expect(query(data, '$[?@.a == 1 && @.b == 3]')).toHaveLength(0);
		});

		it('should handle ||', () => {
			expect(query(data, '$[?@.a == 1 || @.g == null]')).toHaveLength(2);
		});

		it('should handle !', () => {
			expect(query(data, '$[?!(@.a == 1)]')).toHaveLength(2);
		});
	});

	describe('RFC 9535 Edge Cases', () => {
		it('should handle structured value comparisons', () => {
			expect(query(data, '$[?@.f == [5, 6]]')).toHaveLength(1);
			expect(query(data, '$[?@.d == {"e": 4}]')).toHaveLength(1);
		});

		it('should handle truthiness of 0 and empty string', () => {
			// In RFC 9535, 0 and "" are truthy if they exist.
			expect(query(data, '$[?@.j]')).toHaveLength(1); // j is 0
			expect(query(data, '$[?@.k]')).toHaveLength(2); // k is "foo" or ""
		});
	});
});
