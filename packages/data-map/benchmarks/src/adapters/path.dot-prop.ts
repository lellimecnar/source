import {
	deleteProperty,
	getProperty,
	hasProperty,
	setProperty,
} from 'dot-prop';

import type { PathAdapter } from './types.js';

export const dotPropPathAdapter: PathAdapter = {
	kind: 'path',
	name: 'dot-prop',
	features: {
		mutatesInput: true,
		pathSyntax: 'dot',
	},
	get: (obj, path) => getProperty(obj as any, path),
	set: (obj, path, value) => setProperty(obj as any, path, value),
	has: (obj, path) => hasProperty(obj as any, path),
	del: (obj, path) => deleteProperty(obj as any, path),
	smokeTest: () => {
		const base: any = { a: { b: 1 } };
		dotPropPathAdapter.set(base, 'a.b', 2);
		return (
			dotPropPathAdapter.get(base, 'a.b') === 2 &&
			dotPropPathAdapter.has(base, 'a.b')
		);
	},
};
