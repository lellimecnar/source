import { describe, expect, it } from 'vitest';

import jp, { query } from './index';

describe('@jsonpath/compat-jsonpath', () => {
	it('provides query, paths, and nodes', () => {
		const obj = { a: { b: 1 } };
		expect(query(obj, '$.a.b')).toEqual([1]);
		expect(jp.paths(obj, '$.a.b')).toEqual([['$', 'a', 'b']]);
		expect(jp.nodes(obj, '$.a.b')).toEqual([
			{ path: ['$', 'a', 'b'], value: 1 },
		]);
	});

	it('provides value (getter and setter)', () => {
		const obj = { a: { b: 1 } };
		expect(jp.value(obj, '$.a.b')).toBe(1);
		jp.value(obj, '$.a.b', 2);
		expect(obj.a.b).toBe(2);
	});

	it('provides parent', () => {
		const obj = { a: { b: 1 } };
		expect(jp.parent(obj, '$.a.b')).toEqual({ b: 1 });
	});
});
