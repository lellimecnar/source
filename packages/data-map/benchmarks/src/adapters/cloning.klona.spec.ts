import { describe, expect, it } from 'vitest';

import { klonaCloningAdapter } from './cloning.klona.js';

describe('klonaCloningAdapter', () => {
	it('should pass smoke test', () => {
		expect(klonaCloningAdapter.smokeTest()).toBe(true);
	});

	it('should deep clone objects', () => {
		const obj = { a: { b: { c: 1 } } };
		const cloned = klonaCloningAdapter.clone(obj);

		expect(cloned).toEqual(obj);
		expect(cloned).not.toBe(obj);
		expect(cloned.a).not.toBe(obj.a);
		expect(cloned.a.b).not.toBe(obj.a.b);

		cloned.a.b.c = 999;
		expect(obj.a.b.c).toBe(1);
	});

	it('should deep clone arrays', () => {
		const arr = [[1, 2], [3, 4], { nested: [5, 6] }];
		const cloned = klonaCloningAdapter.clone(arr);

		expect(cloned).toEqual(arr);
		expect(cloned).not.toBe(arr);
		expect(cloned[0]).not.toBe(arr[0]);
	});

	it('should clone primitives', () => {
		expect(klonaCloningAdapter.clone(42)).toBe(42);
		expect(klonaCloningAdapter.clone('hello')).toBe('hello');
		expect(klonaCloningAdapter.clone(true)).toBe(true);
		expect(klonaCloningAdapter.clone(null)).toBe(null);
	});
});
