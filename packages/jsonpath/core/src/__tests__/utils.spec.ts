import { describe, it, expect } from 'vitest';
import {
	isObject,
	isArray,
	isPrimitive,
	deepEqual,
	deepClone,
	freeze,
} from '../utils.js';

describe('utils', () => {
	describe('type guards', () => {
		it('isObject', () => {
			expect(isObject({})).toBe(true);
			expect(isObject({ a: 1 })).toBe(true);
			expect(isObject([])).toBe(false);
			expect(isObject(null)).toBe(false);
			expect(isObject(42)).toBe(false);
		});

		it('isArray', () => {
			expect(isArray([])).toBe(true);
			expect(isArray([1, 2])).toBe(true);
			expect(isArray({})).toBe(false);
			expect(isArray('test')).toBe(false);
		});

		it('isPrimitive', () => {
			expect(isPrimitive(null)).toBe(true);
			expect(isPrimitive('test')).toBe(true);
			expect(isPrimitive(42)).toBe(true);
			expect(isPrimitive(true)).toBe(true);
			expect(isPrimitive({})).toBe(false);
			expect(isPrimitive([])).toBe(false);
		});
	});

	describe('deepEqual', () => {
		it('should compare primitives', () => {
			expect(deepEqual(1, 1)).toBe(true);
			expect(deepEqual(1, 2)).toBe(false);
			expect(deepEqual('a', 'a')).toBe(true);
			expect(deepEqual(null, null)).toBe(true);
			expect(deepEqual(true, false)).toBe(false);
		});

		it('should compare objects', () => {
			expect(deepEqual({ a: 1 }, { a: 1 })).toBe(true);
			expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
			expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false);
			expect(deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
		});

		it('should compare arrays', () => {
			expect(deepEqual([1, 2], [1, 2])).toBe(true);
			expect(deepEqual([1, 2], [1, 3])).toBe(false);
			expect(deepEqual([1, [2]], [1, [2]])).toBe(true);
		});

		it('should handle circular references', () => {
			const a: any = { x: 1 };
			a.self = a;
			const b: any = { x: 1 };
			b.self = b;

			// Our implementation returns false for circular references to avoid infinite loops
			expect(deepEqual(a, b)).toBe(false);
		});
	});

	describe('deepClone', () => {
		it('should clone primitives', () => {
			expect(deepClone(1)).toBe(1);
			expect(deepClone('test')).toBe('test');
			expect(deepClone(null)).toBe(null);
		});

		it('should clone objects and arrays', () => {
			const original = { a: [1, { b: 2 }], c: 3 };
			const clone = deepClone(original);

			expect(clone).toEqual(original);
			expect(clone).not.toBe(original);
			expect(clone.a).not.toBe(original.a);
			expect(clone.a[1]).not.toBe(original.a[1]);
		});

		it('should clone using fallback if structuredClone is not available', () => {
			const originalStructuredClone = global.structuredClone;
			// @ts-ignore
			delete global.structuredClone;

			try {
				const original = { a: [1, { b: 2 }], c: 3 };
				const clone = deepClone(original);
				expect(clone).toEqual(original);
				expect(clone).not.toBe(original);
			} finally {
				global.structuredClone = originalStructuredClone;
			}
		});
	});

	describe('freeze', () => {
		it('should recursively freeze', () => {
			const obj = { a: [1, { b: 2 }] };
			freeze(obj);

			expect(Object.isFrozen(obj)).toBe(true);
			expect(Object.isFrozen(obj.a)).toBe(true);
			expect(Object.isFrozen(obj.a[1])).toBe(true);

			// Verify it's actually frozen (throws in strict mode)
			expect(() => {
				(obj as any).a = 1;
			}).toThrow();
			expect(() => {
				(obj.a as any)[0] = 2;
			}).toThrow();
		});
	});
});
