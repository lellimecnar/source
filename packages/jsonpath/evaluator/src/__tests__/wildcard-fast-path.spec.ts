/**
 * Tests for the wildcard chain fast path optimization.
 * Verifies that wildcards at any position are handled correctly.
 */

import { describe, expect, it } from 'vitest';
import { Evaluator } from '../evaluator.js';
import { parse } from '@jsonpath/parser';

describe('Wildcard Chain Fast Path', () => {
	const store = {
		store: {
			book: [
				{ title: 'A', author: 'Author A', price: 10 },
				{ title: 'B', author: 'Author B', price: 20 },
				{ title: 'C', author: 'Author C', price: 30 },
			],
			bicycle: {
				color: 'red',
				price: 100,
			},
		},
	};

	it('handles root array wildcard: $[*]', () => {
		const data = ['a', 'b', 'c'];
		const ast = parse('$[*]');
		const evaluator = new Evaluator(data);
		const result = evaluator.evaluate(ast);

		expect(result.values()).toEqual(['a', 'b', 'c']);
		expect(result.paths()).toEqual([[0], [1], [2]]);
	});

	it('handles $.prop[*] pattern', () => {
		const ast = parse('$.store.book[*]');
		const evaluator = new Evaluator(store);
		const result = evaluator.evaluate(ast);

		expect(result.values()).toHaveLength(3);
		expect(result.values()).toEqual(store.store.book);
	});

	it('handles $[*].prop pattern', () => {
		const data = [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }];
		const ast = parse('$[*].name');
		const evaluator = new Evaluator(data);
		const result = evaluator.evaluate(ast);

		expect(result.values()).toEqual(['Alice', 'Bob', 'Charlie']);
	});

	it('handles $.a.b[*].c pattern', () => {
		const ast = parse('$.store.book[*].title');
		const evaluator = new Evaluator(store);
		const result = evaluator.evaluate(ast);

		expect(result.values()).toEqual(['A', 'B', 'C']);
	});

	it('handles multiple wildcards: $.a[*].b[*]', () => {
		const data = {
			items: [{ values: [1, 2] }, { values: [3, 4] }],
		};
		const ast = parse('$.items[*].values[*]');
		const evaluator = new Evaluator(data);
		const result = evaluator.evaluate(ast);

		expect(result.values()).toEqual([1, 2, 3, 4]);
	});

	it('handles object wildcard', () => {
		const data = { a: 1, b: 2, c: 3 };
		const ast = parse('$[*]');
		const evaluator = new Evaluator(data);
		const result = evaluator.evaluate(ast);

		expect(result.values()).toContain(1);
		expect(result.values()).toContain(2);
		expect(result.values()).toContain(3);
		expect(result.values()).toHaveLength(3);
	});

	it('computes correct paths for wildcards', () => {
		const ast = parse('$.store.book[*].title');
		const evaluator = new Evaluator(store);
		const result = evaluator.evaluate(ast);

		expect(result.paths()).toEqual([
			['store', 'book', 0, 'title'],
			['store', 'book', 1, 'title'],
			['store', 'book', 2, 'title'],
		]);
	});

	it('computes correct pointers for wildcards', () => {
		const ast = parse('$.store.book[*].title');
		const evaluator = new Evaluator(store);
		const result = evaluator.evaluate(ast);

		expect(result.pointerStrings()).toEqual([
			'/store/book/0/title',
			'/store/book/1/title',
			'/store/book/2/title',
		]);
	});

	it('handles negative index with wildcard', () => {
		const data = {
			items: [{ value: 'a' }, { value: 'b' }, { value: 'c' }],
		};
		const ast = parse('$.items[-1].value');
		const evaluator = new Evaluator(data);
		const result = evaluator.evaluate(ast);

		expect(result.values()).toEqual(['c']);
	});

	it('returns empty for non-matching wildcard chain', () => {
		const ast = parse('$.nonexistent[*].prop');
		const evaluator = new Evaluator(store);
		const result = evaluator.evaluate(ast);

		expect(result.values()).toEqual([]);
	});
});
