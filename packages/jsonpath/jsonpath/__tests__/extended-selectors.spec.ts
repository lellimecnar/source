import { describe, it, expect } from 'vitest';
import { query } from '../src/facade.js';

describe('Extended Selectors', () => {
	const data = {
		store: {
			book: [
				{
					category: 'reference',
					author: 'Nigel Rees',
					title: 'Sayings of the Century',
					price: 8.95,
				},
				{
					category: 'fiction',
					author: 'Evelyn Waugh',
					title: 'Sword of Honour',
					price: 12.99,
				},
			],
			bicycle: { color: 'red', price: 19.95 },
		},
	};

	describe('Parent Selector (^)', () => {
		it('should return the parent of a matched node', () => {
			const results = query(data, '$.store.book[0]^');
			expect(results.values()).toEqual([data.store.book]);
		});

		it('should return the parent of multiple matched nodes', () => {
			const results = query(data, '$.store.book[*]^');
			// Both books have the same parent (the book array)
			// QueryResult should handle duplicates if needed, but here it returns the parent for each match
			expect(results.values()).toEqual([data.store.book, data.store.book]);
		});

		it('should work with recursive descent', () => {
			const results = query(data, '$..author^');
			expect(results.values()).toEqual([
				data.store.book[0],
				data.store.book[1],
			]);
		});
	});

	describe('Property Name Selector (~)', () => {
		it('should return the property name of a matched node', () => {
			const results = query(data, '$.store.bicycle.color~');
			expect(results.values()).toEqual(['color']);
		});

		it('should return property names for multiple matches', () => {
			const results = query(data, '$.store.book[*].author~');
			expect(results.values()).toEqual(['author', 'author']);
		});

		it('should work with wildcard', () => {
			const results = query(data, '$.store.bicycle.*~');
			expect(results.values().sort()).toEqual(['color', 'price'].sort());
		});
	});
});
