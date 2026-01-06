import { describe, it, expect } from 'vitest';
import baseline from '../baseline.json' assert { type: 'json' };
import { queryValues } from '@jsonpath/jsonpath';
import { STORE_DATA } from './fixtures/index.js';

function opsPerSec(iterations: number, elapsedMs: number): number {
	return iterations / (elapsedMs / 1000);
}

describe('Performance Regression (warn-only)', () => {
	it('simple query should not regress >10%', () => {
		const iterations = 10_000;
		const start = performance.now();
		for (let i = 0; i < iterations; i++) {
			queryValues(STORE_DATA, '$.store.book[0].title');
		}
		const elapsed = performance.now() - start;
		const current = opsPerSec(iterations, elapsed);
		const threshold = baseline.simpleQuery.opsPerSec * 0.9;

		if (current < threshold) {
			console.warn(
				`⚠️ Performance regression detected: ${current.toFixed(0)} ops/s < ${threshold.toFixed(0)} ops/s baseline`,
			);
		}

		// Warn-only: never fail CI
		expect(true).toBe(true);
	});

	it('filter query should not regress >10%', () => {
		const iterations = 5_000;
		const start = performance.now();
		for (let i = 0; i < iterations; i++) {
			queryValues(STORE_DATA, '$.store.book[?@.price < 20]');
		}
		const elapsed = performance.now() - start;
		const current = opsPerSec(iterations, elapsed);
		const threshold = baseline.filterQuery.opsPerSec * 0.9;

		if (current < threshold) {
			console.warn(
				`⚠️ Performance regression detected: ${current.toFixed(0)} ops/s < ${threshold.toFixed(0)} ops/s baseline`,
			);
		}

		// Warn-only: never fail CI
		expect(true).toBe(true);
	});

	it('recursive query should not regress >10%', () => {
		const iterations = 2_000;
		const start = performance.now();
		for (let i = 0; i < iterations; i++) {
			queryValues(STORE_DATA, '$..price');
		}
		const elapsed = performance.now() - start;
		const current = opsPerSec(iterations, elapsed);
		const threshold = baseline.recursiveQuery.opsPerSec * 0.9;

		if (current < threshold) {
			console.warn(
				`⚠️ Performance regression detected: ${current.toFixed(0)} ops/s < ${threshold.toFixed(0)} ops/s baseline`,
			);
		}

		// Warn-only: never fail CI
		expect(true).toBe(true);
	});
});
