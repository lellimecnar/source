/**
 * @jsonpath/pointer
 *
 * Resolution variants for JSON Pointer (RFC 6901).
 *
 * @packageDocumentation
 */

import { JSONPointer } from './pointer.js';

/**
 * Resolves a pointer against data. Returns undefined if not found.
 */
export function resolve<T = any>(
	data: any,
	pointer: string | string[],
): T | undefined {
	return new JSONPointer(pointer).evaluate(data);
}

/**
 * Resolves a pointer against data. Throws if not found.
 */
export function resolveOrThrow<T = any>(
	data: any,
	pointer: string | string[],
): T {
	const result = resolve<T>(data, pointer);
	if (result === undefined) {
		throw new Error(`Pointer not found: ${pointer}`);
	}
	return result;
}

/**
 * Returns true if the pointer exists in the data.
 */
export function exists(data: any, pointer: string | string[]): boolean {
	const tokens = Array.isArray(pointer) ? pointer : JSONPointer.parse(pointer);
	let current = data;

	for (const token of tokens) {
		if (current === null || typeof current !== 'object') {
			return false;
		}

		if (Array.isArray(current)) {
			if (!/^(0|[1-9][0-9]*)$/.test(token)) {
				return false;
			}
			const index = parseInt(token, 10);
			if (index < 0 || index >= current.length) {
				return false;
			}
			current = current[index];
		} else {
			if (!(token in current)) {
				return false;
			}
			current = current[token];
		}
	}

	return true;
}

/**
 * Resolves a pointer and returns the value along with its parent and key.
 */
export function resolveWithParent(
	data: any,
	pointer: string | string[],
): { value: any; parent: any; key: string | number | undefined } {
	const tokens = Array.isArray(pointer) ? pointer : JSONPointer.parse(pointer);
	if (tokens.length === 0) {
		return { value: data, parent: undefined, key: undefined };
	}

	const parentTokens = tokens.slice(0, -1);
	const lastKey = tokens[tokens.length - 1]!;
	const parent = new JSONPointer(parentTokens).evaluate(data);

	if (parent === undefined || parent === null || typeof parent !== 'object') {
		return { value: undefined, parent: undefined, key: undefined };
	}

	let value: any;
	let key: string | number = lastKey;

	if (Array.isArray(parent)) {
		if (!/^(0|[1-9][0-9]*)$/.test(lastKey)) {
			return { value: undefined, parent: undefined, key: undefined };
		}
		key = parseInt(lastKey, 10);
		value = parent[key];
	} else {
		value = parent[lastKey];
	}

	return { value, parent, key };
}
