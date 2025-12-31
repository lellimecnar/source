import { describe, expect, it } from 'vitest';

import { applyPatch } from './index';

describe('@jsonpath/patch', () => {
	it('applies add/replace/remove operations', () => {
		const doc = { a: { b: 1 }, xs: [1, 2, 3] };
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
});
