import { describe, it, expect, vi } from 'vitest';
import {
	applyPatch,
	applyWithErrors,
	applyWithInverse,
	validate,
} from '../patch.js';
import { builder } from '../builder.js';

describe('Patch Options & Advanced Features', () => {
	describe('mutate option', () => {
		it('should mutate by default (breaking change)', () => {
			const data = { a: 1 };
			const result = applyPatch(data, [
				{ op: 'replace', path: '/a', value: 2 },
			]);
			expect(result).toEqual({ a: 2 });
			expect(data).toEqual({ a: 2 });
			expect(result).toBe(data);
		});

		it('should not mutate when mutate: false', () => {
			const data = { a: 1 };
			const result = applyPatch(
				data,
				[{ op: 'replace', path: '/a', value: 2 }],
				{ mutate: false },
			);
			expect(result).toEqual({ a: 2 });
			expect(data).toEqual({ a: 1 });
			expect(result).not.toBe(data);
		});
	});

	describe('hooks', () => {
		it('should call before and after hooks', () => {
			const data = { a: 1 };
			const before = vi.fn();
			const after = vi.fn();

			applyPatch(data, [{ op: 'replace', path: '/a', value: 2 }], {
				before,
				after,
			});

			expect(before).toHaveBeenCalledWith(
				expect.any(Object),
				expect.objectContaining({ op: 'replace' }),
				0,
			);
			expect(after).toHaveBeenCalledWith(
				expect.any(Object),
				expect.objectContaining({ op: 'replace' }),
				0,
				expect.any(Object),
			);
		});
	});

	describe('applyWithErrors', () => {
		it('should collect errors and continue if requested', () => {
			const data = { a: 1 };
			const patch = [
				{ op: 'replace', path: '/a', value: 2 },
				{ op: 'remove', path: '/non-existent' },
				{ op: 'add', path: '/b', value: 3 },
			];

			const { result, errors } = applyWithErrors(data, patch);

			expect(result).toEqual({ a: 2, b: 3 });
			expect(errors).toHaveLength(1);
			expect(errors[0].index).toBe(1);
			expect(errors[0].error.message).toContain('Property not found');
		});
	});

	describe('validate', () => {
		it('should validate operations without applying', () => {
			expect(() =>
				validate([{ op: 'add', path: '/a', value: 1 }]),
			).not.toThrow();
			expect(() => validate([{ op: 'add', path: '/a' } as any])).toThrow(
				"Missing required 'value' parameter",
			);
		});
	});

	describe('PatchBuilder extensions', () => {
		it('should support when()', () => {
			const b = builder()
				.when(true)
				.add('/a', 1)
				.when(false)
				.add('/b', 2)
				.build();

			expect(b).toEqual([{ op: 'add', path: '/a', value: 1 }]);
		});

		it('should support ifExists()', () => {
			const data = { a: 1 };
			const b = builder(data)
				.ifExists('/a')
				.add('/a-exists', true)
				.ifExists('/b')
				.add('/b-exists', true)
				.build();

			expect(b).toEqual([{ op: 'add', path: '/a-exists', value: true }]);
		});

		it('should support ifNotExists()', () => {
			const data = { a: 1 };
			const b = builder(data)
				.ifNotExists('/a')
				.add('/a-not-exists', true)
				.ifNotExists('/b')
				.add('/b-not-exists', true)
				.build();

			expect(b).toEqual([{ op: 'add', path: '/b-not-exists', value: true }]);
		});

		it('should throw error when using ifNotExists() without target', () => {
			expect(() => {
				builder().ifNotExists('/a').add('/a', 1);
			}).toThrow('ifNotExists() requires a target document');
		});

		it('should work with nested paths in ifNotExists()', () => {
			const data = { a: { b: 1 } };
			const b = builder(data)
				.ifNotExists('/a/c')
				.add('/a/c', 2)
				.ifNotExists('/a/b')
				.add('/a/b-modified', 3)
				.build();

			expect(b).toEqual([{ op: 'add', path: '/a/c', value: 2 }]);
		});

		it('should chain multiple ifNotExists() conditions', () => {
			const data = { x: 1 };
			const b = builder(data)
				.ifNotExists('/y')
				.add('/y', 2)
				.ifNotExists('/z')
				.add('/z', 3)
				.ifNotExists('/x')
				.add('/x-copy', 4)
				.build();

			expect(b).toEqual([
				{ op: 'add', path: '/y', value: 2 },
				{ op: 'add', path: '/z', value: 3 },
			]);
		});

		it('should support replaceAll()', () => {
			const data = { items: [{ val: 1 }, { val: 2 }] };
			const b = builder(data).replaceAll('$.items[*].val', 0).build();

			expect(b).toEqual([
				{ op: 'replace', path: '/items/0/val', value: 0 },
				{ op: 'replace', path: '/items/1/val', value: 0 },
			]);
		});

		it('should support removeAll()', () => {
			const data = { items: [1, 2, 3] };
			const b = builder(data).removeAll('$.items[*]').build();

			// Should be in reverse order to avoid index shifts
			expect(b).toEqual([
				{ op: 'remove', path: '/items/2' },
				{ op: 'remove', path: '/items/1' },
				{ op: 'remove', path: '/items/0' },
			]);
		});
	});
});
