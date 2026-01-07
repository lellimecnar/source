/**
 * @jsonpath/core
 *
 * Fast cloning utilities.
 *
 * `fastDeepClone` is optimized for JSON-shaped data (plain objects + arrays + primitives).
 * It intentionally does NOT use `structuredClone` for predictable performance.
 *
 * @packageDocumentation
 */

import { isArray, isObject, isPrimitive } from './utils.js';

export function fastDeepClone<T>(value: T): T {
	if (isPrimitive(value)) return value;

	if (isArray(value)) {
		const out = new Array(value.length);
		for (let i = 0; i < value.length; i++) {
			out[i] = fastDeepClone(value[i]);
		}
		return out as unknown as T;
	}

	if (isObject(value)) {
		const out: Record<string, unknown> = {};
		for (const key in value) {
			if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
			const v = (value as Record<string, unknown>)[key];
			if (v !== undefined) {
				out[key] = fastDeepClone(v);
			}
		}
		return out as unknown as T;
	}

	// Non-JSON objects (Date, Map, etc) are returned as-is (consistent with deepClone fallback).
	return value;
}
