import dlv from 'dlv';
import dset from 'dset';

import type { PathAdapter } from './types.js';

const MISSING = Symbol('missing');

function delDot(obj: any, path: string): void {
	const parts = path.split('.').filter(Boolean);
	let cur = obj;
	for (let i = 0; i < parts.length - 1; i++) cur = cur?.[parts[i]];
	if (!cur) return;
	delete cur[parts[parts.length - 1]];
}

export const dlvDsetPathAdapter: PathAdapter = {
	kind: 'path',
	name: 'dlv+dset',
	features: {
		mutatesInput: true,
		pathSyntax: 'dot',
	},
	get: (obj, path) => dlv(obj as any, path, undefined),
	set: (obj, path, value) => {
		dset(obj as any, path, value);
		return obj;
	},
	has: (obj, path) => dlv(obj as any, path, MISSING as any) !== MISSING,
	del: (obj, path) => {
		delDot(obj as any, path);
		return obj;
	},
	smokeTest: () => {
		const base: any = { a: { b: 1 } };
		dlvDsetPathAdapter.set(base, 'a.b', 2);
		return (
			dlvDsetPathAdapter.get(base, 'a.b') === 2 &&
			dlvDsetPathAdapter.has(base, 'a.b')
		);
	},
};
