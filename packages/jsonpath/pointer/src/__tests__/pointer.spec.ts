import { describe, it, expect } from 'vitest';
import { JSONPointer, evaluatePointer } from '../pointer.js';

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
});
