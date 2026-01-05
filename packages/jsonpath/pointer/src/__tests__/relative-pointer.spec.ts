import { describe, it, expect } from 'vitest';

import { JSONPointer } from '../pointer.js';
import {
	RelativeJSONPointer,
	parseRelativePointer,
	resolveRelative,
	isRelativePointer,
} from '../relative-pointer.js';

describe('Relative JSON Pointer', () => {
	it('parses prefix and suffix', () => {
		expect(parseRelativePointer('0').ancestors).toBe(0);
		expect(parseRelativePointer('2/foo').ancestors).toBe(2);
		expect(parseRelativePointer('2/foo').suffix.toString()).toBe('/foo');
	});

	it('resolves relative values', () => {
		const root = { a: { b: { c: 1 } } };
		const current = new JSONPointer('/a/b');
		expect(resolveRelative(root, current, '0/c')).toBe(1);
		expect(resolveRelative(root, current, '1/b/c')).toBe(1);
	});

	it('resolves key reference via #', () => {
		const root = { a: { b: { c: 1 } } };
		const current = new JSONPointer('/a/b');
		expect(resolveRelative(root, current, '0#')).toBe('b');
		expect(resolveRelative(root, current, '1#')).toBe('a');
	});

	it('validates with isRelativePointer()', () => {
		expect(isRelativePointer('0')).toBe(true);
		expect(isRelativePointer('1/foo')).toBe(true);
		expect(isRelativePointer('x/foo')).toBe(false);
		expect(isRelativePointer('1foo')).toBe(false);
	});

	describe('RelativeJSONPointer class', () => {
		it('should convert to absolute pointer', () => {
			const current = new JSONPointer('/a/b/c');
			const rel = new RelativeJSONPointer('1/d');
			expect(rel.toAbsolute(current).toString()).toBe('/a/b/d');

			const rel2 = new RelativeJSONPointer('2/x/y');
			expect(rel2.toAbsolute(current).toString()).toBe('/a/x/y');
		});

		it('should resolve against root and current', () => {
			const root = { a: { b: { c: 1, d: 2 } } };
			const current = new JSONPointer('/a/b/c');
			const rel = new RelativeJSONPointer('1/d');
			expect(rel.resolve(root, current)).toBe(2);

			const relKey = new RelativeJSONPointer('1#');
			expect(relKey.resolve(root, current)).toBe('b');
		});
	});
});
