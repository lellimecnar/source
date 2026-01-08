import type { PathType } from '../types';

const DETECT_PATH_TYPE_CACHE_MAX_SIZE = 10_000;
const detectPathTypeCache = new Map<string, PathType>();

function detectPathTypeUncached(input: string): PathType {
	if (input === '' || input.startsWith('/')) {
		return 'pointer';
	}

	if (input.startsWith('#/') || input === '#') {
		return 'pointer';
	}

	if (/^\d+(#|\/|$)/.test(input)) {
		return 'relative-pointer';
	}

	return 'jsonpath';
}

/**
 * Spec §4.3 (must match exactly)
 */
export function detectPathType(input: string): PathType {
	const cached = detectPathTypeCache.get(input);
	if (cached !== undefined) return cached;

	const result = detectPathTypeUncached(input);

	if (detectPathTypeCache.size >= DETECT_PATH_TYPE_CACHE_MAX_SIZE) {
		// Simple bounded-cache behavior: clear all entries.
		detectPathTypeCache.clear();
	}

	detectPathTypeCache.set(input, result);
	return result;
}
