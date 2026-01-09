import rfdc from 'rfdc';

import type { CloningAdapter } from './types.js';

const clone = rfdc({ circles: true });

export const rfdcCloningAdapter: CloningAdapter = {
	kind: 'cloning',
	name: 'rfdc',
	features: {
		isDeep: true,
		handlesCircular: true,
		preservesPrototypes: false,
	},
	clone: <T>(value: T): T => clone(value) as T,
	smokeTest: () => {
		const obj = { a: { b: { c: 1 } }, arr: [1, 2, 3] };
		const cloned = rfdcCloningAdapter.clone(obj);
		cloned.a.b.c = 999;
		cloned.arr[0] = 999;
		return obj.a.b.c === 1 && obj.arr[0] === 1;
	},
};
