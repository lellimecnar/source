import { describe, expect, it } from 'vitest';

import { rfdcCloningAdapter } from './cloning.rfdc.js';

describe('rfdcCloningAdapter', () => {
	it('should pass smoke test', () => {
		expect(rfdcCloningAdapter.smokeTest()).toBe(true);
	});

	it('should deep clone objects', () => {
		const obj = { a: { b: { c: 1 } } };
		const cloned = rfdcCloningAdapter.clone(obj);

		expect(cloned).toEqual(obj);
		expect(cloned).not.toBe(obj);
		expect(cloned.a).not.toBe(obj.a);
		expect(cloned.a.b).not.toBe(obj.a.b);

		cloned.a.b.c = 999;
		expect(obj.a.b.c).toBe(1);
	});

	it('should handle circular references', () => {
		const obj: Record<string, unknown> = { a: 1 };
		obj.self = obj;

		const cloned = rfdcCloningAdapter.clone(obj);
		expect(cloned.a).toBe(1);
		expect(cloned.self).toBe(cloned);
		expect(cloned.self).not.toBe(obj);
	});

	it('should deep clone arrays', () => {
		const arr = [[1, 2], [3, 4], { nested: [5, 6] }];
		const cloned = rfdcCloningAdapter.clone(arr);

		expect(cloned).toEqual(arr);
		expect(cloned).not.toBe(arr);
	});
});
