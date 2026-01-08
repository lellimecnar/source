import { createDataMap } from '@data-map/core';

import type { PathAdapter } from './types.js';

function escapePointerSegment(seg: string): string {
	return seg.replace(/~/g, '~0').replace(/\//g, '~1');
}

function dotToPointer(dotPath: string): string {
	if (dotPath === '') return '';
	const parts = dotPath.split('.').filter(Boolean).map(escapePointerSegment);
	return `/${parts.join('/')}`;
}

function normalizePath(path: string): string {
	return path.startsWith('/') ? path : dotToPointer(path);
}

export const dataMapPathAdapter: PathAdapter = {
	kind: 'path',
	name: 'data-map',
	features: {
		mutatesInput: false,
		pathSyntax: 'both',
	},
	get: (obj, path) => {
		const dm = createDataMap(structuredClone((obj ?? {}) as any));
		return dm.get(normalizePath(path));
	},
	set: (obj, path, value) => {
		const dm = createDataMap(structuredClone((obj ?? {}) as any));
		dm.set(normalizePath(path), value);
		return dm.toObject();
	},
	has: (obj, path) => {
		const dm = createDataMap(structuredClone((obj ?? {}) as any));
		return dm.has(normalizePath(path));
	},
	del: (obj, path) => {
		const dm = createDataMap(structuredClone((obj ?? {}) as any));
		dm.delete(normalizePath(path));
		return dm.toObject();
	},
	smokeTest: () => {
		const base = { a: { b: 1 } };
		const next = dataMapPathAdapter.set(base, 'a.b', 2) as any;
		return base.a.b === 1 && next.a.b === 2;
	},
};
