import { describe, it, expect } from 'vitest';
import {
	query,
	queryValues,
	queryPaths,
	compileQuery,
	value,
	first,
	exists,
	count,
	pointer,
	patch,
	mergePatch,
	toPointer,
	toPointers,
	PathBuilder,
} from '../index.js';
import { transform, omit } from '../transform.js';

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
			"$['store']['book'][0]['price']",
			"$['store']['book'][1]['price']",
		]);
	});

	it('should execute queryValues()', () => {
		const values = queryValues(data, '$.store.book[*].title');
		expect(values).toEqual(['Book 1', 'Book 2']);
	});

	it('should execute queryPaths()', () => {
		const result = query(data, '$.store.book[*].title');
		expect(result.normalizedPaths()).toEqual([
			"$['store']['book'][0]['title']",
			"$['store']['book'][1]['title']",
		]);
	});

	it('should execute compileQuery()', () => {
		const q = compileQuery('$.store.book[0].price');
		expect(q(data).values()).toEqual([10]);
	});

	it('should execute value()', () => {
		expect(value(data, '$.store.book[0].price')).toBe(10);
	});

	it('should execute first()', () => {
		expect(first(data, '$.store.book[0].price')).toBe(10);
	});

	it('should execute exists()', () => {
		expect(exists(data, '$.store.book[0].price')).toBe(true);
		expect(exists(data, '$.store.book[99].price')).toBe(false);
	});

	it('should execute count()', () => {
		expect(count(data, '$.store.book[*].price')).toBe(2);
	});

	it('should use cache for repeated queries', () => {
		const path = '$.store.book[*].price';
		const result1 = query(data, path);
		const result2 = query(data, path);
		expect(result1.values()).toEqual(result2.values());
	});

	it('should execute pointer()', () => {
		expect(pointer(data, '/store/book/0/price')).toBe(10);
	});

	it('should execute patch()', () => {
		const result = patch({ a: 1 }, [{ op: 'add', path: '/b', value: 2 }]);
		expect(result).toEqual({ a: 1, b: 2 });
	});

	it('should execute mergePatch()', () => {
		const result = mergePatch({ a: 1 }, { b: 2, a: null });
		expect(result).toEqual({ b: 2 });
	});

	it('should execute toPointer()', () => {
		expect(toPointer(data, '$.store.book[0].price')).toBe(
			'/store/book/0/price',
		);
	});

	it('should execute toPointers()', () => {
		expect(toPointers(data, '$.store.book[*].price')).toEqual([
			'/store/book/0/price',
			'/store/book/1/price',
		]);
	});

	it('should transform values', () => {
		const root = { a: 1, b: 2 };
		const result = transform(root, '$.*', (v) => v * 10);
		expect(result).toEqual({ a: 10, b: 20 });
	});

	it('should omit paths', () => {
		const root = { a: 1, b: 2, c: 3 };
		const result = omit(root, ['$.a', '$.c']);
		expect(result).toEqual({ b: 2 });
	});

	it('should expose PathBuilder', () => {
		const path = PathBuilder.root().child('a').index(0).toString();
		expect(path).toBe('$.a[0]');
	});
});
