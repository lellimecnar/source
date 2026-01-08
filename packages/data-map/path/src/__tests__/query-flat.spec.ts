import { describe, expect, it } from 'vitest';
import { FlatStore } from '@data-map/storage';

import { queryFlat } from '../query.js';

describe('@data-map/path queryFlat', () => {
	it('fast-path: resolves simple pointer-like JSONPath without full materialization', () => {
		const inner = new FlatStore({
			users: [{ name: 'Alice' }, { name: 'Bob' }],
		});

		const store = {
			get: (p: string) => inner.get(p),
			has: (p: string) => inner.has(p),
			keys: (prefix?: string) => inner.keys(prefix),
			getObject: (_p: string) => {
				throw new Error('getObject should not be used for this query');
			},
		};

		const res = queryFlat(store, '$.users[*].name');
		expect(res.values).toEqual(['Alice', 'Bob']);
		expect(res.pointers).toEqual(['/users/0/name', '/users/1/name']);
	});

	it('fast-path: can return container values via localized getObject()', () => {
		const inner = new FlatStore({
			users: [{ name: 'Alice' }, { name: 'Bob' }],
		});

		let getObjectCalls = 0;
		const store = {
			get: (p: string) => inner.get(p),
			has: (p: string) => inner.has(p),
			keys: (prefix?: string) => inner.keys(prefix),
			getObject: (p: string) => {
				getObjectCalls++;
				return inner.getObject(p);
			},
		};

		const res = queryFlat(store, '$.users[*]');
		expect(res.pointers).toEqual(['/users/0', '/users/1']);
		expect(res.values).toEqual([{ name: 'Alice' }, { name: 'Bob' }]);
		expect(getObjectCalls).toBe(2);
	});

	it("fallback: complex JSONPath uses full subtree reconstruction via getObject('')", () => {
		const inner = new FlatStore({
			users: [{ name: 'Alice' }, { name: 'Bob' }],
		});

		let getObjectCalls = 0;
		const store = {
			get: (p: string) => inner.get(p),
			has: (p: string) => inner.has(p),
			keys: (prefix?: string) => inner.keys(prefix),
			getObject: (p: string) => {
				getObjectCalls++;
				return inner.getObject(p);
			},
		};

		const res = queryFlat(store, '$.users[?(@.name=="Alice")].name');
		expect(res.values).toEqual(['Alice']);
		expect(res.pointers).toEqual(['/users/0/name']);
		expect(getObjectCalls).toBe(1);
	});
});
