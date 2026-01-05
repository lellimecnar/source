import { describe, it, expect } from 'vitest';
import { query } from '../src/facade.js';

describe('Plugins', () => {
	const data = {
		numbers: [1, 2, 3, 4, 5],
		obj: { a: 1, b: 2, c: 3 },
	};

	describe('Arithmetic Plugin', () => {
		it('should support add()', () => {
			const results = query(data, '$.numbers[?(@ == add(1, 1))]');
			expect(results.values()).toEqual([2]);
		});

		it('should support sub()', () => {
			const results = query(data, '$.numbers[?(@ == sub(5, 2))]');
			expect(results.values()).toEqual([3]);
		});

		it('should support mul()', () => {
			const results = query(data, '$.numbers[?(@ == mul(2, 2))]');
			expect(results.values()).toEqual([4]);
		});

		it('should support div()', () => {
			const results = query(data, '$.numbers[?(@ == div(10, 2))]');
			expect(results.values()).toEqual([5]);
		});
	});

	describe('Extras Plugin', () => {
		it('should support values()', () => {
			const results = query(data, '$[?(length(values(@)) == 3)]');
			expect(results.values()).toEqual([data.obj]);
		});

		it('should support unique()', () => {
			const dataWithDupes = { list: [1, 2, 2, 3, 3, 3] };
			const results = query(dataWithDupes, '$[?(length(unique(@)) == 3)]');
			expect(results.values()).toEqual([dataWithDupes.list]);
		});
	});
});
