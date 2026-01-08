import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';

export const flushMicrotasks = () =>
	new Promise((resolve) => queueMicrotask(resolve));

describe('batching and transactions', () => {
	it('defers notifications until the end of a batch', async () => {
		const dm = new DataMap({ a: 1, b: 2 });
		const calls: string[] = [];

		dm.subscribe({
			path: '/a',
			after: 'set',
			fn: () => calls.push('a'),
		});
		dm.subscribe({
			path: '/b',
			after: 'set',
			fn: () => calls.push('b'),
		});

		dm.batch((d) => {
			d.set('/a', 10);
			d.set('/b', 20);
			expect(calls).toHaveLength(0);
		});

		expect(calls).toHaveLength(0);
		await flushMicrotasks();

		expect(calls).toContain('a');
		expect(calls).toContain('b');
		expect(calls).toHaveLength(2);
	});

	it('handles nested batches correctly', async () => {
		const dm = new DataMap({ a: 1 });
		const calls: string[] = [];

		dm.subscribe({
			path: '/a',
			after: 'set',
			fn: () => calls.push('a'),
		});

		dm.batch((d) => {
			d.batch((d2) => {
				d2.set('/a', 2);
			});
			expect(calls).toHaveLength(0);
		});

		expect(calls).toHaveLength(0);
		await flushMicrotasks();

		expect(calls).toEqual(['a']);
	});

	it('rolls back on transaction error', () => {
		const dm = new DataMap({ a: 1 });
		const calls: string[] = [];

		dm.subscribe({
			path: '/a',
			after: 'set',
			fn: (v) => calls.push(`a=${v}`),
		});

		try {
			dm.transaction((d) => {
				d.set('/a', 2);
				throw new Error('fail');
			});
		} catch {
			// ignore
		}

		expect(dm.get('/a')).toBe(1);
		expect(calls).toHaveLength(0);
	});

	it('supports fluent chaining with apply()', async () => {
		const dm = new DataMap({ a: 1, b: 2 });
		const calls: string[] = [];

		dm.subscribe({ path: '/a', after: 'set', fn: () => calls.push('a') });
		dm.subscribe({ path: '/b', after: 'set', fn: () => calls.push('b') });

		dm.batch.set('/a', 10).set('/b', 20).apply();
		expect(dm.get('/a')).toBe(10);
		expect(dm.get('/b')).toBe(20);
		expect(calls).toHaveLength(0);

		await flushMicrotasks();
		expect(calls).toEqual(['a', 'b']);
	});

	it('toPatch() returns operations without applying them', () => {
		const dm = new DataMap({ a: 1 });
		const ops = dm.batch.set('/a', 2).set('/b', 3).toPatch();

		expect(dm.get('/a')).toBe(1);
		expect(dm.get('/b')).toBeUndefined();
		expect(ops).toEqual([
			{ op: 'replace', path: '/a', value: 2 },
			{ op: 'add', path: '/b', value: 3 },
		]);
	});
});
