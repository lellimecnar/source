import { describe, it, expect } from 'vitest';
import { applyMergePatch, createMergePatch } from '../merge-patch.js';

describe('JSON Merge Patch', () => {
	it('should apply RFC 7386 examples', () => {
		expect(applyMergePatch({ a: 'b' }, { a: 'c' })).toEqual({ a: 'c' });
		expect(applyMergePatch({ a: 'b' }, { b: 'c' })).toEqual({ a: 'b', b: 'c' });
		expect(applyMergePatch({ a: 'b' }, { a: null })).toEqual({});
		expect(applyMergePatch({ a: 'b', b: 'c' }, { a: null })).toEqual({
			b: 'c',
		});
		expect(applyMergePatch({ a: ['b'] }, { a: 'c' })).toEqual({ a: 'c' });
		expect(applyMergePatch({ a: 'c' }, { a: ['b'] })).toEqual({ a: ['b'] });
		expect(
			applyMergePatch({ a: { b: 'c' } }, { a: { b: 'd', c: null } }),
		).toEqual({ a: { b: 'd' } });
		expect(applyMergePatch({ a: { b: 'c' } }, [1, 2])).toEqual([1, 2]);
		expect(applyMergePatch({ a: 'b' }, 'c')).toBe('c');
		expect(applyMergePatch({ a: 'b' }, null)).toBe(null);
	});

	describe('createMergePatch', () => {
		it('creates a patch that transforms source into target', () => {
			const source = { a: 1, b: { c: 2 }, d: 3 };
			const target = { a: 1, b: { c: 9 }, e: 4 };
			const patch = createMergePatch(source, target);
			const out = applyMergePatch(source, patch);
			expect(out).toEqual(target);
		});
	});
});
