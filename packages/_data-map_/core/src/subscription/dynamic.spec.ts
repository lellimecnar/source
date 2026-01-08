import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';

const flushMicrotasks = () => new Promise((resolve) => queueMicrotask(resolve));

describe('dynamic subscriptions', () => {
	it('notifies when a matching pointer changes', async () => {
		const dm = new DataMap({ users: [{ name: 'A' }, { name: 'B' }] });
		const calls: string[] = [];

		dm.subscribe({
			path: '$.users[*].name',
			on: 'patch',
			fn: (_value, event) => {
				calls.push(event.pointer);
			},
		});

		dm.patch([{ op: 'replace', path: '/users/1/name', value: 'X' }]);
		expect(calls).toHaveLength(0);

		await flushMicrotasks();
		expect(calls).toEqual(['/users/1/name']);
	});

	it('re-expands on structural changes and notifies added matches', async () => {
		const dm = new DataMap({ users: [{ name: 'A' }] });
		const calls: string[] = [];

		dm.subscribe({
			path: '$.users[*].name',
			after: 'set',
			fn: (_value, event) => {
				calls.push(`${event.type}:${event.pointer}`);
			},
		});

		// structural change: add new user
		dm.patch([{ op: 'add', path: '/users/-', value: { name: 'B' } }]);

		expect(calls).toHaveLength(0);

		await flushMicrotasks();
		expect(calls).toContain('set:/users/1/name');
	});
});
