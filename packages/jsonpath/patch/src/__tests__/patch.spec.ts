import { describe, it, expect } from 'vitest';
import { applyPatch } from '../patch.js';

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
});
