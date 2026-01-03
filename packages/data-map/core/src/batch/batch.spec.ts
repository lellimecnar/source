import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';

const flushMicrotasks = () => new Promise((resolve) => queueMicrotask(resolve));

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
});
