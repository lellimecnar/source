import type { CompiledPattern, Pointer } from './types.js';
import { validateQuery } from '@jsonpath/jsonpath';

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function compilePattern(path: string): CompiledPattern {
	// Ensure it's at least parseable JSONPath.
	const v = validateQuery(path);
	if (!v.valid) {
		throw new Error(v.error ?? 'Invalid JSONPath');
	}

	if (path.startsWith('$..')) {
		const tail = path.slice(3);
		const seg = tail.startsWith('.') ? tail.slice(1) : tail;
		const rx = new RegExp(`(^|/)${escapeRegex(seg)}$`);
		return {
			pattern: path,
			kind: 'pattern',
			matchesPointer(pointer: Pointer) {
				return rx.test(pointer);
			},
		};
	}

	// Minimal JSONPath pattern support:
	// - $.a.b
	// - $.a[*].b
	// - $.a.*.b
	let ptrish = path;
	ptrish = ptrish.replace(/^\$\.?/, '/');
	ptrish = ptrish.replaceAll('..', '/**/');
	ptrish = ptrish.replaceAll('[*]', '/*');
	ptrish = ptrish.replaceAll('.', '/');

	const parts = ptrish.split('/').filter(Boolean);
	const rxParts = parts.map((p) => {
		if (p === '*') return '[^/]+';
		if (p === '**') return '.*';
		return escapeRegex(p);
	});

	const rx = new RegExp(`^/${rxParts.join('/')}$`);
	return {
		pattern: path,
		kind: 'pattern',
		matchesPointer(pointer: Pointer) {
			return rx.test(pointer);
		},
	};
}
