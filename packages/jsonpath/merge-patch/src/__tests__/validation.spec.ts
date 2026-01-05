import { describe, it, expect } from 'vitest';
import { isValidMergePatch } from '../validation.js';

describe('isValidMergePatch', () => {
	it('should return true for valid JSON values', () => {
		expect(isValidMergePatch({})).toBe(true);
		expect(isValidMergePatch({ a: 1 })).toBe(true);
		expect(isValidMergePatch([])).toBe(true);
		expect(isValidMergePatch(null)).toBe(true);
		expect(isValidMergePatch(123)).toBe(true);
		expect(isValidMergePatch('string')).toBe(true);
		expect(isValidMergePatch(true)).toBe(true);
	});

	it('should return false for non-JSON values', () => {
		expect(isValidMergePatch(undefined)).toBe(false);
		expect(isValidMergePatch(() => {})).toBe(false);
		expect(isValidMergePatch(Symbol('test'))).toBe(false);
	});

	it('should return false for circular references', () => {
		const obj: any = {};
		obj.self = obj;
		expect(isValidMergePatch(obj)).toBe(false);
	});
});
