import { klona } from 'klona';

import type { CloningAdapter } from './types.js';

export const klonaCloningAdapter: CloningAdapter = {
	kind: 'cloning',
	name: 'klona',
	features: {
		isDeep: true,
		handlesCircular: false,
		preservesPrototypes: false,
	},
	clone: <T>(value: T): T => klona(value),
	smokeTest: () => {
		const obj = { a: { b: { c: 1 } }, arr: [1, 2, 3] };
		const cloned = klonaCloningAdapter.clone(obj);
		cloned.a.b.c = 999;
		cloned.arr[0] = 999;
		return obj.a.b.c === 1 && obj.arr[0] === 1;
	},
};
