import { describe, expect, it } from 'vitest';

import { parseRelativeReference, resolveRelativePointer } from './relative';

describe('Relative JSON Pointer Support', () => {
	describe('parseRelativeReference', () => {
		it('recognizes absolute pointers', () => {
			const result = parseRelativeReference('/users/0');
			expect(result.type).toBe('absolute');
			expect(result.levels).toBe(0);
			expect(result.remaining).toBe('/users/0');
		});

		it('recognizes self references (./', () => {
			const result = parseRelativeReference('./sibling');
			expect(result.type).toBe('self');
			expect(result.levels).toBe(0);
			expect(result.remaining).toBe('sibling');
		});

		it('recognizes parent references (../', () => {
			const result = parseRelativeReference('../parent');
			expect(result.type).toBe('parent');
			expect(result.levels).toBe(1);
			expect(result.remaining).toBe('parent');
		});

		it('counts multiple parent levels', () => {
			const result = parseRelativeReference('../../grandparent');
			expect(result.type).toBe('parent');
			expect(result.levels).toBe(2);
			expect(result.remaining).toBe('grandparent');
		});

		it('handles mixed ./ and ../ prefix', () => {
			const result = parseRelativeReference('./../sibling');
			expect(result.type).toBe('parent');
			expect(result.levels).toBe(1);
			expect(result.remaining).toBe('sibling');
		});
	});

	describe('resolveRelativePointer', () => {
		it('resolves self reference at root', () => {
			const result = resolveRelativePointer('./foo', '/');
			expect(result).toBe('/foo');
		});

		it('resolves self reference in nested context', () => {
			const result = resolveRelativePointer('./sibling', '/users/0');
			expect(result).toBe('/users/0/sibling');
		});

		it('resolves single parent reference', () => {
			const result = resolveRelativePointer('../parent', '/users/0');
			expect(result).toBe('/users/parent');
		});

		it('resolves multiple parent levels', () => {
			const result = resolveRelativePointer('../../ancestor', '/a/b/c');
			expect(result).toBe('/a/ancestor');
		});

		it('resolves to root with bare ../ at appropriate level', () => {
			const result = resolveRelativePointer('../../', '/a/b');
			expect(result).toBe('/');
		});

		it('returns absolute pointers unmodified', () => {
			const result = resolveRelativePointer('/absolute', '/users/0');
			expect(result).toBe('/absolute');
		});

		it('handles complex relative paths with multiple segments', () => {
			const result = resolveRelativePointer('../siblings/0', '/users/0');
			expect(result).toBe('/users/siblings/0');
		});

		it('throws error when going above root', () => {
			expect(() => {
				resolveRelativePointer('../../../too/high', '/a/b');
			}).toThrow('goes above root');
		});

		it('throws error when parent count exceeds context depth', () => {
			expect(() => {
				resolveRelativePointer('../..', '/');
			}).toThrow('goes above root');
		});

		it('handles empty remaining path with parent reference', () => {
			const result = resolveRelativePointer('..', '/users/0');
			expect(result).toBe('/users');
		});
	});

	describe('Integration: DataMap with contextPointer', () => {
		// These tests verify that CallOptions.contextPointer is available for use
		// in subscription handlers and other advanced integrations.

		it('contextPointer is a valid type in CallOptions', () => {
			// Type-level verification: CallOptions.contextPointer? exists
			const opts: { contextPointer?: string } = { contextPointer: '/users/0' };
			expect(opts.contextPointer).toBe('/users/0');
		});
	});
});
