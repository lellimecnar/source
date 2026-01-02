import { describe, expect, it } from 'vitest';

import { removeAll, setAll } from './index';

describe('@jsonpath/mutate', () => {
	it('sets multiple pointers', () => {
		const root = { a: { b: 1 }, c: { d: 2 } };
		const next = setAll(root, ['/a/b', '/c/d'], 9) as any;
		expect((root as any).a.b).toBe(1);
		expect(next.a.b).toBe(9);
		expect(next.c.d).toBe(9);
	});

	it('removes multiple pointers', () => {
		const root = { a: { b: 1, c: 2 } };
		const next = removeAll(root, ['/a/b']) as any;
		expect((root as any).a.b).toBe(1);
		expect(next.a.b).toBeUndefined();
		expect(next.a.c).toBe(2);
	});
});
