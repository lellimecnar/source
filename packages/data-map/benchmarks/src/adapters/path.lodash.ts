import { get, has, set, unset } from 'lodash';

import type { PathAdapter } from './types.js';

export const lodashPathAdapter: PathAdapter = {
	kind: 'path',
	name: 'lodash',
	features: {
		mutatesInput: true,
		pathSyntax: 'dot',
	},
	get: (obj, path) => get(obj as any, path),
	set: (obj, path, value) => {
		set(obj as any, path, value);
		return obj;
	},
	has: (obj, path) => has(obj as any, path),
	del: (obj, path) => {
		unset(obj as any, path);
		return obj;
	},
	smokeTest: () => {
		const base: any = { a: { b: 1 } };
		lodashPathAdapter.set(base, 'a.b', 2);
		return (
			lodashPathAdapter.get(base, 'a.b') === 2 &&
			lodashPathAdapter.has(base, 'a.b')
		);
	},
};
