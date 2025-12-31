import { describe, expect, it } from 'vitest';

import jp, { query } from './index';

describe('@jsonpath/compat-jsonpath', () => {
	it('delegates to jsonpath', () => {
		const obj = { a: { b: 1 } };
		expect(query(obj, '$.a.b')).toEqual([1]);
		expect((jp as any).query(obj, '$.a.b')).toEqual([1]);
	});
});
