import { describe, it, expect } from 'vitest';
import { applyPatch, applyWithInverse } from '../patch.js';

describe('JSON Patch', () => {
	it('should apply add operation', () => {
		const data = { foo: 'bar' };
		expect(
			applyPatch(data, [{ op: 'add', path: '/baz', value: 'qux' }]),
		).toEqual({ foo: 'bar', baz: 'qux' });
		expect(applyPatch([1, 2], [{ op: 'add', path: '/1', value: 3 }])).toEqual([
			1, 3, 2,
		]);
		expect(applyPatch([1, 2], [{ op: 'add', path: '/-', value: 3 }])).toEqual([
			1, 2, 3,
		]);
	});

	it('should apply remove operation', () => {
		const data = { foo: 'bar', baz: 'qux' };
		expect(applyPatch(data, [{ op: 'remove', path: '/baz' }])).toEqual({
			foo: 'bar',
		});
		expect(applyPatch([1, 2, 3], [{ op: 'remove', path: '/1' }])).toEqual([
			1, 3,
		]);
	});

	it('should apply replace operation', () => {
		const data = { foo: 'bar' };
		expect(
			applyPatch(data, [{ op: 'replace', path: '/foo', value: 'baz' }]),
		).toEqual({ foo: 'baz' });
	});

	it('should apply move operation', () => {
		const data = { foo: { bar: 'baz' }, qux: 'quux' };
		expect(
			applyPatch(data, [{ op: 'move', from: '/foo/bar', path: '/qux' }]),
		).toEqual({ foo: {}, qux: 'baz' });
	});

	it('should apply copy operation', () => {
		const data = { foo: { bar: 'baz' }, qux: 'quux' };
		expect(
			applyPatch(data, [{ op: 'copy', from: '/foo/bar', path: '/qux' }]),
		).toEqual({ foo: { bar: 'baz' }, qux: 'baz' });
	});

	it('should apply test operation', () => {
		const data = { foo: 'bar' };
		expect(() =>
			applyPatch(data, [{ op: 'test', path: '/foo', value: 'bar' }]),
		).not.toThrow();
		expect(() =>
			applyPatch(data, [{ op: 'test', path: '/foo', value: 'baz' }]),
		).toThrow();
	});

	it('should throw JSONPatchError with metadata on failure', () => {
		const data = { foo: 'bar' };
		try {
			applyPatch(data, [
				{ op: 'test', path: '/foo', value: 'bar' },
				{ op: 'remove', path: '/nonexistent' },
			]);
		} catch (err: any) {
			expect(err.name).toBe('JSONPatchError');
			expect(err.operationIndex).toBe(1);
			expect(err.operation).toBe('remove');
			expect(err.path).toBe('/nonexistent');
		}
	});

	describe('applyWithInverse', () => {
		it('should generate inverse for add', () => {
			const data = { a: 1 };
			const { result, inverse } = applyWithInverse(data, [
				{ op: 'add', path: '/b', value: 2 },
			]);
			expect(result).toEqual({ a: 1, b: 2 });
			expect(inverse).toEqual([{ op: 'remove', path: '/b' }]);
			expect(applyPatch(result, inverse)).toEqual(data);
		});

		it('should generate inverse for remove', () => {
			const data = { a: 1, b: 2 };
			const { result, inverse } = applyWithInverse(data, [
				{ op: 'remove', path: '/b' },
			]);
			expect(result).toEqual({ a: 1 });
			expect(inverse).toEqual([{ op: 'add', path: '/b', value: 2 }]);
			expect(applyPatch(result, inverse)).toEqual(data);
		});

		it('should generate inverse for replace', () => {
			const data = { a: 1 };
			const { result, inverse } = applyWithInverse(data, [
				{ op: 'replace', path: '/a', value: 2 },
			]);
			expect(result).toEqual({ a: 2 });
			expect(inverse).toEqual([{ op: 'replace', path: '/a', value: 1 }]);
			expect(applyPatch(result, inverse)).toEqual(data);
		});

		it('should generate inverse for multiple operations in reverse order', () => {
			const data = { a: 1 };
			const { result, inverse } = applyWithInverse(data, [
				{ op: 'add', path: '/b', value: 2 },
				{ op: 'replace', path: '/a', value: 3 },
			]);
			expect(result).toEqual({ a: 3, b: 2 });
			expect(inverse).toEqual([
				{ op: 'replace', path: '/a', value: 1 },
				{ op: 'remove', path: '/b' },
			]);
			expect(applyPatch(result, inverse)).toEqual(data);
		});
	});
});
