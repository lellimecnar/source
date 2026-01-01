import { describe, expect, it } from 'vitest';

import { JSONPath, findJsonPathPointers, readJsonPath } from './index';

describe('@jsonpath/compat-jsonpath-plus (additional)', () => {
	it('JSONPath() returns values by default', () => {
		const out = JSONPath({ path: '$.a', json: { a: 1 } });
		expect(out).toEqual([1]);
	});

	it('wrap=false returns scalar when exactly one match', () => {
		const out = JSONPath({ path: '$.a', json: { a: 1 }, wrap: false });
		expect(out).toBe(1);
	});

	it('resultType=path returns jsonpath-plus style paths', () => {
		const out = JSONPath({
			path: "$.o['j j']",
			json: { o: { 'j j': 42 } },
			resultType: 'path',
		});
		expect(out).toEqual(["$['o']['j j']"]);
	});

	it('findJsonPathPointers() returns JSON Pointer strings', () => {
		const out = findJsonPathPointers({ a: { b: 1 } }, '$.a.b');
		expect(out).toEqual(['/a/b']);
	});

	it('readJsonPath() returns a scalar value', () => {
		expect(readJsonPath({ a: { b: 1 } }, '$.a.b')).toBe(1);
	});
});
