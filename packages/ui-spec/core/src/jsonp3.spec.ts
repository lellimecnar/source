import { describe, expect, it } from 'vitest';

import { createJsonp3Evaluator } from './jsonp3';

describe('jsonp3 adapter', () => {
	it('findAll returns values + pointers', () => {
		const evalr = createJsonp3Evaluator();
		const doc = { a: { b: 1 }, arr: [10, 20] };

		const matches = evalr.findAll('$.a.b', doc);
		expect(matches).toEqual([{ value: 1, pointer: '/a/b' }]);

		const arrMatches = evalr.findAll('$.arr[*]', doc);
		expect(arrMatches.map((m) => m.pointer)).toEqual(['/arr/0', '/arr/1']);
	});
});
