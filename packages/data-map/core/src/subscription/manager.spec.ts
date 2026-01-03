import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';
import { flushMicrotasks } from '../__fixtures__/helpers';

describe('subscription manager', () => {
	it('returns subscription with id and query', () => {
		const dm = new DataMap({ a: { b: 1 } });
		const sub = dm.subscribe({
			path: '/a/b',
			after: 'patch',
			fn: () => {},
		});

		expect(sub.id).toBeTruthy();
		expect(sub.query).toBe('/a/b');
	});

	it('cleans up on unsubscribe (no further notifications)', async () => {
		const dm = new DataMap({ a: 1 });
		const calls: string[] = [];
		const sub = dm.subscribe({
			path: '/a',
			after: 'patch',
			fn: () => calls.push('hit'),
		});

		sub.unsubscribe();
		dm.patch([{ op: 'replace', path: '/a', value: 2 }]);
		await flushMicrotasks();
		expect(calls).toEqual([]);
	});

	it('tracks isDynamic for wildcard patterns', () => {
		const dm = new DataMap({ users: [{ name: 'A' }] });
		const sub = dm.subscribe({
			path: '$.users[*].name',
			after: 'set',
			fn: () => {},
		});

		expect(sub.isDynamic).toBe(true);
	});

	it('tracks isDynamic=false for static pointers', () => {
		const dm = new DataMap({ a: 1 });
		const sub = dm.subscribe({
			path: '/a',
			after: 'set',
			fn: () => {},
		});

		expect(sub.isDynamic).toBe(false);
	});

	it('getMatchingSubscriptions returns both static and dynamic matches', () => {
		const dm = new DataMap({ a: 1 });
		const mgr = (dm as any)._subs;
		mgr.register({ path: '/a', fn: () => {} });
		mgr.register({ path: '$.*', fn: () => {} });

		const subs = mgr.getMatchingSubscriptions('/a');
		expect(subs.length).toBe(2);
	});
});
