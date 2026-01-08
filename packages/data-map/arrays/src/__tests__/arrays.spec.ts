import { describe, expect, it } from 'vitest';
import { FlatStore } from '@data-map/storage';
import { SmartArray } from '../smart-array.js';

describe('SmartArray', () => {
	it('push/get', () => {
		const store = new FlatStore();
		const arr = new SmartArray(store, '/users');
		arr.push('A');
		arr.push('B');
		expect(arr.get(0)).toBe('A');
		expect(arr.get(1)).toBe('B');
	});

	it('splice maintains logical view', () => {
		const store = new FlatStore();
		const arr = new SmartArray(store, '/items');
		arr.push('A');
		arr.push('B');
		arr.push('C');
		arr.splice(1, 1, 'X');
		expect(arr.get(0)).toBe('A');
		expect(arr.get(1)).toBe('X');
		expect(arr.get(2)).toBe('C');
	});
});
