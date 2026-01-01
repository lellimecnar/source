import { describe, expect, it } from 'vitest';

import { removeAll, setAll } from './index';

describe('@jsonpath/mutate (additional)', () => {
	it('setAll applies pointers left-to-right (last write wins)', () => {
		const root = { a: 0, b: 0 };
		const next = setAll(root, ['/a', '/a', '/b'], 1) as any;
		expect(next).toEqual({ a: 1, b: 1 });
		expect(root).toEqual({ a: 0, b: 0 });
	});

	it('setAll can set nested values', () => {
		const next = setAll({}, ['/a/b', '/a/c'], 2) as any;
		expect(next).toEqual({ a: { b: 2, c: 2 } });
	});

	it('removeAll removes multiple pointers', () => {
		const root = { a: 1, b: 2, c: 3 };
		const next = removeAll(root, ['/a', '/c']) as any;
		expect(next).toEqual({ b: 2 });
		expect(root).toEqual({ a: 1, b: 2, c: 3 });
	});

	it('removeAll is safe on missing pointers', () => {
		const root = { a: 1 };
		const next = removeAll(root, ['/missing', '/a/missing']) as any;
		expect(next).toEqual({ a: 1 });
	});

	it('setAll and removeAll return new references when changes occur', () => {
		const root = { a: 1 };
		const nextSet = setAll(root, ['/a'], 2);
		expect(nextSet).not.toBe(root);
		const nextRemove = removeAll(root, ['/a']);
		expect(nextRemove).not.toBe(root);
	});
});
