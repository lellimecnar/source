import { describe, it, expect } from 'vitest';
import { diff } from '../diff.js';
import { applyPatch } from '../patch.js';

describe('diff', () => {
	it('should generate empty patch for equal objects', () => {
		const source = { a: 1 };
		const target = { a: 1 };
		expect(diff(source, target)).toEqual([]);
	});

	it('should generate replace for primitive changes', () => {
		const source = { a: 1 };
		const target = { a: 2 };
		expect(diff(source, target)).toEqual([
			{ op: 'replace', path: '/a', value: 2 },
		]);
	});

	it('should generate add for new keys', () => {
		const source = { a: 1 };
		const target = { a: 1, b: 2 };
		expect(diff(source, target)).toEqual([{ op: 'add', path: '/b', value: 2 }]);
	});

	it('should generate remove for missing keys', () => {
		const source = { a: 1, b: 2 };
		const target = { a: 1 };
		expect(diff(source, target)).toEqual([{ op: 'remove', path: '/b' }]);
	});

	it('should handle nested objects', () => {
		const source = { a: { b: 1 } };
		const target = { a: { b: 2 } };
		expect(diff(source, target)).toEqual([
			{ op: 'replace', path: '/a/b', value: 2 },
		]);
	});

	it('should handle arrays (simple replace)', () => {
		const source = [1, 2];
		const target = [1, 2, 3];
		expect(diff(source, target)).toEqual([
			{ op: 'replace', path: '', value: [1, 2, 3] },
		]);
	});

	it('should handle arrays (element diff)', () => {
		const source = [1, 2];
		const target = [1, 3];
		expect(diff(source, target)).toEqual([
			{ op: 'replace', path: '/1', value: 3 },
		]);
	});

	it('should satisfy roundtrip property', () => {
		const source = { a: 1, b: [2, 3], c: { d: 4 } };
		const target = { a: 2, b: [2, 4], c: { e: 5 } };
		const patch = diff(source, target);
		const result = applyPatch(source, patch);
		expect(result).toEqual(target);
	});
});
