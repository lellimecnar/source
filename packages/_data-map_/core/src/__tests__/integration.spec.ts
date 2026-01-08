import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';
import { createEventSpy, flushMicrotasks } from '../__fixtures__/helpers';

describe('integration workflows', () => {
	it('supports read-modify-write cycle with subscriptions', async () => {
		const dm = new DataMap({ user: { name: 'Alice' } });
		const calls: string[] = [];
		dm.subscribe({
			path: '/user/name',
			after: 'set',
			fn: (v) => calls.push(String(v)),
		});

		dm.set('/user/name', (curr: unknown) => `${String(curr)}!`);
		await flushMicrotasks();
		expect(dm.get('/user/name')).toBe('Alice!');
		expect(calls).toContain('Alice!');
	});

	it('supports patch preview via toPatch (no immediate mutation)', () => {
		const dm = new DataMap({ a: 1 });
		const ops = dm.set.toPatch('/a', 2);
		expect(dm.get('/a')).toBe(1); // unchanged
		dm.patch(ops);
		expect(dm.get('/a')).toBe(2);
	});

	it('handles deeply nested objects (10+ levels)', () => {
		const deep: Record<string, any> = {};
		let node = deep;
		for (let i = 0; i < 12; i++) {
			node.next = {};
			node = node.next;
		}
		const dm = new DataMap(deep);
		dm.set('/next/next/next/value', 123);
		expect(dm.get('/next/next/next/value')).toBe(123);
	});

	it('maintains immutability across chained operations', () => {
		const initial = { items: [1, 2, 3] };
		const dm = new DataMap(initial);

		dm.push('/items', 4);
		dm.pop('/items');
		dm.shift('/items');

		// Original unchanged
		expect(initial.items).toEqual([1, 2, 3]);
		// DataMap has modified copy
		expect(dm.get('/items')).toEqual([2, 3]);
	});

	it('combines JSONPath queries with subscriptions', async () => {
		const dm = new DataMap({
			users: [
				{ name: 'Alice', active: true },
				{ name: 'Bob', active: false },
			],
		});

		const activeNames: string[] = [];
		dm.subscribe({
			path: '$.users[?(@.active == true)].name',
			after: 'set',
			fn: (v) => activeNames.push(String(v)),
		});

		dm.set('/users/0/name', 'Alicia');
		await flushMicrotasks();

		expect(activeNames).toContain('Alicia');
	});

	it('supports equals() comparison between DataMaps', () => {
		const dm1 = new DataMap({ a: 1, b: { c: 2 } });
		const dm2 = new DataMap({ a: 1, b: { c: 2 } });
		const dm3 = new DataMap({ a: 1, b: { c: 3 } });

		expect(dm1.equals(dm2)).toBe(true);
		expect(dm1.equals(dm3)).toBe(false);
	});

	it('supports extends() for partial matching', () => {
		const dm = new DataMap({ a: 1, b: { c: 2, d: 3 } });

		expect(dm.extends({ b: { c: 2 } })).toBe(true);
		expect(dm.extends({ b: { c: 99 } })).toBe(false);
	});

	it('subscription noPrecompile=true still works for JSONPath subscriptions', async () => {
		const dm = new DataMap({
			users: [
				{ name: 'Alice', active: true },
				{ name: 'Bob', active: false },
			],
		});

		const activeNames: string[] = [];
		dm.subscribe({
			path: '$.users[?(@.active == true)].name',
			noPrecompile: true,
			after: 'set',
			fn: (v) => activeNames.push(String(v)),
		});

		dm.set('/users/0/name', 'Alicia');
		await flushMicrotasks();

		expect(activeNames).toContain('Alicia');
	});

	it('resolveStream produces the same matches as resolve for JSONPath', () => {
		const dm = new DataMap({ users: [{ name: 'A' }, { name: 'B' }] });
		const fromResolve = dm.resolve('$.users[*].name');
		const fromStream = Array.from(dm.resolveStream('$.users[*].name'));
		expect(fromStream).toEqual(fromResolve);
	});

	it('supports fluent batch preview (toPatch) and apply() with correct notification scheduling', async () => {
		const dm = new DataMap({ a: 1, b: 1 });
		const spy = createEventSpy();

		dm.subscribe({
			path: '/a',
			after: 'set',
			fn: spy.fn,
		});

		const b = dm.batch.set('/a', 2).set('/b', 3);
		const ops = b.toPatch();
		expect(ops.length).toBeGreaterThan(0);
		expect(dm.get('/a')).toBe(1);
		expect(dm.get('/b')).toBe(1);

		b.apply();
		// after-handlers are scheduled via queueMicrotask
		expect(spy.events).toHaveLength(0);
		await flushMicrotasks();

		expect(dm.get('/a')).toBe(2);
		expect(dm.get('/b')).toBe(3);
		expect(spy.values).toContain(2);
	});

	it('batch() coalesces multi-op updates and updates multi-match paths (setAll + map)', async () => {
		const dm = new DataMap({
			users: [
				{ name: 'Alice', active: false },
				{ name: 'Bob', active: false },
			],
		});

		const seen: Array<{ value: unknown; pointer: string; stage: string }> = [];
		dm.subscribe({
			path: '/users/0/name',
			after: 'set',
			fn: (value, event) => {
				seen.push({ value, pointer: event.pointer, stage: event.stage });
			},
		});

		dm.batch((d) => {
			d.setAll('$.users[*].active', true);
			d.map('$.users[*].name', (v) => `${String(v)}!`);
		});

		// after-handlers should not have executed yet
		expect(seen).toHaveLength(0);
		await flushMicrotasks();

		expect(dm.get('/users/0/active')).toBe(true);
		expect(dm.get('/users/1/active')).toBe(true);
		expect(dm.get('/users/0/name')).toBe('Alice!');
		expect(dm.get('/users/1/name')).toBe('Bob!');

		expect(seen).toEqual([
			{ value: 'Alice!', pointer: '/users/0/name', stage: 'after' },
		]);
	});

	it('map() mapper receives JSON Pointer strings (not JSONPath) for each match', () => {
		const dm = new DataMap({ nums: [1, 2] });
		const pointers: string[] = [];

		dm.map('$.nums[*]', (v, pointer) => {
			pointers.push(pointer);
			return (v as number) + 1;
		});

		expect(pointers).toEqual(['/nums/0', '/nums/1']);
		expect(dm.get('/nums')).toEqual([2, 3]);
	});

	it('map.toPatch() generates operations without applying them', () => {
		const dm = new DataMap({ nums: [1, 2] });
		const ops = dm.map.toPatch('$.nums[*]', (v) => (v as number) * 10);
		expect(dm.get('/nums')).toEqual([1, 2]); // unchanged
		expect(ops.length).toBeGreaterThan(0);
		dm.patch(ops);
		expect(dm.get('/nums')).toEqual([10, 20]);
	});

	it('setAll.toPatch() generates operations without applying them', () => {
		const dm = new DataMap({ a: 1, b: 1 });
		const ops = dm.setAll.toPatch('$..*', 5);
		expect(dm.get('/a')).toBe(1); // unchanged
		expect(ops.length).toBeGreaterThan(0);
		dm.patch(ops);
		expect(dm.get('/a')).toBe(5);
		expect(dm.get('/b')).toBe(5);
	});

	it('fluent batch supports toPatch() preview and apply() with notification scheduling', async () => {
		const dm = new DataMap({ a: 1, b: 1 });
		const calls: unknown[] = [];

		dm.subscribe({
			path: '/a',
			after: 'set',
			fn: (v) => calls.push(v),
		});

		const batch = dm.batch.set('/a', 2).set('/b', 3);
		const ops = batch.toPatch();
		expect(ops.length).toBeGreaterThan(0);
		expect(dm.get('/a')).toBe(1);
		expect(dm.get('/b')).toBe(1);

		batch.apply();
		expect(calls).toHaveLength(0); // notifications not yet scheduled

		await flushMicrotasks();
		expect(dm.get('/a')).toBe(2);
		expect(dm.get('/b')).toBe(3);
		expect(calls).toContain(2);
	});

	it('transaction() rolls back state and does not schedule after-handlers on failure', async () => {
		const dm = new DataMap({ a: 1 });
		let afterCalls = 0;

		dm.subscribe({
			path: '/a',
			after: 'set',
			fn: () => {
				afterCalls++;
			},
		});

		expect(() =>
			dm.transaction((d) => {
				d.set('/a', 2);
				throw new Error('boom');
			}),
		).toThrow('boom');

		await flushMicrotasks();
		expect(dm.get('/a')).toBe(1);
		expect(afterCalls).toBe(0);
	});
});
