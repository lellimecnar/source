import type { Pointer } from './types.js';

export type SimpleJsonPathToken =
	| { type: 'prop'; key: string }
	| { type: 'index'; index: number }
	| { type: 'wildcardIndex' }
	| { type: 'wildcardProp' };

export interface PointerIterableStore {
	keys: (prefix?: Pointer) => IterableIterator<Pointer>;
}

function isDigit(c: string): boolean {
	return c >= '0' && c <= '9';
}

function isIdentStart(c: string): boolean {
	return /[A-Za-z_$]/.test(c);
}

function isIdentContinue(c: string): boolean {
	return /[A-Za-z0-9_$]/.test(c);
}

function escapePointerSegment(seg: string): string {
	return seg.replaceAll('~', '~0').replaceAll('/', '~1');
}

function parseQuotedString(
	input: string,
	start: number,
): {
	value: string;
	end: number;
} | null {
	const quote = input[start];
	if (quote !== '"' && quote !== "'") return null;
	let i = start + 1;
	let out = '';
	while (i < input.length) {
		const ch = input[i] ?? '';
		if (ch === quote) return { value: out, end: i + 1 };
		if (ch === '\\') {
			const next = input[i + 1] ?? '';
			// Minimal escape support; enough for typical JSONPath usage.
			out += next;
			i += 2;
			continue;
		}
		out += ch;
		i++;
	}
	return null;
}

/**
 * Parses a restricted JSONPath subset that can be executed directly against a
 * flat pointer store without materializing the full object.
 *
 * Supported:
 * - $ (root)
 * - .prop
 * - .*
 * - ['prop'] / ["prop"]
 * - ['*'] / ["*"]
 * - [0]
 * - [*]
 *
 * Everything else (filters, unions, slices, recursive descent, functions, etc)
 * returns null.
 */
export function parseSimpleJsonPath(
	path: string,
): SimpleJsonPathToken[] | null {
	if (!path.startsWith('$')) return null;
	let i = 1;
	const tokens: SimpleJsonPathToken[] = [];

	while (i < path.length) {
		const ch = path[i] ?? '';
		if (ch === '.') {
			if ((path[i + 1] ?? '') === '.') return null; // recursive descent
			i++;
			// Handle .* directly
			if (path[i] === '*') {
				i++;
				tokens.push({ type: 'wildcardProp' });
				continue;
			}
			// Handle normal property names
			const start = i;
			if (!isIdentStart(path[i] ?? '')) return null;
			i++;
			while (i < path.length && isIdentContinue(path[i] ?? '')) i++;
			const key = path.slice(start, i);
			tokens.push({ type: 'prop', key });
			continue;
		}

		if (ch === '[') {
			i++;
			const next = path[i] ?? '';
			if (next === '*') {
				i++;
				if ((path[i] ?? '') !== ']') return null;
				i++;
				tokens.push({ type: 'wildcardIndex' });
				continue;
			}

			if (next === '"' || next === "'") {
				const parsed = parseQuotedString(path, i);
				if (!parsed) return null;
				i = parsed.end;
				if ((path[i] ?? '') !== ']') return null;
				i++;
				if (parsed.value === '*') {
					tokens.push({ type: 'wildcardProp' });
				} else {
					tokens.push({ type: 'prop', key: parsed.value });
				}
				continue;
			}

			if (isDigit(next)) {
				const start = i;
				while (i < path.length && isDigit(path[i] ?? '')) i++;
				const num = Number(path.slice(start, i));
				if (!Number.isFinite(num)) return null;
				if ((path[i] ?? '') !== ']') return null;
				i++;
				tokens.push({ type: 'index', index: num });
				continue;
			}

			// filters, slices, unions, etc.
			return null;
		}

		// whitespace or unexpected token => treat as complex
		return null;
	}

	return tokens;
}

function collectImmediateChildSegments(
	store: PointerIterableStore,
	basePointer: Pointer,
): string[] {
	const out = new Set<string>();
	const prefix = basePointer === '' ? '/' : `${basePointer}/`;

	for (const key of store.keys(basePointer)) {
		if (!key.startsWith(prefix)) continue;
		const rest = key.slice(prefix.length);
		const seg = rest.split('/')[0];
		if (seg && seg.length > 0) out.add(seg);
	}

	return Array.from(out.values());
}

export function* iteratePointersForSimpleJsonPath(
	store: PointerIterableStore,
	tokens: SimpleJsonPathToken[],
): IterableIterator<Pointer> {
	let pointers: Pointer[] = [''];

	for (const token of tokens) {
		if (token.type === 'prop') {
			const esc = escapePointerSegment(token.key);
			pointers = pointers.map((p) => `${p}/${esc}`);
			continue;
		}

		if (token.type === 'index') {
			pointers = pointers.map((p) => `${p}/${token.index}`);
			continue;
		}

		if (token.type === 'wildcardIndex') {
			const next: Pointer[] = [];
			for (const base of pointers) {
				const children = collectImmediateChildSegments(store, base)
					.filter((s) => /^\d+$/.test(s))
					.sort((a, b) => Number(a) - Number(b));
				for (const seg of children) {
					next.push(`${base}/${seg}`);
				}
			}
			pointers = next;
			continue;
		}

		// wildcardProp: expand to all non-numeric immediate children
		if (token.type === 'wildcardProp') {
			const next: Pointer[] = [];
			for (const base of pointers) {
				const children = collectImmediateChildSegments(store, base)
					.filter((s) => !/^\d+$/.test(s))
					.sort();
				for (const seg of children) {
					const esc = escapePointerSegment(seg);
					next.push(`${base}/${esc}`);
				}
			}
			pointers = next;
			continue;
		}
	}

	for (const p of pointers) yield p;
}
