import { describe, expect, it } from 'vitest';
import {
	generateDeepObject,
	generateLargeArray,
	generateWideObject,
	generateMixedData,
} from './data-generators.js';

describe('fixtures generators', () => {
	it('generateLargeArray creates correct length', () => {
		const arr = generateLargeArray(1000);
		expect(arr).toHaveLength(1000);
		expect(arr[0]).toHaveProperty('id');
	});

	it('generateDeepObject creates nested structure', () => {
		const obj = generateDeepObject(5);
		let cur: any = obj;
		for (let i = 0; i < 5; i++) {
			expect(cur).toHaveProperty('next');
			cur = cur.next;
		}
	});

	it('generateWideObject creates width keys', () => {
		const obj = generateWideObject(100);
		expect(Object.keys(obj)).toHaveLength(100);
	});

	it('generateMixedData is JSON-serializable', () => {
		const data = generateMixedData();
		expect(() => JSON.stringify(data)).not.toThrow();
	});
});
