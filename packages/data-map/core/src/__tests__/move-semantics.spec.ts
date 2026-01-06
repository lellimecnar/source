import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';
import { flushMicrotasks } from '../batch/batch.spec';

describe('move semantics', () => {
	it('treats move as remove(from) + set(to) (subscriptions are pointer-based)', async () => {
		const dm = new DataMap({ users: [{ id: 'u1' }], archived: [] as any[] });
		const calls: string[] = [];

		dm.subscribe({
			path: '/users/0',
			after: ['remove', 'set'],
			fn: (_v, e) => calls.push(`users:${e.type}:${e.pointer}`),
		});

		dm.subscribe({
			path: '/archived/0',
			after: ['remove', 'set'],
			fn: (_v, e) => calls.push(`archived:${e.type}:${e.pointer}`),
		});

		dm.patch([{ op: 'move', from: '/users/0', path: '/archived/0' }]);
		await flushMicrotasks();

		expect(calls).toContain('users:remove:/users/0');
		expect(calls).toContain('archived:set:/archived/0');
	});
});
