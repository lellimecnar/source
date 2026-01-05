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
		},
	];

	beforeEach(() => {
		const plugin = extras();
		(plugin as any).onRegister();
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

	it('flatten works', () => {
		const result = evaluate(
			data,
			parse('$[?(length(flatten(@.arr)) == 4)]'),
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
});
