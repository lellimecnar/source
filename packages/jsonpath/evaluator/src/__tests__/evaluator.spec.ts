import { describe, it, expect } from 'vitest';
import { parse } from '@jsonpath/parser';
import { evaluate } from '../evaluator.js';

describe('Evaluator', () => {
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
				{
					category: 'fiction',
					author: 'Herman Melville',
					title: 'Moby Dick',
					isbn: '0-553-21311-3',
					price: 8.99,
				},
				{
					category: 'fiction',
					author: 'J. R. R. Tolkien',
					title: 'The Lord of the Rings',
					isbn: '0-395-19395-8',
					price: 22.99,
				},
			],
			bicycle: { color: 'red', price: 19.95 },
		},
	};

	it('should evaluate simple name selectors', () => {
		const ast = parse('$.store.bicycle.color');
		const result = evaluate(data, ast);
		expect(result.values()).toEqual(['red']);
	});

	it('should evaluate index selectors', () => {
		const ast = parse('$.store.book[0].title');
		const result = evaluate(data, ast);
		expect(result.values()).toEqual(['Sayings of the Century']);
	});

	it('should evaluate wildcard selectors', () => {
		const ast = parse('$.store.bicycle.*');
		const result = evaluate(data, ast);
		expect(result.values()).toContain('red');
		expect(result.values()).toContain(19.95);
	});

	it('should evaluate descendant segments', () => {
		const ast = parse('$..price');
		const result = evaluate(data, ast);
		expect(result.values()).toEqual([8.95, 12.99, 8.99, 22.99, 19.95]);
	});

	it('should evaluate slices', () => {
		const ast = parse('$.store.book[1:3].title');
		const result = evaluate(data, ast);
		expect(result.values()).toEqual(['Sword of Honour', 'Moby Dick']);
	});

	it('should evaluate filter expressions', () => {
		const ast = parse('$.store.book[?(@.price < 10)].title');
		const result = evaluate(data, ast);
		expect(result.values()).toEqual(['Sayings of the Century', 'Moby Dick']);
	});

	it('should evaluate complex filter expressions', () => {
		const ast = parse(
			'$.store.book[?(@.category == "fiction" && @.price < 10)].title',
		);
		const result = evaluate(data, ast);
		expect(result.values()).toEqual(['Moby Dick']);
	});

	it('should evaluate function calls in filters', () => {
		const ast = parse('$.store.book[?(length(@.title) > 10)].title');
		const result = evaluate(data, ast);
		expect(result.values()).toContain('Sayings of the Century');
		expect(result.values()).toContain('Sword of Honour');
		expect(result.values()).toContain('The Lord of the Rings');
	});

	it('should handle negative indices and steps in slices', () => {
		const list = [0, 1, 2, 3, 4, 5];
		// Last two elements
		expect(evaluate(list, parse('$[-2:]')).values()).toEqual([4, 5]);
		// Every second element
		expect(evaluate(list, parse('$[::2]')).values()).toEqual([0, 2, 4]);
		// Reverse
		expect(evaluate(list, parse('$[::-1]')).values()).toEqual([
			5, 4, 3, 2, 1, 0,
		]);
		// Reverse with start/end
		expect(evaluate(list, parse('$[4:1:-1]')).values()).toEqual([4, 3, 2]);
		// Out of bounds
		expect(evaluate(list, parse('$[0:100]')).values()).toEqual([
			0, 1, 2, 3, 4, 5,
		]);
		expect(evaluate(list, parse('$[-100:100]')).values()).toEqual([
			0, 1, 2, 3, 4, 5,
		]);
	});

	it('should handle RFC 9535 slice edge cases', () => {
		const list = ['a', 'b', 'c'];
		// start > end with positive step -> empty
		expect(evaluate(list, parse('$[2:1:1]')).values()).toEqual([]);
		// start < end with negative step -> empty
		expect(evaluate(list, parse('$[1:2:-1]')).values()).toEqual([]);
		// start == end -> empty
		expect(evaluate(list, parse('$[1:1]')).values()).toEqual([]);
	});

	it('should handle various comparison operators', () => {
		const data = [{ val: 10 }, { val: 20 }, { val: 30 }];
		expect(evaluate(data, parse('$[?(@.val != 10)]')).values()).toEqual([
			{ val: 20 },
			{ val: 30 },
		]);
		expect(evaluate(data, parse('$[?(@.val >= 20)]')).values()).toEqual([
			{ val: 20 },
			{ val: 30 },
		]);
		expect(evaluate(data, parse('$[?(@.val <= 20)]')).values()).toEqual([
			{ val: 10 },
			{ val: 20 },
		]);
		expect(evaluate(data, parse('$[?(@.val < 15)]')).values()).toEqual([
			{ val: 10 },
		]);
	});

	it('should handle count() and value() functions', () => {
		const data = [{ items: [1, 2, 3] }, { items: [1] }];
		// Select objects where items count > 2
		expect(evaluate(data, parse('$[?(count(@.items) > 2)]')).values()).toEqual([
			{ items: [1, 2, 3] },
		]);
	});
});
