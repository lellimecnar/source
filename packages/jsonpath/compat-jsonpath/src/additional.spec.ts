import { describe, expect, it } from 'vitest';

import { apply, nodes, parent, paths, query, value } from './index';

describe('@jsonpath/compat-jsonpath (additional)', () => {
	it('query() returns values', () => {
		expect(query({ a: 1 }, '$.a')).toEqual([1]);
	});

	it('paths() returns compat path arrays', () => {
		const out = paths({ a: { b: 1 } }, '$.a.b');
		expect(out).toEqual([['$', 'a', 'b']]);
	});

	it('nodes() returns { path, value } records', () => {
		const out = nodes({ a: { b: 1 } }, '$.a.b');
		expect(out).toEqual([{ path: ['$', 'a', 'b'], value: 1 }]);
	});

	it('value() reads first match and can set (mutating input for compat)', () => {
		const obj: any = { a: { b: 1 } };
		expect(value(obj, '$.a.b')).toBe(1);
		value(obj, '$.a.b', 2);
		expect(obj.a.b).toBe(2);
	});

	it('parent() returns the parent object for a match', () => {
		const obj: any = { a: { b: 1 } };
		expect(parent(obj, '$.a.b')).toEqual({ b: 1 });
	});

	it('apply() maps matched values', () => {
		const obj: any = { a: { b: 1 } };
		const out = apply(obj, '$.a.b', (v) => v + 1);
		expect(out[0]?.value).toBe(2);
		expect(obj.a.b).toBe(2);
	});
});
