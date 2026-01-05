import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';
import { flushMicrotasks } from '../__fixtures__/helpers';

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
});
