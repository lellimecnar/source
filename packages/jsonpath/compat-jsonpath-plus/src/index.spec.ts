import { describe, expect, it } from 'vitest';

import { findJsonPathPointers, readJsonPath } from './index';

describe('@jsonpath/compat-jsonpath-plus', () => {
	it('reads values and enumerates pointers', () => {
		const obj = { a: { b: 1 } };
		expect(readJsonPath(obj, '$.a.b')).toBe(1);
		expect(findJsonPathPointers(obj, '$.a.b')).toEqual(['/a/b']);
	});
});
