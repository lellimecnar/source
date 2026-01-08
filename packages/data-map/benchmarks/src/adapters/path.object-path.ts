import objectPath from 'object-path';

import type { PathAdapter } from './types.js';

export const objectPathAdapter: PathAdapter = {
	kind: 'path',
	name: 'object-path',
	features: {
		mutatesInput: true,
		pathSyntax: 'dot',
	},
	get: (obj, path) => objectPath.get(obj as any, path),
	set: (obj, path, value) => {
		objectPath.set(obj as any, path, value);
		return obj;
	},
	has: (obj, path) => objectPath.has(obj as any, path),
	del: (obj, path) => {
		objectPath.del(obj as any, path);
		return obj;
	},
	smokeTest: () => {
		const base: any = { a: { b: 1 } };
		objectPathAdapter.set(base, 'a.b', 2);
		return (
			objectPathAdapter.get(base, 'a.b') === 2 &&
			objectPathAdapter.has(base, 'a.b')
		);
	},
};
