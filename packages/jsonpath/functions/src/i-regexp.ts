/**
 * @jsonpath/functions
 *
 * RFC 9485 I-Regexp implementation.
 *
 * @packageDocumentation
 */

/**
 * Validates if a pattern is a valid I-Regexp (RFC 9485).
 * I-Regexp is a subset of PCRE/JS regex that is interoperable.
 *
 * @param pattern - The regex pattern to validate.
 * @returns Validation result.
 */
export function validateIRegexp(pattern: string): {
	valid: boolean;
	error?: string;
} {
	// RFC 9485 constraints:
	// 1. No lookahead/lookbehind
	// 2. No backreferences
	// 3. No named groups
	// 4. No non-capturing groups (actually (?:...) is allowed in some contexts but RFC 9485 says:
	//    "I-Regexp does not support: ... non-capturing groups")
	// 5. No possessive quantifiers
	// 6. No atomic groups

	// Simple check for forbidden constructs
	if (/\(\?[:=!<>].*?\)/.test(pattern)) {
		return {
			valid: false,
			error: 'I-Regexp does not support non-capturing groups or lookaround',
		};
	}

	if (/\\\d/.test(pattern)) {
		return { valid: false, error: 'I-Regexp does not support backreferences' };
	}

	if (/\(\?<.*?>/.test(pattern)) {
		return { valid: false, error: 'I-Regexp does not support named groups' };
	}

	if (/\\[dDsSwWbB]/.test(pattern)) {
		return {
			valid: false,
			error:
				'I-Regexp does not support shorthand character classes or boundary anchors',
		};
	}

	if (/\\[AZzGXRvVhH]/.test(pattern)) {
		return {
			valid: false,
			error: 'I-Regexp does not support advanced escape sequences',
		};
	}

	if (/[*+?}]+\+/.test(pattern)) {
		return {
			valid: false,
			error: 'I-Regexp does not support possessive quantifiers',
		};
	}

	try {
		new RegExp(pattern, 'u');
		return { valid: true };
	} catch (e: any) {
		return { valid: false, error: e.message };
	}
}

/**
 * Converts an I-Regexp pattern to a JS RegExp.
 * Handles RFC 9535 specific requirements like '.' matching any character except LF/CR.
 *
 * @param pattern - The I-Regexp pattern.
 * @param flags - RegExp flags.
 * @returns A JS RegExp instance.
 */
export function convertIRegexp(pattern: string, flags = 'u'): RegExp {
	// RFC 9535: . matches any character except LF (U+000A), CR (U+000D).
	// In JS, . matches any character except LF, CR, U+2028, U+2029.
	// We need to make it match U+2028 and U+2029.
	const processedPattern = pattern.replace(
		/\\.|\[(?:\\.|[^\]])*\]|(\.)/g,
		(m, dot) => (dot ? '[^\\n\\r]' : m),
	);

	return new RegExp(processedPattern, flags);
}
