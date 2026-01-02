import { describe, expect, it } from 'vitest';

import { createUISpecStore } from './store';

describe('UISpecStore writes', () => {
	it('set() updates a scalar', () => {
		const store = createUISpecStore({ a: { b: 1 } });
		store.set('$.a.b', 2);
		expect(store.get('$.a.b')).toBe(2);
	});

	it('update() transforms a value', () => {
		const store = createUISpecStore({ count: 1 });
		store.update('$.count', (v) => Number(v) + 1);
		expect(store.get('$.count')).toBe(2);
	});

	it('merge() applies partial object changes', () => {
		const store = createUISpecStore({ obj: { a: 1 } });
		store.merge('$.obj', { a: 2, b: 3 });
		expect(store.get('$.obj')).toEqual({ a: 2, b: 3 });
	});

	it('push() appends items', () => {
		const store = createUISpecStore({ arr: [1] });
		store.push('$.arr', 2, 3);
		expect(store.get('$.arr')).toEqual([1, 2, 3]);
	});

	it('remove() filters items by predicate', () => {
		const store = createUISpecStore({ arr: [1, 2, 3, 4] });
		store.remove('$.arr', (x) => Number(x) % 2 === 0);
		expect(store.get('$.arr')).toEqual([1, 3]);
	});

	it('patch([...]) notifies subscribers once', () => {
		const store = createUISpecStore({ a: 1, b: 2 });
		let notifications = 0;
		const unsub = store.subscribe(() => {
			notifications += 1;
		});

		store.patch([
			{ op: 'replace', path: '/a', value: 10 },
			{ op: 'replace', path: '/b', value: 20 },
		]);
		expect(store.get('$.a')).toBe(10);
		expect(store.get('$.b')).toBe(20);
		expect(notifications).toBe(1);

		unsub();
	});

	it('patch() throws UISpecError on invalid operation', () => {
		const store = createUISpecStore({ a: 1 });
		expect(() => {
			store.patch([{ op: 'replace', path: '/nonexistent', value: 10 }]);
		}).toThrow(/Failed to apply JSON Patch/);
	});
});
