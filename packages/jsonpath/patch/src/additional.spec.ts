import { describe, expect, it } from 'vitest';

import { applyPatch } from './index';

describe('@jsonpath/patch (additional)', () => {
	it('replace updates selected nodes (immutably)', () => {
		const root = { a: 1 };
		const next = applyPatch(root, [
			{ op: 'replace', path: '/a', value: 3 },
		]) as any;
		expect(next).toEqual({ a: 3 });
		expect(root).toEqual({ a: 1 });
	});

	it('add is pointer-based', () => {
		const root = { a: 1 };
		const next = applyPatch(root, [{ op: 'add', path: '/b', value: 2 }]) as any;
		expect(next).toEqual({ a: 1, b: 2 });
	});

	it('remove deletes selected nodes', () => {
		const root = { a: 1, b: 2 };
		const next = applyPatch(root, [{ op: 'remove', path: '/b' }]) as any;
		expect(next).toEqual({ a: 1 });
	});

	it('copy copies from -> to', () => {
		const root = { a: { b: 1 }, c: 0 };
		const next = applyPatch(root, [
			{ op: 'copy', from: '/a/b', path: '/c' },
		]) as any;
		expect(next.c).toBe(1);
		expect(root.c).toBe(0);
	});

	it('move copies then removes from', () => {
		const root = { a: { b: 1 }, c: 0 };
		const next = applyPatch(root, [
			{ op: 'move', from: '/a/b', path: '/c' },
		]) as any;
		expect(next.c).toBe(1);
		expect(next.a).toEqual({});
	});

	it('test throws when values do not match', () => {
		expect(() =>
			applyPatch({ a: 1 }, [{ op: 'test', path: '/a', value: 2 }]),
		).toThrow(/JSON Patch test operation failed/);
	});
});
