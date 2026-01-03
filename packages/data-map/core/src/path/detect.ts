import type { PathType } from '../types';

/**
 * Spec §4.3 (must match exactly)
 */
export function detectPathType(input: string): PathType {
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
