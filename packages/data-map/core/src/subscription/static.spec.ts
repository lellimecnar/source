import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';

const flushMicrotasks = () => new Promise((resolve) => queueMicrotask(resolve));

describe('static subscriptions', () => {
	it('notifies on patch stages', async () => {
		const dm = new DataMap({ a: { b: 1 } });
		const calls: string[] = [];

		dm.subscribe({
			path: '/a/b',
			before: 'patch',
			on: 'patch',
			after: 'patch',
			fn: (_value, event) => {
				calls.push(`${event.stage}:${event.type}:${event.pointer}`);
			},
		});

		dm.patch([{ op: 'replace', path: '/a/b', value: 2 }]);
		expect(calls).toEqual(['before:patch:/a/b']);

		await flushMicrotasks();
		expect(calls).toEqual([
			'before:patch:/a/b',
			'on:patch:/a/b',
			'after:patch:/a/b',
		]);
	});
});
