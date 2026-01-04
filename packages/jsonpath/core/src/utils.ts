/**
 * @jsonpath/core
 *
 * Utility functions for JSON operations.
 *
 * @packageDocumentation
 */

import type { JSONObject, JSONArray, JSONPrimitive } from './types.js';

/**
 * Checks if a value is a JSON object.
 */
export function isObject(value: unknown): value is JSONObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Checks if a value is a JSON array.
 */
export function isArray(value: unknown): value is JSONArray {
	return Array.isArray(value);
}

/**
 * Checks if a value is a JSON primitive.
 */
export function isPrimitive(value: unknown): value is JSONPrimitive {
	return (
		value === null ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	);
}

/**
 * Performs a deep equality check between two values.
 * Handles circular references by returning false if detected.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
	const seen = new Set<unknown>();

	function compare(x: unknown, y: unknown): boolean {
		if (x === y) return true;

		if (typeof x !== typeof y) return false;

		if (isPrimitive(x) || isPrimitive(y)) {
			return x === y;
		}

		if (seen.has(x) || seen.has(y)) {
			// Circular reference detected.
			// In a pure JSON context, this shouldn't happen, but we handle it for safety.
			return false;
		}

		if (isArray(x) && isArray(y)) {
			if (x.length !== y.length) return false;
			seen.add(x);
			seen.add(y);
			for (let i = 0; i < x.length; i++) {
				if (!compare(x[i], y[i])) return false;
			}
			return true;
		}

		if (isObject(x) && isObject(y)) {
			const keysX = Object.keys(x);
			const keysY = Object.keys(y);
			if (keysX.length !== keysY.length) return false;

			seen.add(x);
			seen.add(y);
			for (const key of keysX) {
				if (!Object.prototype.hasOwnProperty.call(y, key)) return false;
				if (!compare(x[key], y[key])) return false;
			}
			return true;
		}

		return false;
	}

	return compare(a, b);
}

/**
 * Creates a deep clone of a JSON value.
 */
export function deepClone<T>(value: T): T {
	if (isPrimitive(value)) {
		return value;
	}

	if (typeof structuredClone === 'function') {
		try {
			return structuredClone(value);
		} catch {
			// Fallback for environments where structuredClone might fail on some objects
		}
	}

	if (isArray(value)) {
		return value.map((item) => deepClone(item)) as unknown as T;
	}

	if (isObject(value)) {
		const clone: JSONObject = {};
		for (const key in value) {
			if (Object.prototype.hasOwnProperty.call(value, key)) {
				const val = value[key];
				if (val !== undefined) {
					clone[key] = deepClone(val);
				}
			}
		}
		return clone as unknown as T;
	}

	return value;
}

/**
 * Recursively freezes a JSON value.
 */
export function freeze<T>(value: T): Readonly<T> {
	if (isPrimitive(value) || Object.isFrozen(value)) {
		return value as Readonly<T>;
	}

	Object.freeze(value);

	if (isArray(value)) {
		for (const item of value) {
			freeze(item);
		}
	} else if (isObject(value)) {
		for (const key in value) {
			if (Object.prototype.hasOwnProperty.call(value, key)) {
				freeze(value[key]);
			}
		}
	}

	return value as Readonly<T>;
}
