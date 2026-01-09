import { create } from 'mutative';

import type { ImmutableAdapter, ImmutableDraft } from './types.js';

function pointerToPath(pointer: string): (string | number)[] {
	if (!pointer.startsWith('/')) return pointer.split('.').filter(Boolean);
	return pointer
		.slice(1)
		.split('/')
		.filter(Boolean)
		.map((seg) => {
			const decoded = seg.replace(/~1/g, '/').replace(/~0/g, '~');
			const num = Number(decoded);
			return Number.isInteger(num) && num >= 0 ? num : decoded;
		});
}

function getByPath(obj: unknown, path: (string | number)[]): unknown {
	let current: unknown = obj;
	for (const seg of path) {
		if (current == null || typeof current !== 'object') return undefined;
		current = (current as Record<string | number, unknown>)[seg];
	}
	return current;
}

function setByPath(
	obj: unknown,
	path: (string | number)[],
	value: unknown,
): void {
	if (path.length === 0) return;
	let current: unknown = obj;
	for (let i = 0; i < path.length - 1; i++) {
		const seg = path[i];
		if (current == null || typeof current !== 'object') return;
		const next = (current as Record<string | number, unknown>)[seg];
		if (next == null || typeof next !== 'object') {
			const nextSeg = path[i + 1];
			(current as Record<string | number, unknown>)[seg] =
				typeof nextSeg === 'number' ? [] : {};
		}
		current = (current as Record<string | number, unknown>)[seg];
	}
	if (current != null && typeof current === 'object') {
		(current as Record<string | number, unknown>)[path[path.length - 1]] =
			value;
	}
}

function delByPath(obj: unknown, path: (string | number)[]): void {
	if (path.length === 0) return;
	let current: unknown = obj;
	for (let i = 0; i < path.length - 1; i++) {
		const seg = path[i];
		if (current == null || typeof current !== 'object') return;
		current = (current as Record<string | number, unknown>)[seg];
	}
	if (current != null && typeof current === 'object') {
		delete (current as Record<string | number, unknown>)[path[path.length - 1]];
	}
}

export const mutativeImmutableAdapter: ImmutableAdapter = {
	kind: 'immutable',
	name: 'mutative',
	features: {
		mutatesInput: false,
		pathSyntax: 'both',
	},
	produce: (base, recipe) => {
		return create(base as object, (draft: unknown) => {
			const mutativeDraft: ImmutableDraft = {
				get: (path) => getByPath(draft, pointerToPath(path)),
				set: (path, value) => {
					setByPath(draft, pointerToPath(path), value);
				},
				del: (path) => {
					delByPath(draft, pointerToPath(path));
				},
			};
			recipe(mutativeDraft);
		});
	},
	smokeTest: () => {
		const base = { a: { b: 1 } };
		const next = mutativeImmutableAdapter.produce(base, (d) => {
			d.set('/a/b', 2);
		}) as typeof base;
		return base.a.b === 1 && next.a.b === 2;
	},
};
