import { describe, it, expect, vi } from 'vitest';
import { stream } from '../evaluator.js';
import { parse } from '@jsonpath/parser';
import { JSONPathTimeoutError } from '@jsonpath/core';

describe('Evaluator Stream', () => {
	it('should yield results incrementally', () => {
		const root = { a: [1, 2, 3] };
		const ast = parse('$.a[*]');
		const results = Array.from(stream(root, ast));
		expect(results).toHaveLength(3);
		expect(results[0].value).toBe(1);
		expect(results[1].value).toBe(2);
		expect(results[2].value).toBe(3);
	});

	it('should support early termination', () => {
		const root = { a: [1, 2, 3] };
		const ast = parse('$.a[*]');
		const generator = stream(root, ast);

		const first = generator.next();
		expect(first.value.value).toBe(1);

		// Terminate early by not calling next() anymore
		// In a real scenario, the generator would just be garbage collected or closed
	});

	it('should respect AbortSignal', () => {
		const root = { a: Array.from({ length: 100 }, (_, i) => i) };
		const ast = parse('$.a[*]');
		const controller = new AbortController();

		const generator = stream(root, ast, { signal: controller.signal });

		expect(generator.next().value.value).toBe(0);

		controller.abort();

		expect(() => generator.next()).toThrow(JSONPathTimeoutError);
	});

	it('should respect timeout', () => {
		const root = { a: Array.from({ length: 1000 }, (_, i) => i) };
		const ast = parse('$..*'); // Recursive descent to make it slow

		// We'll mock Date.now to simulate timeout
		const start = Date.now();
		vi.spyOn(Date, 'now')
			.mockReturnValueOnce(start) // startTime
			.mockReturnValueOnce(start + 100); // first checkLimits

		expect(() => Array.from(stream(root, ast, { timeout: 50 }))).toThrow(
			JSONPathTimeoutError,
		);

		vi.restoreAllMocks();
	});
});
