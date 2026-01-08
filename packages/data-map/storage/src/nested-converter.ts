import type { Pointer } from './types.js';
import { ensureArrayMeta } from './array-metadata.js';

export function ingestNested(
	data: Map<Pointer, unknown>,
	versions: Map<Pointer, number>,
	arrays: Map<Pointer, any>,
	root: unknown,
	basePointer = '',
): void {
	if (Array.isArray(root)) {
		const meta = ensureArrayMeta(arrays, basePointer);
		meta.length = root.length;
		meta.indices = Array.from({ length: root.length }, (_, i) => i);
		for (let i = 0; i < root.length; i++) {
			ingestNested(data, versions, arrays, root[i], `${basePointer}/${i}`);
		}
		return;
	}

	if (root !== null && typeof root === 'object') {
		for (const [k, v] of Object.entries(root as Record<string, unknown>)) {
			ingestNested(
				data,
				versions,
				arrays,
				v,
				`${basePointer}/${escapeSegment(k)}`,
			);
		}
		return;
	}

	data.set(basePointer, root);
	versions.set(basePointer, (versions.get(basePointer) ?? 0) + 1);
}

function escapeSegment(seg: string): string {
	return seg.replaceAll('~', '~0').replaceAll('/', '~1');
}

export function materializeNested(data: Map<Pointer, unknown>): unknown {
	const root: any = {};
	for (const [ptr, value] of data.entries()) {
		if (ptr === '') continue;
		const segs = ptr.split('/').slice(1).map(unescapeSegment);
		let cur: any = root;
		for (let i = 0; i < segs.length; i++) {
			const s = segs[i] ?? '';
			const isLast = i === segs.length - 1;
			const nextIsIndex = !isLast && isNumeric(segs[i + 1] ?? '');

			if (isLast) {
				if (isNumeric(s)) {
					if (!Array.isArray(cur)) cur = forceArray(cur);
					(cur as unknown[])[Number(s)] = value;
				} else {
					cur[s] = value;
				}
				break;
			}

			if (isNumeric(s)) {
				if (!Array.isArray(cur)) cur = forceArray(cur);
				cur[Number(s)] ??= nextIsIndex ? [] : {};
				cur = cur[Number(s)];
			} else {
				cur[s] ??= nextIsIndex ? [] : {};
				cur = cur[s];
			}
		}
	}
	return root;
}

function unescapeSegment(seg: string): string {
	return seg.replaceAll('~1', '/').replaceAll('~0', '~');
}

function isNumeric(s: string): boolean {
	return /^\d+$/.test(s);
}

function forceArray(obj: any): any[] {
	// minimal helper: if this happens, object reconstruction has ambiguous structure
	return Array.isArray(obj) ? obj : [];
}
