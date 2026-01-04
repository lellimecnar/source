import { describe, it, expect } from 'vitest';
import { query, queryValues, queryPaths } from '../facade.js';

describe('JSONPath Integration', () => {
	const data = {
		store: {
			book: [
				{
					category: 'reference',
					author: 'Nigel Rees',
					title: 'Sayings of the Century',
					price: 8.95,
				},
				{
					category: 'fiction',
					author: 'Evelyn Waugh',
					title: 'Sword of Honour',
					price: 12.99,
				},
			],
			bicycle: { color: 'red', price: 19.95 },
		},
	};

	it('should support basic queries via facade', () => {
		expect(queryValues(data, '$.store.bicycle.color')).toEqual(['red']);
		expect(queryPaths(data, '$.store.bicycle.color')).toEqual([
			"$['store']['bicycle']['color']",
		]);
	});

	it('should propagate EvaluatorOptions via facade', () => {
		// Test maxResults
		expect(() => queryValues(data, '$..*', { maxResults: 5 })).toThrow(
			/Maximum results exceeded/,
		);

		// Test noRecursive
		expect(() =>
			queryValues(data, '$..*', { secure: { noRecursive: true } }),
		).toThrow(/Recursive descent is disabled/);
	});

	it('should support RFC 9535 slices and normalized paths', () => {
		const list = [0, 1, 2, 3, 4, 5];
		expect(queryValues(list, '$[1:4:2]')).toEqual([1, 3]);
		expect(queryPaths(list, '$[1:4:2]')).toEqual(['$[1]', '$[3]']);
		// Wait, queryPaths should return normalized paths.
		// RFC 9535 says normalized paths use bracket notation.
		expect(queryPaths(list, '$[1:4:2]')).toEqual(['$[1]', '$[3]']);
		// Wait, my normalized path implementation returns $[1] for index 1.
		// Let me check that.
	});
});
