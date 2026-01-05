import { describe, it, expect } from 'vitest';
import { query } from '../index';

describe('RFC 9535 Functions', () => {
	const data = {
		strings: ['abc', 'defg', 'h'],
		arrays: [[1, 2], [3, 4, 5], []],
		objects: [{ a: 1 }, { b: 2, c: 3 }, {}],
		mixed: ['a', [1], { k: 'v' }, null, 123],
		regex: ['apple', 'banana', 'cherry', 'date'],
	};

	describe('length()', () => {
		it('should return length of strings', () => {
			const result = query(data, '$.strings[?length(@) == 3]').values();
			expect(result).toEqual(['abc']);
		});

		it('should return length of arrays', () => {
			const result = query(data, '$.arrays[?length(@) == 2]').values();
			expect(result).toEqual([[1, 2]]);
		});

		it('should return length of objects', () => {
			const result = query(data, '$.objects[?length(@) == 2]').values();
			expect(result).toEqual([{ b: 2, c: 3 }]);
		});

		it('should return Nothing for non-string/array/object', () => {
			// length(null) -> Nothing. Nothing == 0 is false.
			const result = query(data, '$.mixed[?length(@) == 0]').values();
			// mixed has null, but length(null) is Nothing.
			// mixed has [1] (len 1), {"k":"v"} (len 1), "a" (len 1), 123 (Nothing)
			// Only [] and {} would have length 0.
			expect(result).toEqual([]);
		});
	});

	describe('count()', () => {
		it('should count nodes in a node list', () => {
			// count(@) in a filter context: @ is a NodeList containing the current node.
			// So count(@) should always be 1.
			const result = query(data, '$.strings[?count(@) == 1]').values();
			expect(result).toEqual(['abc', 'defg', 'h']);
		});

		it('should count nodes from a path', () => {
			// count($.strings[*]) should be 3.
			// But count() is usually used in filters.
			// $[?count(@.a) == 1]
			const testData = [{ a: [1] }, { a: [1, 2] }, { b: 1 }];
			const result = query(testData, '$[?count(@.a[*]) == 1]').values();
			expect(result).toEqual([{ a: [1] }]);
		});
	});

	describe('match()', () => {
		it('should perform full match', () => {
			const result = query(data, '$.regex[?match(@, "a.*e")]').values();
			expect(result).toEqual(['apple']);
		});

		it('should return false for non-matching strings', () => {
			const result = query(data, '$.regex[?match(@, "z.*")]').values();
			expect(result).toEqual([]);
		});
	});

	describe('search()', () => {
		it('should perform partial match', () => {
			const result = query(data, '$.regex[?search(@, "an")]').values();
			expect(result).toEqual(['banana']);
		});

		it('should return Nothing for invalid I-Regexp', () => {
			const testData = ['123'];
			// \d is not allowed in I-Regexp
			expect(query(testData, '$[?match(@, "\\\\d+")]').values()).toEqual([]);
			expect(query(testData, '$[?search(@, "\\\\d+")]').values()).toEqual([]);
		});

		it('should return Nothing for non-string arguments', () => {
			const testData = ['abc'];
			expect(query(testData, '$[?match(@, 123)]').values()).toEqual([]);
			expect(query(testData, '$[?search(123, "a")]').values()).toEqual([]);
		});
	});

	describe('value()', () => {
		it('should return value of a single node', () => {
			const testData = [{ a: 1 }, { a: 2 }, { b: 3 }];
			// value(@.a) returns 1 or 2.
			const result = query(testData, '$[?value(@.a) == 1]').values();
			expect(result).toEqual([{ a: 1 }]);
		});

		it('should return Nothing for multiple nodes', () => {
			const testData = [{ a: [1, 2] }];
			// value(@.a[*]) -> Nothing because it has 2 nodes.
			const result = query(testData, '$[?value(@.a[*]) == 1]').values();
			expect(result).toEqual([]);
		});
	});

	describe('Extra Functions', () => {
		const testData = {
			nums: [1, 5, 3, 8, 2],
			obj: { a: 1, b: 2 },
		};

		it('min() should return minimum value', () => {
			const result = query(testData, '$.nums[?@ == min($.nums[*])]').values();
			expect(result).toEqual([1]);
		});

		it('max() should return maximum value', () => {
			const result = query(testData, '$.nums[?@ == max($.nums[*])]').values();
			expect(result).toEqual([8]);
		});

		it('sum() should return sum of values', () => {
			// Wrap in array to apply filter to the object itself
			const result = query([testData], '$[?sum(@.nums[*]) == 19]').values();
			expect(result).toEqual([testData]);
		});

		it('avg() should return average of values', () => {
			// avg(1, 5, 3, 8, 2) = 19 / 5 = 3.8
			const result = query([testData], '$[?avg(@.nums[*]) == 3.8]').values();
			expect(result).toEqual([testData]);
		});

		it('keys() should return object keys', () => {
			// Use $.. to find the object and apply filter
			const result = query(testData, '$..[?keys(@) == ["a", "b"]]').values();
			expect(result).toEqual([testData.obj]);
		});

		it('type() should return value type', () => {
			const data = [1, 'a', true, null, [], {}];
			expect(query(data, '$[?type(@) == "number"]').values()).toEqual([1]);
			expect(query(data, '$[?type(@) == "string"]').values()).toEqual(['a']);
			expect(query(data, '$[?type(@) == "boolean"]').values()).toEqual([true]);
			expect(query(data, '$[?type(@) == "null"]').values()).toEqual([null]);
			expect(query(data, '$[?type(@) == "array"]').values()).toEqual([[]]);
			expect(query(data, '$[?type(@) == "object"]').values()).toEqual([{}]);
		});
	});
});
