import { describe, it, expect, vi } from 'vitest';
import { evaluate } from '../evaluator.js';
import { parse } from '@jsonpath/parser';

describe('Evaluator Security', () => {
	it('should enforce maxDepth', () => {
		const data: any = {};
		let curr = data;
		for (let i = 0; i < 10; i++) {
			curr.a = {};
			curr = curr.a;
		}

		// Should work with depth 10
		expect(() => evaluate(data, parse('$..*'), { maxDepth: 20 })).not.toThrow();

		// Should throw with depth 5
		expect(() => evaluate(data, parse('$..*'), { maxDepth: 5 })).toThrow(
			/Maximum depth exceeded/,
		);
	});

	it('should enforce maxResults', () => {
		const data = Array.from({ length: 100 }, (_, i) => i);

		// Should work with 100 results
		expect(
			evaluate(data, parse('$[*]'), { maxResults: 200 }).values().length,
		).toBe(100);

		// Should throw with 50 results
		expect(() => evaluate(data, parse('$[*]'), { maxResults: 50 })).toThrow(
			/Maximum results exceeded/,
		);
	});

	it('should detect circular references', () => {
		const data: any = { a: 1 };
		data.self = data;

		// Should throw when circular detection is enabled
		expect(() =>
			evaluate(data, parse('$..*'), { detectCircular: true }),
		).toThrow(/Circular reference detected/);

		// Should NOT throw when circular detection is disabled (but will hit maxDepth)
		expect(() =>
			evaluate(data, parse('$..*'), { detectCircular: false, maxDepth: 10 }),
		).toThrow(/Maximum depth exceeded/);
	});

	it('should enforce timeout', () => {
		const data = { a: 1 };
		// Mock Date.now to simulate time passing
		const start = Date.now();
		vi.spyOn(Date, 'now')
			.mockReturnValueOnce(start) // first call in Evaluator constructor
			.mockReturnValueOnce(start + 200); // second call in checkLimits

		expect(() => evaluate(data, parse('$'), { timeout: 100 })).toThrow(
			/Query timed out/,
		);
		vi.restoreAllMocks();
	});
});
