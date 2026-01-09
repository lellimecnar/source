import jsonPointer from 'json-pointer';

import type { PathAdapter } from './types.js';

function dotToPointer(dotPath: string): string {
	if (dotPath.startsWith('/')) return dotPath;
	const parts = dotPath.split('.').filter(Boolean);
	return `/${parts.join('/')}`;
}

export const jsonPointerPathAdapter: PathAdapter = {
	kind: 'path',
	name: 'json-pointer',
	features: {
		mutatesInput: true,
		pathSyntax: 'pointer',
	},
	get: (obj, path) => {
		try {
			return jsonPointer.get(obj as object, dotToPointer(path));
		} catch {
			return undefined;
		}
	},
	set: (obj, path, value) => {
		jsonPointer.set(obj as object, dotToPointer(path), value);
		return obj;
	},
	has: (obj, path) => {
		return jsonPointer.has(obj as object, dotToPointer(path));
	},
	del: (obj, path) => {
		jsonPointer.remove(obj as object, dotToPointer(path));
		return obj;
	},
	smokeTest: () => {
		const base: Record<string, unknown> = { a: { b: 1 } };
		jsonPointerPathAdapter.set(base, '/a/b', 2);
		return (
			jsonPointerPathAdapter.get(base, '/a/b') === 2 &&
			jsonPointerPathAdapter.has(base, '/a/b')
		);
	},
};
