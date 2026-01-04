import { JSONPathError } from '@jsonpath/core';

/**
 * JSON Pointer (RFC 6901) implementation.
 */
export class JSONPointer {
	private tokens: string[];

	constructor(pointer: string | string[]) {
		if (Array.isArray(pointer)) {
			this.tokens = pointer;
		} else {
			this.tokens = JSONPointer.parse(pointer);
		}
	}

	/**
	 * Parses a JSON Pointer string into tokens.
	 */
	static parse(pointer: string): string[] {
		if (pointer === '') {
			return [];
		}

		if (!pointer.startsWith('/')) {
			throw new JSONPathError(
				'Invalid JSON Pointer: must start with "/" or be empty',
			);
		}

		return pointer
			.split('/')
			.slice(1)
			.map((token) => token.replace(/~1/g, '/').replace(/~0/g, '~'));
	}

	/**
	 * Formats tokens into a JSON Pointer string.
	 */
	static format(tokens: string[]): string {
		if (tokens.length === 0) {
			return '';
		}

		return (
			'/' +
			tokens
				.map((token) =>
					token.toString().replace(/~/g, '~0').replace(/\//g, '~1'),
				)
				.join('/')
		);
	}

	/**
	 * Evaluates the pointer against a JSON object.
	 */
	evaluate(root: any): any {
		let current = root;

		for (const token of this.tokens) {
			if (current === null || typeof current !== 'object') {
				return undefined;
			}

			if (Array.isArray(current)) {
				const index = parseInt(token, 10);
				if (isNaN(index) || index < 0 || index >= current.length) {
					return undefined;
				}
				current = current[index];
			} else {
				if (!(token in current)) {
					return undefined;
				}
				current = current[token];
			}
		}

		return current;
	}

	/**
	 * Returns the tokens of this pointer.
	 */
	getTokens(): string[] {
		return [...this.tokens];
	}

	/**
	 * Returns the string representation of this pointer.
	 */
	toString(): string {
		return JSONPointer.format(this.tokens);
	}
}

/**
 * Helper to evaluate a JSON Pointer string against a root object.
 */
export function evaluatePointer(root: any, pointer: string): any {
	return new JSONPointer(pointer).evaluate(root);
}
