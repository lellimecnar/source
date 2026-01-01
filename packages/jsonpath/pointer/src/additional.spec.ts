import { describe, expect, it } from 'vitest';

import {
	getByPointer,
	parsePointer,
	removeByPointer,
	setByPointer,
} from './index';

describe('@jsonpath/pointer (additional)', () => {
	it('parses root and escaped segments', () => {
		expect(parsePointer('')).toEqual([]);
		expect(parsePointer('/a~1b/~0c')).toEqual(['a/b', '~c']);
	});

	it('setByPointer creates intermediate objects', () => {
		const next = setByPointer({}, '/a/b/c', 1) as any;
		expect(next).toEqual({ a: { b: { c: 1 } } });
	});

	it('removeByPointer is a no-op if the path does not exist', () => {
		const root = { a: { b: 1 } };
		const next = removeByPointer(root, '/a/missing') as any;
		expect(next).toEqual(root);
		// still immutable: containers may be cloned, but root should not be the same object
		expect(next).not.toBe(root);
	});

	it('removes array items by numeric index', () => {
		const root = { xs: [1, 2, 3] };
		const next = removeByPointer(root, '/xs/1') as any;
		expect(next.xs).toEqual([1, 3]);
		expect(root.xs).toEqual([1, 2, 3]);
	});

	it('getByPointer supports arrays and objects', () => {
		const root = { xs: [{ a: 1 }] };
		expect(getByPointer(root, '/xs/0/a')).toBe(1);
		expect(getByPointer(root, '/xs/2')).toBeUndefined();
	});
});
