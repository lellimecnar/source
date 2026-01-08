import { describe, expect, it } from 'vitest';
import { FlatStore } from '@data-map/storage';
import { SmartArray } from '../array-operations.js';

describe('SmartArray', () => {
	it('push/get', () => {
		const store = new FlatStore();
		const arr = new SmartArray(store, '/users');
		arr.push('A');
		arr.push('B');
		expect(arr.length).toBe(2);
		expect(arr.get(0)).toBe('A');
		expect(arr.get(1)).toBe('B');
	});

	it('splice maintains logical view and returns removed items', () => {
		const store = new FlatStore();
		const arr = new SmartArray(store, '/items');
		arr.push('A');
		arr.push('B');
		arr.push('C');
		const removed = arr.splice(1, 1, 'X');
		expect(removed).toEqual(['B']);
		expect(arr.toArray()).toEqual(['A', 'X', 'C']);
	});

	it('pop returns last element', () => {
		const store = new FlatStore();
		const arr = new SmartArray(store, '/p');
		arr.push('A');
		arr.push('B');
		expect(arr.pop()).toBe('B');
		expect(arr.toArray()).toEqual(['A']);
		expect(arr.pop()).toBe('A');
		expect(arr.pop()).toBeUndefined();
	});

	it('shift/unshift', () => {
		const store = new FlatStore();
		const arr = new SmartArray(store, '/s');
		arr.unshift('B');
		arr.unshift('A');
		arr.push('C');
		expect(arr.toArray()).toEqual(['A', 'B', 'C']);
		expect(arr.shift()).toBe('A');
		expect(arr.toArray()).toEqual(['B', 'C']);
	});

	it('sort/reverse', () => {
		const store = new FlatStore();
		const arr = new SmartArray(store, '/sort');
		arr.push(3);
		arr.push(1);
		arr.push(2);
		arr.sort((a: any, b: any) => a - b);
		expect(arr.toArray()).toEqual([1, 2, 3]);
		arr.reverse();
		expect(arr.toArray()).toEqual([3, 2, 1]);
	});

	it('shuffle can be deterministic with a stub rng', () => {
		const store = new FlatStore();
		const arr = new SmartArray(store, '/shuffle');
		arr.push('A');
		arr.push('B');
		arr.push('C');
		let i = 0;
		const rng = () => [0.9, 0.1, 0.5][i++] ?? 0;
		arr.shuffle(rng);
		expect(arr.toArray()).toHaveLength(3);
		// Contents preserved
		expect(new Set(arr.toArray() as string[])).toEqual(
			new Set(['A', 'B', 'C']),
		);
	});

	it('toPointerMap returns logical pointer mapping', () => {
		const store = new FlatStore();
		const arr = new SmartArray(store, '/m');
		arr.push('A');
		arr.push('B');
		const map = arr.toPointerMap();
		expect(map.get('/m/0')).toBe('A');
		expect(map.get('/m/1')).toBe('B');
	});
});
