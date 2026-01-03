import { compilePredicate } from './predicate';
import type { PathSegment, StaticSegment, IndexSegment } from './segments';
import { escapePointerSegment } from '../utils/pointer';

export interface CompiledPathPattern {
	readonly source: string;
	readonly segments: readonly PathSegment[];
	readonly isSingular: boolean;
	readonly hasRecursiveDescent: boolean;
	readonly hasFilters: boolean;
	readonly concretePrefix: readonly (StaticSegment | IndexSegment)[];
	readonly concretePrefixPointer: string;
	readonly structuralDependencies: readonly string[];

	match: (
		pointer: string,
		getValue: (p: string) => unknown,
	) => {
		matches: boolean;
		reason?: string;
		matchDepth?: number;
		failedAtDepth?: number;
	};

	expand: (data: unknown) => string[];
}

const patternCache = new Map<string, CompiledPathPattern>();

function isIndexSeg(s: string): boolean {
	return /^-?\d+$/.test(s);
}

function splitPointer(pointer: string): string[] {
	if (pointer === '' || pointer === '#') return [];
	const raw = pointer.startsWith('#/') ? pointer.slice(1) : pointer;
	if (raw === '') return [];
	if (!raw.startsWith('/')) return [];
	return raw
		.slice(1)
		.split('/')
		.map((seg) => seg.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function toPointerPrefix(
	segments: readonly (StaticSegment | IndexSegment)[],
): string {
	if (segments.length === 0) return '';
	const parts = segments.map((seg) =>
		seg.type === 'static' ? escapePointerSegment(seg.value) : String(seg.value),
	);
	return `/${parts.join('/')}`;
}

function computeConcretePrefix(
	segments: readonly PathSegment[],
): (StaticSegment | IndexSegment)[] {
	const prefix: (StaticSegment | IndexSegment)[] = [];
	for (const s of segments) {
		if (s.type === 'static' || s.type === 'index') {
			prefix.push(s);
			continue;
		}
		break;
	}
	return prefix;
}

function computeStructuralDeps(segments: readonly PathSegment[]): string[] {
	const prefix = computeConcretePrefix(segments);
	const pointer = toPointerPrefix(prefix);
	if (pointer === '') return [''];
	return [pointer];
}

function parseJsonPathToSegments(source: string): PathSegment[] {
	if (!source.startsWith('$')) {
		throw new Error(`Invalid JSONPath: ${source}`);
	}

	let i = 1;
	const segs: PathSegment[] = [];

	const readIdent = (): string => {
		const start = i;
		while (i < source.length && /[A-Za-z0-9_$]/.test(source[i]!)) i++;
		return source.slice(start, i);
	};

	while (i < source.length) {
		if (source.startsWith('..', i)) {
			i += 2;
			let following: PathSegment[] = [];
			if (source[i] === '[') {
				const close = source.indexOf(']', i);
				const inside = source.slice(i + 1, close).trim();
				i = close + 1;
				if (inside === '*') {
					following = [{ type: 'wildcard' }];
				} else if (isIndexSeg(inside)) {
					following = [{ type: 'index', value: Number(inside) }];
				} else {
					following = [
						{ type: 'static', value: inside.replace(/^['"]|['"]$/g, '') },
					];
				}
			} else if (source[i] === '*') {
				i++;
				following = [{ type: 'wildcard' }];
			} else {
				const name = readIdent();
				if (name) {
					following = [{ type: 'static', value: name }];
				}
			}
			segs.push({ type: 'recursive', following });
			continue;
		}

		if (source[i] === '.') {
			i++;
			if (source[i] === '*') {
				i++;
				segs.push({ type: 'wildcard' });
				continue;
			}
			const name = readIdent();
			segs.push({ type: 'static', value: name });
			continue;
		}

		if (source[i] === '[') {
			const close = source.indexOf(']', i);
			if (close === -1) throw new Error(`Invalid JSONPath: ${source}`);
			const inside = source.slice(i + 1, close).trim();
			i = close + 1;

			if (inside === '*' || inside === "'*'" || inside === '"*"') {
				segs.push({ type: 'wildcard' });
				continue;
			}

			if (inside.startsWith('?(')) {
				if (!inside.endsWith(')')) {
					throw new Error(`Invalid filter: ${inside}`);
				}
				const expr = inside.slice(2, -1).trim();
				const { predicate, hash } = compilePredicate(expr);
				segs.push({ type: 'filter', predicate, expression: expr, hash });
				continue;
			}

			if (inside.includes(':')) {
				const [a, b, c] = inside.split(':');
				const start = a === '' ? undefined : Number(a);
				const end = b === '' ? undefined : Number(b);
				const step = c === undefined || c === '' ? 1 : Number(c);
				segs.push({ type: 'slice', start, end, step });
				continue;
			}

			if (isIndexSeg(inside)) {
				segs.push({ type: 'index', value: Number(inside) });
				continue;
			}

			const unquoted = inside.replace(/^['"]|['"]$/g, '');
			segs.push({ type: 'static', value: unquoted });
			continue;
		}

		throw new Error(`Unsupported JSONPath syntax: ${source}`);
	}

	return segs;
}

export function compilePathPattern(jsonpath: string): CompiledPathPattern {
	const cached = patternCache.get(jsonpath);
	if (cached) return cached;

	const segments = parseJsonPathToSegments(jsonpath);
	const isSingular = segments.every(
		(s) => s.type === 'static' || s.type === 'index',
	);
	const hasRecursiveDescent = segments.some((s) => s.type === 'recursive');
	const hasFilters = segments.some((s) => s.type === 'filter');
	const concretePrefix = computeConcretePrefix(segments);
	const concretePrefixPointer = toPointerPrefix(concretePrefix);
	const structuralDependencies = computeStructuralDeps(segments);

	const pattern: CompiledPathPattern = {
		source: jsonpath,
		segments,
		isSingular,
		hasRecursiveDescent,
		hasFilters,
		concretePrefix,
		concretePrefixPointer,
		structuralDependencies,
		match: (pointer, getValue) => {
			const pointerSegs = splitPointer(pointer);
			return matchSegments(segments, pointerSegs, getValue);
		},
		expand: (data) => expandSegments(segments, data, ''),
	};

	patternCache.set(jsonpath, pattern);
	return pattern;
}

function matchSegments(
	patternSegments: readonly PathSegment[],
	pointerSegments: readonly string[],
	getValue: (p: string) => unknown,
): {
	matches: boolean;
	reason?: string;
	matchDepth?: number;
	failedAtDepth?: number;
} {
	let pIdx = 0;
	for (let sIdx = 0; sIdx < patternSegments.length; sIdx++) {
		const seg = patternSegments[sIdx]!;

		if (seg.type === 'recursive') {
			const remainingPattern = patternSegments.slice(sIdx + 1);
			const remainingPointer = pointerSegments.slice(pIdx);
			return matchRecursive(
				seg.following,
				remainingPattern,
				remainingPointer,
				getValue,
			);
		}

		const ptr = pointerSegments[pIdx];
		if (ptr === undefined)
			return { matches: false, reason: 'segment-count', failedAtDepth: sIdx };

		if (seg.type === 'static') {
			if (ptr !== seg.value)
				return {
					matches: false,
					reason: 'static-mismatch',
					failedAtDepth: sIdx,
				};
			pIdx++;
			continue;
		}

		if (seg.type === 'index') {
			if (!/^\d+$/.test(ptr) || Number(ptr) !== seg.value)
				return {
					matches: false,
					reason: 'index-mismatch',
					failedAtDepth: sIdx,
				};
			pIdx++;
			continue;
		}

		if (seg.type === 'wildcard') {
			pIdx++;
			continue;
		}

		if (seg.type === 'slice') {
			if (!/^\d+$/.test(ptr))
				return {
					matches: false,
					reason: 'slice-non-index',
					failedAtDepth: sIdx,
				};
			const index = Number(ptr);
			const start = seg.start ?? 0;
			const end = seg.end ?? Number.POSITIVE_INFINITY;
			const step = seg.step;
			const inRange =
				index >= start && index < end && (index - start) % step === 0;
			if (!inRange)
				return {
					matches: false,
					reason: 'slice-out-of-range',
					failedAtDepth: sIdx,
				};
			pIdx++;
			continue;
		}

		if (seg.type === 'filter') {
			const parentPtr =
				`/${pointerSegments.slice(0, pIdx).map(escapePointerSegment).join('/')}`.replace(
					/^\/$/,
					'',
				);
			const fullPtr = `/${pointerSegments
				.slice(0, pIdx + 1)
				.map(escapePointerSegment)
				.join('/')}`.replace(/^\/$/, '');
			const value = getValue(fullPtr);
			const parent = getValue(parentPtr);
			const key = /^\d+$/.test(ptr) ? Number(ptr) : ptr;
			if (!seg.predicate(value, key, (parent as any) ?? {})) {
				return {
					matches: false,
					reason: 'filter-rejected',
					failedAtDepth: sIdx,
				};
			}
			pIdx++;
			continue;
		}
	}

	if (pIdx !== pointerSegments.length)
		return { matches: false, reason: 'segment-count' };
	return { matches: true, matchDepth: pIdx };
}

function matchRecursive(
	following: readonly PathSegment[],
	remainingPattern: readonly PathSegment[],
	pointerSegments: readonly string[],
	getValue: (p: string) => unknown,
): { matches: boolean; matchDepth?: number } {
	// Try matching the 'following' + 'remainingPattern' at every possible depth of pointerSegments
	for (let depth = 0; depth <= pointerSegments.length; depth++) {
		const subPointer = pointerSegments.slice(depth);
		const res = matchSegments(
			[...following, ...remainingPattern],
			subPointer,
			getValue,
		);
		if (res.matches) {
			return { matches: true, matchDepth: depth + (res.matchDepth ?? 0) };
		}
	}
	return { matches: false };
}

function expandSegments(
	segments: readonly PathSegment[],
	data: unknown,
	basePointer: string,
): string[] {
	if (data === undefined) return [];
	if (segments.length === 0) return [basePointer];
	const [head, ...tail] = segments;
	if (!head) return [basePointer];

	const addPtr = (ptr: string, seg: string | number) =>
		ptr === ''
			? `/${escapePointerSegment(String(seg))}`
			: `${ptr}/${escapePointerSegment(String(seg))}`;

	if (head.type === 'static') {
		const child = (data as any)?.[head.value];
		return expandSegments(tail, child, addPtr(basePointer, head.value));
	}

	if (head.type === 'index') {
		const arr = Array.isArray(data) ? data : [];
		const idx = head.value < 0 ? arr.length + head.value : head.value;
		return expandSegments(tail, arr[idx], addPtr(basePointer, idx));
	}

	if (head.type === 'wildcard') {
		if (Array.isArray(data)) {
			return data.flatMap((v, idx) =>
				expandSegments(tail, v, addPtr(basePointer, idx)),
			);
		}
		if (typeof data === 'object' && data !== null) {
			return Object.keys(data as any).flatMap((k) =>
				expandSegments(tail, (data as any)[k], addPtr(basePointer, k)),
			);
		}
		return [];
	}

	if (head.type === 'slice') {
		const arr = Array.isArray(data) ? data : [];
		const start = head.start ?? 0;
		const end = head.end ?? arr.length;
		const step = head.step;
		const out: string[] = [];
		for (let idx = start; idx < Math.min(end, arr.length); idx += step) {
			out.push(...expandSegments(tail, arr[idx], addPtr(basePointer, idx)));
		}
		return out;
	}

	if (head.type === 'filter') {
		const arr = Array.isArray(data) ? data : [];
		const out: string[] = [];
		for (let idx = 0; idx < arr.length; idx++) {
			const v = arr[idx];
			if (head.predicate(v, idx, arr)) {
				out.push(...expandSegments(tail, v, addPtr(basePointer, idx)));
			}
		}
		return out;
	}

	if (head.type === 'recursive') {
		const out: string[] = [];
		const walk = (curr: unknown, ptr: string) => {
			// Try matching following + tail here
			const res = expandSegments([...head.following, ...tail], curr, ptr);
			out.push(...res);

			// Recurse
			if (Array.isArray(curr)) {
				curr.forEach((v, i) => {
					walk(v, addPtr(ptr, i));
				});
			} else if (typeof curr === 'object' && curr !== null) {
				Object.keys(curr).forEach((k) => {
					walk((curr as any)[k], addPtr(ptr, k));
				});
			}
		};
		walk(data, basePointer);
		return [...new Set(out)]; // Dedupe
	}

	return [];
}
