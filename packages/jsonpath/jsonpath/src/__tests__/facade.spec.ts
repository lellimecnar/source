import { describe, it, expect } from 'vitest';
import { query, queryValues, queryPaths, compileQuery } from '../facade.js';

describe('JSONPath Facade', () => {
	const data = {
		store: {
			book: [
				{ title: 'Book 1', price: 10 },
				{ title: 'Book 2', price: 20 },
			],
		},
	};

	it('should execute query()', () => {
		const result = query(data, '$.store.book[*].price');
		expect(result.values()).toEqual([10, 20]);
		expect(result.normalizedPaths()).toEqual([
			'$.store.book[0].price',
			'$.store.book[1].price',
		]);
	});

	it('should execute queryValues()', () => {
		const values = queryValues(data, '$.store.book[*].title');
		expect(values).toEqual(['Book 1', 'Book 2']);
	});

	it('should execute queryPaths()', () => {
		const result = query(data, '$.store.book[*].title');
		expect(result.normalizedPaths()).toEqual([
			'$.store.book[0].title',
			'$.store.book[1].title',
		]);
	});

	it('should execute compileQuery()', () => {
		const q = compileQuery('$.store.book[0].price');
		expect(q(data).values()).toEqual([10]);
	});

	it('should use cache for repeated queries', () => {
		const path = '$.store.book[*].price';
		const result1 = query(data, path);
		const result2 = query(data, path);
		expect(result1.values()).toEqual(result2.values());
	});
});
