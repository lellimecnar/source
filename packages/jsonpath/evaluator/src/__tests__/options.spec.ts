import { describe, it, expect, vi } from 'vitest';
import { parse } from '@jsonpath/parser';
import { evaluate } from '../evaluator.js';

describe('Evaluator Options', () => {
	const data = {
		a: {
			b: {
				c: 1,
			},
		},
		list: [1, 2, 3, 4, 5],
	};

	it('should enforce maxDepth', () => {
		const ast = parse('$.a.b.c');
		expect(() => evaluate(data, ast, { maxDepth: 1 })).toThrow(
			/Maximum depth exceeded/,
		);
		expect(evaluate(data, ast, { maxDepth: 3 }).values()).toEqual([1]);
	});

	it('should enforce maxResults', () => {
		const ast = parse('$.list[*]');
		expect(() => evaluate(data, ast, { maxResults: 2 })).toThrow(
			/Maximum results exceeded/,
		);
		expect(evaluate(data, ast, { maxResults: 5 }).values()).toEqual([
			1, 2, 3, 4, 5,
		]);
	});

	it('should enforce noRecursive', () => {
		const ast = parse('$..c');
		expect(() => evaluate(data, ast, { noRecursive: true })).toThrow(
			/Recursive descent is disabled/,
		);
	});

	it('should enforce noFilters', () => {
		const ast = parse('$.list[?(@ > 2)]');
		expect(() => evaluate(data, ast, { noFilters: true })).toThrow(
			/Filters are disabled/,
		);
	});

	it('should detect circular references', () => {
		const circular: any = { a: {} };
		circular.a.b = circular;

		const ast = parse('$..b');
		expect(() => evaluate(circular, ast, { detectCircular: true })).toThrow(
			/Circular reference detected/,
		);
	});

	it('should enforce timeout', () => {
		const ast = parse('$..*');
		const spy = vi.spyOn(Date, 'now');

		// 1st call: startTime in evaluate()
		// 2nd call: checkLimits in evaluateSegment (for root)
		// 3rd call: checkLimits in walkDescendants (for root)
		// 4th call: checkLimits in addResult (for 'a')
		spy
			.mockReturnValueOnce(1000)
			.mockReturnValueOnce(1000)
			.mockReturnValueOnce(1000)
			.mockReturnValueOnce(1100);

		expect(() => evaluate(data, ast, { timeout: 50 })).toThrow(
			/Query timed out/,
		);
		spy.mockRestore();
	});
});
