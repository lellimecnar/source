import { describe, it, expect } from 'vitest';
import baseline from '../baseline.json' assert { type: 'json' };
import { queryValues } from '@jsonpath/jsonpath';
import { applyPatch } from '@jsonpath/patch';
import { createMergePatch } from '@jsonpath/merge-patch';
import { Evaluator } from '@jsonpath/evaluator';
import { parse } from '@jsonpath/parser';
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

	it('patch single replace should not regress >10%', () => {
		const iterations = 1_000;
		const data = { a: 1, b: 2, c: 3 };
		const patch = [{ op: 'replace', path: '/a', value: 10 }] as any;

		const start = performance.now();
		for (let i = 0; i < iterations; i++) {
			// Clone data for each iteration to ensure consistent baseline
			applyPatch({ ...data }, patch);
		}
		const elapsed = performance.now() - start;
		const current = opsPerSec(iterations, elapsed);
		const threshold = baseline.patchSingleReplace.opsPerSec * 0.9;

		if (current < threshold) {
			console.warn(
				`⚠️ Patch single replace regression: ${current.toFixed(0)} ops/s < ${threshold.toFixed(0)} ops/s baseline`,
			);
		}

		// Warn-only: never fail CI
		expect(true).toBe(true);
	});

	it('patch batch 10 adds should not regress >10%', () => {
		const iterations = 500;
		const data = { a: 1 };
		const patch = Array.from({ length: 10 }, (_, i) => ({
			op: 'add',
			path: `/prop${i}`,
			value: i,
		})) as any;

		const start = performance.now();
		for (let i = 0; i < iterations; i++) {
			// Clone data for each iteration
			applyPatch({ ...data }, patch);
		}
		const elapsed = performance.now() - start;
		const current = opsPerSec(iterations, elapsed);
		const threshold = baseline.patchBatch10Adds.opsPerSec * 0.9;

		if (current < threshold) {
			console.warn(
				`⚠️ Patch batch regression: ${current.toFixed(0)} ops/s < ${threshold.toFixed(0)} ops/s baseline`,
			);
		}

		// Warn-only: never fail CI
		expect(true).toBe(true);
	});

	it('merge-patch generate should not regress >10%', () => {
		const iterations = 5_000;
		const source = {
			name: 'John',
			age: 30,
			address: { street: '123 Main', city: 'Boston' },
		};
		const target = {
			name: 'John',
			age: 31,
			address: { street: '123 Main', city: 'Boston' },
			phone: '555-1234',
		};

		const start = performance.now();
		for (let i = 0; i < iterations; i++) {
			createMergePatch(source, target);
		}
		const elapsed = performance.now() - start;
		const current = opsPerSec(iterations, elapsed);
		const threshold = baseline.mergePatchGenerate.opsPerSec * 0.9;

		if (current < threshold) {
			console.warn(
				`⚠️ Merge-patch regression: ${current.toFixed(0)} ops/s < ${threshold.toFixed(0)} ops/s baseline`,
			);
		}

		// Warn-only: never fail CI
		expect(true).toBe(true);
	});

	it('evaluator simple path should not regress >10%', () => {
		const iterations = 5_000;
		const ast = parse('$.store.book[0].title');
		const evaluator = new Evaluator(STORE_DATA);

		const start = performance.now();
		for (let i = 0; i < iterations; i++) {
			evaluator.evaluate(ast);
		}
		const elapsed = performance.now() - start;
		const current = opsPerSec(iterations, elapsed);
		const threshold = baseline.simpleQuery.opsPerSec * 0.9;

		if (current < threshold) {
			console.warn(
				`⚠️ Evaluator simple path regression: ${current.toFixed(0)} ops/s < ${threshold.toFixed(0)} ops/s baseline`,
			);
		}

		// Warn-only: never fail CI
		expect(true).toBe(true);
	});
});
