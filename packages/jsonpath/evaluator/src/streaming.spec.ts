import { describe, it, expect, vi } from 'vitest';
import { Evaluator } from './evaluator.js';
import { parse } from '@jsonpath/parser';

describe('Evaluator Streaming', () => {
	it('should be lazy and not visit all nodes if iterator is closed early', () => {
		const data = {
			a: [1, 2, 3, 4, 5],
			b: [6, 7, 8, 9, 10],
		};

		// Use a proxy to track property access
		const accessLog: string[] = [];
		const proxy = new Proxy(data, {
			get(target, prop) {
				if (typeof prop === 'string') {
					accessLog.push(prop);
				}
				return (target as any)[prop];
			},
		});

		const ast = parse('$.*.*');
		const evaluator = new Evaluator(proxy);
		const iterator = evaluator.stream(ast);

		// Get first result
		const first = iterator.next();
		expect(first.done).toBe(false);
		expect(first.value.value).toBe(1);

		// At this point, it should have accessed 'a' but not 'b'
		expect(accessLog).toContain('a');
		expect(accessLog).not.toContain('b');

		// Get second result
		const second = iterator.next();
		expect(second.done).toBe(false);
		expect(second.value.value).toBe(2);

		// Still shouldn't have accessed 'b'
		expect(accessLog).not.toContain('b');

		// Close iterator
		iterator.return?.();

		// Verify it never accessed 'b'
		expect(accessLog).not.toContain('b');
	});

	it('should respect maxResults during streaming', () => {
		const data = [1, 2, 3, 4, 5];
		const ast = parse('$.*');
		const evaluator = new Evaluator(data, { maxResults: 2 });
		const iterator = evaluator.stream(ast);

		expect(iterator.next().done).toBe(false);
		expect(iterator.next().done).toBe(false);
		expect(() => iterator.next()).toThrow(/Maximum results exceeded/);
	});

	it('should respect timeout during streaming', async () => {
		const data = Array.from({ length: 1000 }, (_, i) => i);
		const ast = parse('$..*'); // Recursive descent on large array is slow
		const evaluator = new Evaluator(data, { timeout: 1 }); // 1ms timeout

		// Wait a bit to ensure timeout
		await new Promise((resolve) => setTimeout(resolve, 10));

		const iterator = evaluator.stream(ast);
		expect(() => {
			for (const _ of iterator) {
			}
		}).toThrow(/Query timed out/);
	});
});
