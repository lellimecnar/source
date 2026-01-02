import { describe, expect, it } from 'vitest';

import { createUISpecStore } from './store';

describe('UISpecStore reads', () => {
	it('get() returns a single match value', () => {
		const store = createUISpecStore({ a: { b: 1 } });
		expect(store.get('$.a.b')).toBe(1);
	});

	it('get() throws when no matches', () => {
		const store = createUISpecStore({ a: { b: 1 } });
		expect(() => store.get('$.a.c')).toThrowError(/No match/i);
	});

	it('get() throws when multiple matches', () => {
		const store = createUISpecStore({ arr: [1, 2] });
		expect(() => store.get('$.arr[*]')).toThrowError(/Multiple matches/i);
	});

	it('select() emits initial + changes only', () => {
		const store = createUISpecStore({ count: 0 });
		const values: number[] = [];

		const unsubscribe = store
			.select<number>('$.count')
			.subscribe((v) => values.push(v));
		expect(values).toEqual([0]);

		store.patch([{ op: 'replace', path: '/count', value: 1 }]);
		store.patch([{ op: 'replace', path: '/count', value: 1 }]);
		store.patch([{ op: 'replace', path: '/count', value: 2 }]);

		expect(values).toEqual([0, 1, 2]);

		unsubscribe();
	});
});
