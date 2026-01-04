import { describe, it, expect } from 'vitest';
import {
	JSONPointer,
	evaluatePointer,
	set,
	remove,
	append,
	parent,
	join,
	split,
	escape,
	unescape,
	isValid,
	validate,
	resolve,
	resolveOrThrow,
	exists,
	resolveWithParent,
} from '../index.js';

describe('JSONPointer', () => {
	describe('parse', () => {
		it('should parse empty pointer', () => {
			expect(JSONPointer.parse('')).toEqual([]);
		});

		it('should parse simple pointers', () => {
			expect(JSONPointer.parse('/foo')).toEqual(['foo']);
			expect(JSONPointer.parse('/foo/bar')).toEqual(['foo', 'bar']);
		});

		it('should parse pointers with indices', () => {
			expect(JSONPointer.parse('/foo/0')).toEqual(['foo', '0']);
		});

		it('should handle escaped characters', () => {
			expect(JSONPointer.parse('/~0')).toEqual(['~']);
			expect(JSONPointer.parse('/~1')).toEqual(['/']);
			expect(JSONPointer.parse('/~0~1')).toEqual(['~/']);
			expect(JSONPointer.parse('/foo~0bar/baz~1qux')).toEqual([
				'foo~bar',
				'baz/qux',
			]);
		});

		it('should throw on invalid pointers', () => {
			expect(() => JSONPointer.parse('foo')).toThrow();
		});
	});

	describe('format', () => {
		it('should format empty tokens', () => {
			expect(JSONPointer.format([])).toBe('');
		});

		it('should format simple tokens', () => {
			expect(JSONPointer.format(['foo'])).toBe('/foo');
			expect(JSONPointer.format(['foo', 'bar'])).toBe('/foo/bar');
		});

		it('should escape special characters', () => {
			expect(JSONPointer.format(['~'])).toBe('/~0');
			expect(JSONPointer.format(['/'])).toBe('/~1');
			expect(JSONPointer.format(['~/'])).toBe('/~0~1');
		});
	});

	describe('evaluate', () => {
		const data = {
			foo: ['bar', 'baz'],
			'': 0,
			'a/b': 1,
			'c%d': 2,
			'e^f': 3,
			'g|h': 4,
			'i\\j': 5,
			'k\"l': 6,
			' ': 7,
			'm~n': 8,
		};

		it('should evaluate RFC 6901 examples', () => {
			expect(evaluatePointer(data, '')).toEqual(data);
			expect(evaluatePointer(data, '/foo')).toEqual(['bar', 'baz']);
			expect(evaluatePointer(data, '/foo/0')).toBe('bar');
			expect(evaluatePointer(data, '/')).toBe(0);
			expect(evaluatePointer(data, '/a~1b')).toBe(1);
			expect(evaluatePointer(data, '/c%d')).toBe(2);
			expect(evaluatePointer(data, '/e^f')).toBe(3);
			expect(evaluatePointer(data, '/g|h')).toBe(4);
			expect(evaluatePointer(data, '/i\\j')).toBe(5);
			expect(evaluatePointer(data, '/k\"l')).toBe(6);
			expect(evaluatePointer(data, '/ ')).toBe(7);
			expect(evaluatePointer(data, '/m~0n')).toBe(8);
		});

		it('should return undefined for non-existent paths', () => {
			expect(evaluatePointer(data, '/nonexistent')).toBeUndefined();
			expect(evaluatePointer(data, '/foo/10')).toBeUndefined();
		});
	});

	describe('mutations', () => {
		it('should set values immutably', () => {
			const data = { a: { b: 1 } };
			const result = set(data, '/a/c', 2);
			expect(result).toEqual({ a: { b: 1, c: 2 } });
			expect(data).toEqual({ a: { b: 1 } });
			expect(result.a).not.toBe(data.a);
		});

		it('should set array elements', () => {
			const data = { a: [1, 2] };
			const result = set(data, '/a/1', 3);
			expect(result).toEqual({ a: [1, 3] });
			expect(Array.isArray(result.a)).toBe(true);
		});

		it('should remove values immutably', () => {
			const data = { a: { b: 1, c: 2 } };
			const result = remove(data, '/a/b');
			expect(result).toEqual({ a: { c: 2 } });
			expect(data).toEqual({ a: { b: 1, c: 2 } });
		});

		it('should append to arrays', () => {
			const data = { a: [1, 2] };
			const result = append(data, '/a', 3);
			expect(result).toEqual({ a: [1, 2, 3] });
		});

		it('should append using "-" token', () => {
			const data = { a: [1, 2] };
			const result = set(data, '/a/-', 3);
			// Note: RFC 6902 says "-" means "after the last element"
			// Our set implementation should handle "-" if it wants to be RFC 6902 compliant
			// Let's check if it does.
			expect(result).toEqual({ a: [1, 2, 3] });
		});
	});

	describe('utilities', () => {
		it('should get parent pointer', () => {
			expect(parent('/foo/bar')).toBe('/foo');
			expect(parent('/foo')).toBe('');
			expect(parent('')).toBe('');
		});

		it('should join pointers', () => {
			expect(join('/foo', 'bar')).toBe('/foo/bar');
			expect(join('/foo', '/bar')).toBe('/foo/bar');
			expect(join('', 'foo')).toBe('/foo');
		});

		it('should split pointers', () => {
			expect(split('/foo/bar')).toEqual(['foo', 'bar']);
		});

		it('should escape/unescape tokens', () => {
			expect(escape('foo/bar~baz')).toBe('foo~1bar~0baz');
			expect(unescape('foo~1bar~0baz')).toBe('foo/bar~baz');
		});
	});

	describe('validation', () => {
		it('should validate pointers', () => {
			expect(isValid('')).toBe(true);
			expect(isValid('/foo')).toBe(true);
			expect(isValid('foo')).toBe(false);
		});

		it('should provide validation errors', () => {
			expect(validate('/foo').valid).toBe(true);
			expect(validate('foo').valid).toBe(false);
			expect(validate('foo').errors).toContain(
				'JSON Pointer must start with "/" or be empty',
			);
		});
	});

	describe('resolution', () => {
		const data = { a: { b: 1 }, c: [2, 3] };

		it('should resolve pointers', () => {
			expect(resolve(data, '/a/b')).toBe(1);
			expect(resolve(data, '/a/x')).toBeUndefined();
		});

		it('should resolve or throw', () => {
			expect(resolveOrThrow(data, '/a/b')).toBe(1);
			expect(() => resolveOrThrow(data, '/a/x')).toThrow();
		});

		it('should check existence', () => {
			expect(exists(data, '/a/b')).toBe(true);
			expect(exists(data, '/a/x')).toBe(false);
		});

		it('should resolve with parent', () => {
			const result = resolveWithParent(data, '/a/b');
			expect(result.value).toBe(1);
			expect(result.parent).toBe(data.a);
			expect(result.key).toBe('b');
		});
	});
});
