import { describe, expect, it } from 'vitest';

import { applyPatch } from './index';
import type { JsonPathEngine } from '@jsonpath/core';

describe('@jsonpath/patch', () => {
	it('applies add/replace/remove operations using JSON Pointer', () => {
		const doc = { a: { b: 1, c: 0 }, xs: [1, 2, 3] };
		const next = applyPatch(doc, [
			{ op: 'replace', path: '/a/b', value: 2 },
			{ op: 'add', path: '/a/c', value: 3 },
			{ op: 'remove', path: '/xs/1' },
		]) as any;
		expect((doc as any).a.b).toBe(1);
		expect(next.a.b).toBe(2);
		expect(next.a.c).toBe(3);
		expect(next.xs).toEqual([1, 3]);
	});

	it('applies move/copy/test operations', () => {
		const doc = { a: 1, b: 2, c: null, d: null };
		const next = applyPatch(doc, [
			{ op: 'test', path: '/a', value: 1 },
			{ op: 'copy', from: '/a', path: '/c' },
			{ op: 'move', from: '/b', path: '/d' },
		]) as any;
		expect(next.a).toBe(1);
		expect(next.c).toBe(1);
		expect(next.d).toBe(2);
		expect(next.b).toBeUndefined();
	});

	it('throws on failed test', () => {
		const doc = { a: 1 };
		expect(() =>
			applyPatch(doc, [{ op: 'test', path: '/a', value: 2 }]),
		).toThrow('JSON Patch test operation failed');
	});
});
