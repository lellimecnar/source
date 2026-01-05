import { describe, it, expect, beforeEach } from 'vitest';
import { evaluate } from '@jsonpath/evaluator';
import { parse } from '@jsonpath/parser';
import { extras } from '../index.js';

describe('ExtrasPlugin', () => {
	const data = [
		{
			obj: { a: 1, b: 2 },
			arr: [
				[1, 2],
				[3, 4],
			],
			dup: [1, 2, 1, 3, 2],
			str: 'hello world',
			numbers: [3, 1, 4, 1, 5, 9],
		},
	];

	beforeEach(() => {
		const plugin = extras();
		(plugin as any).onRegister();
	});

	// ========== String Functions ==========

	it('starts_with works', () => {
		const result = evaluate(
			data,
			parse('$[?(starts_with(@.str, "hello"))]'),
		).values();
		expect(result).toHaveLength(1);
	});

	it('ends_with works', () => {
		const result = evaluate(
			data,
			parse('$[?(ends_with(@.str, "world"))]'),
		).values();
		expect(result).toHaveLength(1);
	});

	it('contains works for strings', () => {
		const result = evaluate(
			data,
			parse('$[?(contains(@.str, "lo"))]'),
		).values();
		expect(result).toHaveLength(1);
	});

	it('contains works for arrays', () => {
		const result = evaluate(
			data,
			parse('$[?(contains(@.numbers, 5))]'),
		).values();
		expect(result).toHaveLength(1);
	});

	it('lower works', () => {
		const result = evaluate(
			[{ test: 'HELLO' }],
			parse('$[?(lower(@.test) == "hello")]'),
		).values();
		expect(result).toHaveLength(1);
	});

	it('upper works', () => {
		const result = evaluate(
			[{ test: 'hello' }],
			parse('$[?(upper(@.test) == "HELLO")]'),
		).values();
		expect(result).toHaveLength(1);
	});

	it('trim works', () => {
		const result = evaluate(
			[{ test: '  hello  ' }],
			parse('$[?(trim(@.test) == "hello")]'),
		).values();
		expect(result).toHaveLength(1);
	});

	it('substring works with 2 args', () => {
		const result = evaluate(
			[{ test: 'hello' }],
			parse('$[?(substring(@.test, 1, 4) == "ell")]'),
		).values();
		expect(result).toHaveLength(1);
	});

	it('split works', () => {
		const result = evaluate(
			data,
			parse('$[?(length(split(@.str, " ")) == 2)]'),
		).values();
		expect(result).toHaveLength(1);
	});

	// ========== Array/Object Functions ==========

	it('keys works', () => {
		const result = evaluate(
			data,
			parse('$[?(length(keys(@.obj)) == 2)]'),
		).values();
		expect(result).toHaveLength(1);
	});

	it('values works', () => {
		const result = evaluate(
			data,
			parse('$[?(length(values(@.obj)) == 2)]'),
		).values();
		expect(result).toHaveLength(1);
	});

	it('entries works', () => {
		const result = evaluate(
			data,
			parse('$[?(length(entries(@.obj)) == 2)]'),
		).values();
		expect(result).toHaveLength(1);
	});

	it('first works', () => {
		const result = evaluate(
			data,
			parse('$[?(first(@.numbers) == 3)]'),
		).values();
		expect(result).toHaveLength(1);
	});

	it('last works', () => {
		const result = evaluate(data, parse('$[?(last(@.numbers) == 9)]')).values();
		expect(result).toHaveLength(1);
	});

	it('reverse works', () => {
		const result = evaluate(
			[{ arr: [1, 2, 3] }],
			parse('$[?(length(reverse(@.arr)) == 3)]'),
		).values();
		expect(result).toHaveLength(1);
	});

	it('sort works', () => {
		const result = evaluate(
			data,
			parse('$[?(first(sort(@.numbers)) == 1)]'),
		).values();
		expect(result).toHaveLength(1);
	});

	it('unique works', () => {
		const result = evaluate(
			data,
			parse('$[?(length(unique(@.dup)) == 3)]'),
		).values();
		expect(result).toHaveLength(1);
	});

	it('flatten works', () => {
		const result = evaluate(
			data,
			parse('$[?(length(flatten(@.arr)) == 4)]'),
		).values();
		expect(result).toHaveLength(1);
	});

	// ========== Aggregation Functions ==========

	it('min works', () => {
		const result = evaluate(data, parse('$[?(min(@.numbers) == 1)]')).values();
		expect(result).toHaveLength(1);
	});

	it('max works', () => {
		const result = evaluate(data, parse('$[?(max(@.numbers) == 9)]')).values();
		expect(result).toHaveLength(1);
	});

	it('sum works', () => {
		const result = evaluate(data, parse('$[?(sum(@.numbers) == 23)]')).values();
		expect(result).toHaveLength(1);
	});

	it('avg works', () => {
		const result = evaluate(
			[{ nums: [2, 4, 6] }],
			parse('$[?(avg(@.nums) == 4)]'),
		).values();
		expect(result).toHaveLength(1);
	});

	// ========== Utility Functions ==========

	it('floor works', () => {
		const result = evaluate(
			[{ num: 3.7 }],
			parse('$[?(floor(@.num) == 3)]'),
		).values();
		expect(result).toHaveLength(1);
	});

	it('ceil works', () => {
		const result = evaluate(
			[{ num: 3.2 }],
			parse('$[?(ceil(@.num) == 4)]'),
		).values();
		expect(result).toHaveLength(1);
	});

	it('round works', () => {
		const result = evaluate(
			[{ num: 3.5 }],
			parse('$[?(round(@.num) == 4)]'),
		).values();
		expect(result).toHaveLength(1);
	});

	it('abs works', () => {
		const result = evaluate(
			[{ num: -5 }],
			parse('$[?(abs(@.num) == 5)]'),
		).values();
		expect(result).toHaveLength(1);
	});

	// ========== Type Error Tests ==========

	it('returns false/Nothing for invalid types', () => {
		const testData = {
			value: 42,
		};

		// starts_with with non-string should return false
		const result1 = evaluate(
			[testData],
			parse('$[?(starts_with(@.value, "test"))]'),
		).values();
		expect(result1).toHaveLength(0);

		// upper with non-string should return Nothing
		const result2 = evaluate(
			[testData],
			parse('$[?(upper(@.value) == "HELLO")]'),
		).values();
		expect(result2).toHaveLength(0);
	});

	// ========== Edge Cases ==========

	it('handles empty arrays in aggregation functions', () => {
		const result = evaluate(
			{ empty: [] },
			parse('$.empty[?length(@) > 0]'),
		).values();
		expect(result).toHaveLength(0);
	});

	it('handles single element arrays', () => {
		const result = evaluate(
			[{ single: [42] }],
			parse('$[?(first(@.single) == 42)]'),
		).values();
		expect(result).toHaveLength(1);
	});

	it('unique preserves non-primitive types', () => {
		const result = evaluate(
			[{ items: [{ a: 1 }, { a: 1 }, { b: 2 }] }],
			parse('$[?(length(unique(@.items)) == 2)]'),
		).values();
		expect(result).toHaveLength(1);
	});
});
