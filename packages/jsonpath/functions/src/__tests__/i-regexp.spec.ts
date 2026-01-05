import { describe, it, expect } from 'vitest';
import { validateIRegexp, convertIRegexp } from '../i-regexp.js';

describe('I-Regexp (RFC 9485)', () => {
	describe('validateIRegexp', () => {
		it('should allow valid I-Regexp patterns', () => {
			expect(validateIRegexp('abc').valid).toBe(true);
			expect(validateIRegexp('[a-z]+').valid).toBe(true);
			expect(validateIRegexp('\\d{2,4}').valid).toBe(true);
			expect(validateIRegexp('(a|b)*').valid).toBe(true);
		});

		it('should reject non-capturing groups', () => {
			expect(validateIRegexp('(?:abc)').valid).toBe(false);
		});

		it('should reject lookaround', () => {
			expect(validateIRegexp('(?=abc)').valid).toBe(false);
			expect(validateIRegexp('(?!abc)').valid).toBe(false);
			expect(validateIRegexp('(?<=abc)').valid).toBe(false);
			expect(validateIRegexp('(?<!abc)').valid).toBe(false);
		});

		it('should reject backreferences', () => {
			expect(validateIRegexp('(a)\\1').valid).toBe(false);
		});

		it('should reject named groups', () => {
			expect(validateIRegexp('(?<name>abc)').valid).toBe(false);
		});
	});

	describe('convertIRegexp', () => {
		it('should handle . matching any character except LF/CR', () => {
			const regex = convertIRegexp('^.$');
			expect(regex.test('a')).toBe(true);
			expect(regex.test('\n')).toBe(false);
			expect(regex.test('\r')).toBe(false);
			// Should match U+2028 and U+2029 (unlike standard JS .)
			expect(regex.test('\u2028')).toBe(true);
			expect(regex.test('\u2029')).toBe(true);
		});

		it('should not replace . inside character classes', () => {
			const regex = convertIRegexp('^[.]$');
			expect(regex.test('.')).toBe(true);
			expect(regex.test('a')).toBe(false);
		});

		it('should not replace escaped .', () => {
			const regex = convertIRegexp('^\\.$');
			expect(regex.test('.')).toBe(true);
			expect(regex.test('a')).toBe(false);
		});
	});
});
