import { describe, it, expect } from 'vitest';
import { JSONPointer, fromURIFragment, toURIFragment } from '../index.js';
import { PointerSyntaxError } from '../errors.js';

describe('RFC 6901 §6 - URI fragment identifier representation', () => {
	it('encodes/decodes empty pointer as empty fragment', () => {
		expect(toURIFragment('')).toBe('#');
		expect(fromURIFragment('#')).toBe('');
	});

	it('encodes/decodes simple pointers', () => {
		expect(toURIFragment('/foo')).toBe('#/foo');
		expect(fromURIFragment('#/foo')).toBe('/foo');
	});

	it('percent-encodes characters that must be escaped in fragments', () => {
		expect(toURIFragment('/ ')).toBe('#/%20');
		expect(toURIFragment('/k"l')).toBe('#/k%22l');
		expect(toURIFragment('/c%d')).toBe('#/c%25d');

		expect(fromURIFragment('#/%20')).toBe('/ ');
		expect(fromURIFragment('#/k%22l')).toBe('/k"l');
		expect(fromURIFragment('#/c%25d')).toBe('/c%d');
	});

	it('accepts fragment content without leading "#"', () => {
		expect(fromURIFragment('/foo')).toBe('/foo');
	});

	it('throws for invalid decoded pointers', () => {
		expect(() => fromURIFragment('#foo')).toThrow(PointerSyntaxError);
	});

	it('throws for invalid percent-encoding', () => {
		expect(() => fromURIFragment('#%E0%A4%A')).toThrow(PointerSyntaxError);
	});

	it('JSONPointer#toURIFragment mirrors toURIFragment(pointerString)', () => {
		expect(new JSONPointer('/foo').toURIFragment()).toBe('#/foo');
		expect(new JSONPointer('').toURIFragment()).toBe('#');
	});
});
