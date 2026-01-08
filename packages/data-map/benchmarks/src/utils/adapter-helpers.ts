import type { BaseAdapter } from '../adapters/types.js';

export function benchKey(params: {
	category: string;
	caseName: string;
	adapterName: string;
}): string {
	return `${params.category}.${params.caseName}.${params.adapterName}`;
}

export function ensureNonEmptyString(value: unknown, label: string): string {
	if (typeof value !== 'string' || value.trim() === '') {
		throw new Error(`${label} must be a non-empty string`);
	}
	return value;
}

export function safeSmokeTest(adapters: readonly BaseAdapter[]): {
	passed: string[];
	failed: string[];
} {
	const passed: string[] = [];
	const failed: string[] = [];

	for (const a of adapters) {
		try {
			// @ts-expect-error smokeTest is required by all concrete adapters.
			const ok = Boolean(a.smokeTest());
			if (ok) passed.push(a.name);
			else failed.push(a.name);
		} catch {
			failed.push(a.name);
		}
	}

	return { passed, failed };
}

/**
 * Convert a dot/bracket path to a JSON-pointer-like string.
 *
 * Supported:
 * - "a.b.c"
 * - "a[0].b"
 * - "a[0][1]"
 * - already-pointer: "/a/b/0" (returned as-is)
 */
export function dotPathToPointer(path: string): string {
	ensureNonEmptyString(path, 'path');
	if (path.startsWith('/')) return path;

	const parts: string[] = [];
	let buf = '';
	let i = 0;
	while (i < path.length) {
		const ch = path[i];
		if (ch === '.') {
			if (buf.length) {
				parts.push(buf);
				buf = '';
			}
			i++;
			continue;
		}
		if (ch === '[') {
			if (buf.length) {
				parts.push(buf);
				buf = '';
			}
			const end = path.indexOf(']', i);
			if (end === -1) throw new Error('Unclosed bracket in path');
			const inner = path.slice(i + 1, end);
			parts.push(inner);
			i = end + 1;
			continue;
		}
		buf += ch;
		i++;
	}
	if (buf.length) parts.push(buf);

	return `/${parts.map(encodePointerSegment).join('/')}`;
}

function encodePointerSegment(seg: string): string {
	// RFC6901 escaping
	return seg.replace(/~/g, '~0').replace(/\//g, '~1');
}
