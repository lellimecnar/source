import { describe, it, expect } from 'vitest';
import { validateIRegexp, convertIRegexp } from './i-regexp.js';

describe('I-Regexp (RFC 9485)', () => {
	describe('validateIRegexp', () => {
		it('should allow basic regex', () => {
			expect(validateIRegexp('abc').valid).toBe(true);
			expect(validateIRegexp('[a-z]+').valid).toBe(true);
			expect(validateIRegexp('^a|b$').valid).toBe(true);
			expect(validateIRegexp('(a|b)*').valid).toBe(true);
		});

		it('should forbid non-capturing groups', () => {
			expect(validateIRegexp('(?:abc)').valid).toBe(false);
		});

		it('should forbid lookaround', () => {
			expect(validateIRegexp('(?=abc)').valid).toBe(false);
			expect(validateIRegexp('(?!abc)').valid).toBe(false);
			expect(validateIRegexp('(?<=abc)').valid).toBe(false);
			expect(validateIRegexp('(?<!abc)').valid).toBe(false);
		});

		it('should forbid backreferences', () => {
			expect(validateIRegexp('(a)\\1').valid).toBe(false);
		});

		it('should forbid named groups', () => {
			expect(validateIRegexp('(?<name>abc)').valid).toBe(false);
		});

		it('should forbid shorthand character classes (RFC 9485)', () => {
			expect(validateIRegexp('\\d').valid).toBe(false);
			expect(validateIRegexp('\\w').valid).toBe(false);
			expect(validateIRegexp('\\s').valid).toBe(false);
		});

		it('should forbid anchors other than ^ and $', () => {
			expect(validateIRegexp('\\b').valid).toBe(false);
			expect(validateIRegexp('\\B').valid).toBe(false);
			expect(validateIRegexp('\\A').valid).toBe(false);
			expect(validateIRegexp('\\Z').valid).toBe(false);
			expect(validateIRegexp('\\z').valid).toBe(false);
		});
	});

	describe('convertIRegexp', () => {
		it('should handle dot matching correctly (RFC 9535)', () => {
			const regex = convertIRegexp('.');
			expect(regex.test('\n')).toBe(false);
			expect(regex.test('\r')).toBe(false);
			expect(regex.test('\u2028')).toBe(true);
			expect(regex.test('\u2029')).toBe(true);
			expect(regex.test('a')).toBe(true);
		});

		it('should handle alternation correctly with anchors', () => {
			const pattern = 'a|b';
			const regex = convertIRegexp(`^(?:${pattern})$`);
			expect(regex.test('a')).toBe(true);
			expect(regex.test('b')).toBe(true);
			expect(regex.test('ab')).toBe(false);
		});
	});
});
