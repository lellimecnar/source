/**
 * @jsonpath/lexer
 *
 * ASCII lookup tables for fast character classification.
 *
 * @packageDocumentation
 */

import { CharCode } from '@jsonpath/core';

export { CharCode };

/**
 * Character flags for ASCII characters (0-127).
 */
export const CHAR_FLAGS = new Uint8Array(128);

export const IS_WHITESPACE = 1 << 0;
export const IS_DIGIT = 1 << 1;
export const IS_IDENT_START = 1 << 2;
export const IS_IDENT_CONT = 1 << 3;
export const IS_OPERATOR = 1 << 4;
export const IS_HEX = 1 << 5;

// Initialize flags
for (let i = 0; i < 128; i++) {
	const char = String.fromCharCode(i);
	let flags = 0;

	// Whitespace: space, tab, newline, carriage return
	if (/\s/.test(char)) {
		flags |= IS_WHITESPACE;
	}

	// Digits: 0-9
	if (/[0-9]/.test(char)) {
		flags |= IS_DIGIT;
		flags |= IS_HEX;
	}

	// Hex: a-f, A-F
	if (/[a-fA-F]/.test(char)) {
		flags |= IS_HEX;
	}

	// Identifier start: a-z, A-Z, _, $ (though $ is usually ROOT, it can be in names in some implementations)
	// RFC 9535 says identifiers start with a-z, A-Z, _ or non-ASCII
	if (/[a-zA-Z_]/.test(char)) {
		flags |= IS_IDENT_START;
		flags |= IS_IDENT_CONT;
	}

	// Identifier continue: a-z, A-Z, 0-9, _
	if (/[a-zA-Z0-9_]/.test(char)) {
		flags |= IS_IDENT_CONT;
	}

	// Operators: =, !, <, >, &, |, +, -, *, /, %
	if (/[=!<>|&+\-*/%]/.test(char)) {
		flags |= IS_OPERATOR;
	}

	CHAR_FLAGS[i] = flags;
}
