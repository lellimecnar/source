/**
 * @jsonpath/pointer
 *
 * Utility functions for JSON Pointer (RFC 6901).
 *
 * @packageDocumentation
 */

import { JSONPointer } from './pointer.js';

/**
 * Returns the parent pointer of a given pointer.
 */
export function parent(pointer: string): string {
	const tokens = JSONPointer.parse(pointer);
	if (tokens.length === 0) return '';
	return JSONPointer.format(tokens.slice(0, -1));
}

/**
 * Joins multiple pointer segments or pointers into a single pointer.
 */
export function join(...parts: string[]): string {
	const allTokens: string[] = [];
	for (const part of parts) {
		if (part === '') continue;
		if (part.startsWith('/')) {
			allTokens.push(...JSONPointer.parse(part));
		} else {
			allTokens.push(part);
		}
	}
	return JSONPointer.format(allTokens);
}

/**
 * Splits a pointer into its constituent tokens.
 */
export function split(pointer: string): string[] {
	return JSONPointer.parse(pointer);
}

/**
 * Escapes a token for use in a JSON Pointer.
 */
export function escape(token: string): string {
	return token.replace(/~/g, '~0').replace(/\//g, '~1');
}

/**
 * Unescapes a JSON Pointer token.
 */
export function unescape(token: string): string {
	return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

/**
 * Converts a JSON Pointer to a normalized JSONPath.
 */
export function toNormalizedPath(pointer: string): string {
	const tokens = JSONPointer.parse(pointer);
	let out = '$';
	for (const token of tokens) {
		if (/^(0|[1-9][0-9]*)$/.test(token)) {
			out += `[${token}]`;
		} else {
			const escaped = token
				.replace(/\\/g, '\\\\')
				.replace(/'/g, "\\'")
				.replace(/\x08/g, '\\b')
				.replace(/\x0c/g, '\\f')
				.replace(/\n/g, '\\n')
				.replace(/\r/g, '\\r')
				.replace(/\t/g, '\\t')
				.replace(/[\u0000-\u001f]/g, (c) => {
					return `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`;
				});
			out += `['${escaped}']`;
		}
	}
	return out;
}

/**
 * Converts a normalized JSONPath to a JSON Pointer.
 */
export function fromNormalizedPath(path: string): string {
	if (!path.startsWith('$')) {
		throw new Error('Invalid normalized path: must start with "$"');
	}

	const tokens: string[] = [];
	let i = 1;

	while (i < path.length) {
		if (path[i] === '[') {
			i++;
			if (path[i] === "'") {
				// String property
				i++;
				let token = '';
				while (i < path.length && path[i] !== "'") {
					if (path[i] === '\\') {
						i++;
						if (path[i] === "'") token += "'";
						else if (path[i] === '\\') token += '\\';
						else if (path[i] === 'b') token += '\x08';
						else if (path[i] === 'f') token += '\x0c';
						else if (path[i] === 'n') token += '\n';
						else if (path[i] === 'r') token += '\r';
						else if (path[i] === 't') token += '\t';
						else if (path[i] === 'u') {
							const hex = path.slice(i + 1, i + 5);
							token += String.fromCharCode(parseInt(hex, 16));
							i += 4;
						}
					} else {
						token += path[i];
					}
					i++;
				}
				tokens.push(token);
				i++; // skip '
			} else {
				// Number index
				let token = '';
				while (i < path.length && path[i] !== ']') {
					token += path[i];
					i++;
				}
				tokens.push(token);
			}
			if (path[i] !== ']') {
				throw new Error('Invalid normalized path: missing "]"');
			}
			i++;
		} else {
			throw new Error(`Invalid normalized path at position ${i}`);
		}
	}

	return JSONPointer.format(tokens);
}
