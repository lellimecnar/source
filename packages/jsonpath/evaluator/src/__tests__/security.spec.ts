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

	it('should enforce maxNodes', () => {
		const data = { a: { b: { c: 1 } } };
		// Root + a + b + c = 4 nodes
		expect(() => evaluate(data, parse('$..*'), { maxNodes: 2 })).toThrow(
			/Maximum nodes visited exceeded/,
		);
	});

	it('should enforce maxFilterDepth', () => {
		const data = { a: 1, b: 2, c: 3 };
		// Deeply nested binary expressions
		const query = '$[?(@.a == 1 && (@.b == 2 && @.c == 3))]';
		// Depth 1: outer &&
		// Depth 2: inner &&
		// Depth 3: @.b == 2
		expect(() => evaluate(data, parse(query), { maxFilterDepth: 2 })).toThrow(
			/Maximum filter depth exceeded/,
		);
	});

	it('should enforce blockPaths', () => {
		const data = { public: 1, private: 2, nested: { secret: 3 } };
		const options = {
			secure: {
				blockPaths: ['/private', '/nested/secret'],
			},
		};

		const results = evaluate(data, parse('$..*'), options).pointerStrings();
		expect(results).toContain('/public');
		expect(results).toContain('/nested');
		expect(results).not.toContain('/private');
		expect(results).not.toContain('/nested/secret');
	});

	it('should enforce allowPaths', () => {
		const data = { public: 1, private: 2, nested: { allowed: 3, blocked: 4 } };
		const options = {
			secure: {
				allowPaths: ['/public', '/nested/allowed'],
			},
		};

		const results = evaluate(data, parse('$..*'), options).pointerStrings();
		expect(results).toContain('/public');
		expect(results).toContain('/nested');
		expect(results).toContain('/nested/allowed');
		expect(results).not.toContain('/private');
		expect(results).not.toContain('/nested/blocked');
	});
});
