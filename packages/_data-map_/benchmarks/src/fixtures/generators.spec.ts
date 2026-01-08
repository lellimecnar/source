import { describe, expect, it } from 'vitest';
import {
	createSeededRng,
	generateDeepObject,
	generateMixedData,
	generateWideArray,
	generateWideObject,
} from './generators.js';

describe('fixtures generators', () => {
	it('createSeededRng is deterministic', () => {
		const rng1 = createSeededRng(42);
		const rng2 = createSeededRng(42);
		const values1 = Array.from({ length: 10 }, () => rng1());
		const values2 = Array.from({ length: 10 }, () => rng2());
		expect(values1).toEqual(values2);
	});

	it('generateWideObject produces correct shape', () => {
		const obj = generateWideObject({ width: 5, depth: 1, seed: 1 });
		expect(Object.keys(obj)).toHaveLength(5);
		expect(Object.keys(obj)[0]).toBe('key0');
	});

	it('generateWideObject respects depth', () => {
		const obj = generateWideObject({ width: 3, depth: 2, seed: 1 });
		const first = Object.values(obj)[0];
		expect(typeof first).toBe('object');
		expect(first).toHaveProperty('key0');
	});

	it('generateDeepObject produces correct depth', () => {
		const obj = generateDeepObject({ depth: 3, seed: 1 });
		let current = obj;
		let depth = 0;
		while (current.nested) {
			current = current.nested;
			depth++;
		}
		expect(depth).toBe(3);
	});

	it('generateWideArray produces correct length', () => {
		const arr = generateWideArray({ length: 50, seed: 1 });
		expect(arr).toHaveLength(50);
		expect(arr[0]).toHaveProperty('id', 0);
	});

	it('generateMixedData contains all types', () => {
		const data = generateMixedData({ seed: 1 });
		expect(data).toHaveProperty('objects');
		expect(data).toHaveProperty('deep');
		expect(data).toHaveProperty('array');
		expect(Array.isArray(data.objects)).toBe(true);
		expect(Array.isArray(data.array)).toBe(true);
	});
});
