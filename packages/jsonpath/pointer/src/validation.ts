/**
 * @jsonpath/pointer
 *
 * Validation functions for JSON Pointer (RFC 6901).
 *
 * @packageDocumentation
 */

import { JSONPointer } from './pointer.js';

/**
 * Returns true if the given string is a valid JSON Pointer.
 */
export function isValid(pointer: string): boolean {
	try {
		JSONPointer.parse(pointer);
		return true;
	} catch {
		return false;
	}
}

/**
 * Validates a JSON Pointer and returns detailed error information.
 */
export function validate(pointer: string): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	if (pointer === '') {
		return { valid: true, errors: [] };
	}

	if (!pointer.startsWith('/')) {
		errors.push('JSON Pointer must start with "/" or be empty');
		return { valid: false, errors };
	}

	const parts = pointer.split('/').slice(1);
	for (let i = 0; i < parts.length; i++) {
		const part = parts[i]!;
		// RFC 6901 Section 3: A tilde '~' character MUST be followed by either '0' or '1'.
		if (/~[^01]/.test(part) || part.endsWith('~')) {
			errors.push(`Invalid tilde sequence in segment ${i}: ${part}`);
		}
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}
