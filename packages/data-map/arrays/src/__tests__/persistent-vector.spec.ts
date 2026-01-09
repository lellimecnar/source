import { describe, expect, it } from 'vitest';

import { PersistentVector } from '../persistent-vector.js';

describe('PersistentVector', () => {
	it('push/get/length works', () => {
		let v = new PersistentVector<number>();
		for (let i = 0; i < 100; i++) v = v.push(i);
		expect(v.length).toBe(100);
		expect(v.get(0)).toBe(0);
		expect(v.get(99)).toBe(99);
	});

	it('set returns a new vector and preserves original', () => {
		const v1 = new PersistentVector<number>([0, 1, 2]);
		const v2 = v1.set(1, 9);
		expect(v1.toArray()).toEqual([0, 1, 2]);
		expect(v2.toArray()).toEqual([0, 9, 2]);
	});

	it('slice returns a correct subvector', () => {
		const v = new PersistentVector<number>([0, 1, 2, 3, 4]);
		expect(v.slice(1, 4).toArray()).toEqual([1, 2, 3]);
	});
});
