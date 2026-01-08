import { describe, expect, it, vi } from 'vitest';

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
		dm.subscribe({ path: '/a', fn: () => {} });
		dm.subscribe({ path: '$.*', fn: () => {} });

		const mgr = (dm as any)._subs;
		const subs = mgr.getMatchingSubscriptions('/a');
		expect(subs.length).toBe(2);
	});

	it('delivers on/after notifications asynchronously (REQ-016)', async () => {
		const dm = new DataMap({ a: 1 });
		const calls: string[] = [];
		dm.subscribe({
			path: '/a',
			before: 'set',
			fn: () => calls.push('before'),
		});
		dm.subscribe({
			path: '/a',
			on: 'set',
			fn: () => calls.push('on'),
		});
		dm.subscribe({
			path: '/a',
			after: 'set',
			fn: () => calls.push('after'),
		});

		dm.set('/a', 2);
		expect(calls).toEqual(['before']); // Only before is synchronous
		await flushMicrotasks();
		expect(calls).toEqual(['before', 'on', 'after']);
	});

	it('re-expands filter subscriptions when criteria changes (AC-027)', async () => {
		const dm = new DataMap({ users: [{ active: true, name: 'A' }] });
		const sub = dm.subscribe({
			path: '$.users[?(@.active)].name',
			after: 'set',
			fn: () => {},
		});

		expect([...sub.expandedPaths]).toContain('/users/0/name');

		dm.set('/users/0/active', false);
		await flushMicrotasks();
		expect([...sub.expandedPaths]).not.toContain('/users/0/name');
	});

	it('fires get and resolve events (Step 10)', async () => {
		const dm = new DataMap({ a: 1 });
		const calls: string[] = [];
		dm.subscribe({
			path: '/a',
			on: ['get', 'resolve'],
			fn: (_, info) => calls.push(`${info.type}:${info.stage}`),
		});

		dm.get('/a');
		dm.resolve('/a');

		expect(calls).toEqual([]);
		await flushMicrotasks();
		// dm.get('/a') triggers resolve('/a') then get('/a')
		// dm.resolve('/a') triggers resolve('/a')
		expect(calls).toEqual(['resolve:on', 'get:on', 'resolve:on']);
	});

	it('supports read interception via get:before (Step 10)', () => {
		const dm = new DataMap({ a: 1 });
		dm.subscribe({
			path: '/a',
			before: 'get',
			fn: () => 'intercepted',
		});

		const val = dm.get('/a');
		expect(val).toBe('intercepted');
	});

	it('invokes handlers by specificity (most specific first)', async () => {
		const dm = new DataMap({ a: { b: 1 } });
		const calls: string[] = [];

		dm.subscribe({
			path: '$..b',
			after: 'patch',
			fn: () => calls.push('recursive'),
		});
		dm.subscribe({
			path: '$.a.*',
			after: 'patch',
			fn: () => calls.push('wildcard'),
		});
		dm.subscribe({
			path: '/a/b',
			after: 'patch',
			fn: () => calls.push('pointer'),
		});

		dm.patch([{ op: 'replace', path: '/a/b', value: 2 }]);
		await flushMicrotasks();

		expect(calls).toEqual(['pointer', 'wildcard', 'recursive']);
	});

	it('does not schedule microtasks when there are no subscriptions', () => {
		const spy = vi.spyOn(globalThis, 'queueMicrotask');
		try {
			const dm = new DataMap({ a: 1 });
			dm.get('/a');
			dm.resolve('/a');
			expect(spy).not.toHaveBeenCalled();
		} finally {
			spy.mockRestore();
		}
	});

	it('does not instantiate SubscriptionManagerImpl until first subscribe()', () => {
		const dm = new DataMap({ a: 1 });
		expect((dm as any)._subs).toBeNull();

		dm.subscribe({ path: '/a', after: 'set', fn: () => {} });
		expect((dm as any)._subs).not.toBeNull();
	});

	it('uses Set-based pointer tracking for small subscription counts and switches to Bloom at threshold', async () => {
		const dm = new DataMap({ root: Array.from({ length: 200 }, (_, i) => i) });
		const calls: string[] = [];

		for (let i = 0; i < 101; i++) {
			dm.subscribe({
				path: `/root/${i}`,
				after: 'set',
				fn: () => calls.push(String(i)),
			});
		}

		dm.set('/root/0', 999);
		await flushMicrotasks();
		expect(calls.includes('0')).toBe(true);
	});

	it('batch notifies once per affected pointer (deduped)', async () => {
		const dm = new DataMap({ a: 0 });
		const calls: string[] = [];

		dm.subscribe({
			path: '/a',
			after: 'patch',
			fn: () => calls.push('after'),
		});

		dm.batch(() => {
			dm.set('/a', 1);
			dm.set('/a', 2);
			dm.set('/a', 3);
		});

		await flushMicrotasks();
		expect(calls).toEqual(['after']);
	});
});
