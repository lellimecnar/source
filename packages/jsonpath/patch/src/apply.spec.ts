import { describe, expect, it } from 'vitest';

import { applyPatch } from './apply';

describe('@jsonpath/patch', () => {
	it('supports add/replace/remove', () => {
		const doc = { a: { b: 1 } };
		const out = applyPatch(doc, [
			{ op: 'replace', path: '/a/b', value: 2 },
			{ op: 'add', path: '/a/c', value: 3 },
			{ op: 'remove', path: '/a/b' },
		]);
		expect(out).toEqual({ a: { c: 3 } });
	});

	it('supports copy/move', () => {
		const doc = { a: { x: 1 }, b: {} };
		const out = applyPatch(doc, [
			{ op: 'copy', from: '/a/x', path: '/b/y' },
			{ op: 'move', from: '/a/x', path: '/b/z' },
		]);
		expect(out).toEqual({ a: {}, b: { y: 1, z: 1 } });
	});

	it('supports test', () => {
		const doc = { a: { b: 1 } };
		expect(() =>
			applyPatch(doc, [{ op: 'test', path: '/a/b', value: 2 }]),
		).toThrow(/failed/);
		expect(applyPatch(doc, [{ op: 'test', path: '/a/b', value: 1 }])).toEqual(
			doc,
		);
	});
});
