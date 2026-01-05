import { describe, it, expect, beforeEach } from 'vitest';
import { evaluate } from '@jsonpath/evaluator';
import { parse } from '@jsonpath/parser';
import { arithmetic } from '../index.js';

describe('ArithmeticPlugin', () => {
	const data = [
		{
			a: 10,
			b: 5,
			c: 0,
			s: '10',
		},
	];

	beforeEach(() => {
		const plugin = arithmetic();
		(plugin as any).onRegister();
	});

	it('add works', () => {
		expect(
			evaluate(data, parse('$[?(add(@.a, @.b) == 15)]')).values(),
		).toHaveLength(1);
		expect(
			evaluate(data, parse('$[?(add(@.a, @.s) == 20)]')).values(),
		).toHaveLength(0);
	});

	it('sub works', () => {
		expect(
			evaluate(data, parse('$[?(sub(@.a, @.b) == 5)]')).values(),
		).toHaveLength(1);
	});

	it('mul works', () => {
		expect(
			evaluate(data, parse('$[?(mul(@.a, @.b) == 50)]')).values(),
		).toHaveLength(1);
	});

	it('div works', () => {
		expect(
			evaluate(data, parse('$[?(div(@.a, @.b) == 2)]')).values(),
		).toHaveLength(1);
		expect(
			evaluate(data, parse('$[?(div(@.a, @.c) == 0)]')).values(),
		).toHaveLength(0); // Division by zero returns Nothing
	});

	it('mod works', () => {
		expect(
			evaluate(data, parse('$[?(mod(@.a, @.b) == 0)]')).values(),
		).toHaveLength(1);
		expect(
			evaluate(data, parse('$[?(mod(@.a, 3) == 1)]')).values(),
		).toHaveLength(1);
	});
});
