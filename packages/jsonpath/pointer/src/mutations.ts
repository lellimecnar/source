/**
 * @jsonpath/pointer
 *
 * Immutable mutation functions for JSON Pointer (RFC 6901).
 *
 * @packageDocumentation
 */

import { JSONPointer } from './pointer.js';

/**
 * Sets a value at the specified pointer in a JSON object.
 * Returns a new object with the value set.
 */
export function set<T>(data: T, pointer: string | string[], value: unknown): T {
	const tokens = Array.isArray(pointer) ? pointer : JSONPointer.parse(pointer);
	if (tokens.length === 0) {
		return value as T;
	}

	return setRecursive(data, tokens, value) as T;
}

function setRecursive(data: any, tokens: string[], value: unknown): any {
	if (tokens.length === 0) {
		return value;
	}

	const [token, ...rest] = tokens;
	const t = token!;

	if (Array.isArray(data)) {
		const index = parseIndex(t, data.length, 'set');
		const newData = [...data];
		newData[index] = setRecursive(data[index], rest, value);
		return newData;
	}

	if (data !== null && typeof data === 'object') {
		return {
			...data,
			[t]: setRecursive(data[t], rest, value),
		};
	}

	// If data is not an object/array, we create an object or array based on the next token
	const nextIsIndex = /^(0|[1-9][0-9]*)$/.test(t);
	if (nextIsIndex) {
		const index = parseInt(t, 10);
		const newData: any[] = [];
		newData[index] = setRecursive(undefined, rest, value);
		return newData;
	}

	return {
		[t]: setRecursive(undefined, rest, value),
	};
}

/**
 * Removes a value at the specified pointer in a JSON object.
 * Returns a new object with the value removed.
 */
export function remove<T>(data: T, pointer: string | string[]): T {
	const tokens = Array.isArray(pointer) ? pointer : JSONPointer.parse(pointer);
	if (tokens.length === 0) {
		return undefined as any;
	}

	return removeRecursive(data, tokens) as T;
}

function removeRecursive(data: any, tokens: string[]): any {
	if (data === null || typeof data !== 'object') {
		return data;
	}

	const [token, ...rest] = tokens;
	const t = token!;

	if (rest.length === 0) {
		if (Array.isArray(data)) {
			const index = parseIndex(t, data.length, 'remove');
			const newData = [...data];
			newData.splice(index, 1);
			return newData;
		}
		const { [t]: _, ...newData } = data;
		return newData;
	}

	if (Array.isArray(data)) {
		const index = parseIndex(t, data.length, 'remove');
		const newData = [...data];
		newData[index] = removeRecursive(data[index], rest);
		return newData;
	}

	return {
		...data,
		[t]: removeRecursive(data[t], rest),
	};
}

/**
 * Appends a value to an array at the specified pointer.
 * The pointer must point to an array or the '-' character.
 */
export function append<T>(
	data: T,
	pointer: string | string[],
	value: unknown,
): T {
	const tokens = Array.isArray(pointer) ? pointer : JSONPointer.parse(pointer);
	if (tokens.length === 0) {
		throw new Error('Cannot append to root');
	}

	const lastToken = tokens[tokens.length - 1];
	if (lastToken === '-') {
		const parentTokens = tokens.slice(0, -1);
		const parent = new JSONPointer(parentTokens).evaluate(data);
		if (!Array.isArray(parent)) {
			throw new Error('Parent must be an array to append with "-"');
		}
		return set(data, [...parentTokens, String(parent.length)], value);
	}

	const target = new JSONPointer(tokens).evaluate(data);
	if (!Array.isArray(target)) {
		throw new Error('Target must be an array to append');
	}

	return set(data, [...tokens, String(target.length)], value);
}

function parseIndex(
	token: string,
	length: number,
	operation: 'set' | 'remove',
): number {
	if (token === '-') {
		if (operation === 'set') return length;
		throw new Error('Invalid array index: "-"');
	}
	if (!/^(0|[1-9][0-9]*)$/.test(token)) {
		throw new Error(`Invalid array index: ${token}`);
	}
	const index = parseInt(token, 10);
	if (index < 0 || (operation === 'set' ? index > length : index >= length)) {
		throw new Error(`Index out of bounds: ${index}`);
	}
	return index;
}
