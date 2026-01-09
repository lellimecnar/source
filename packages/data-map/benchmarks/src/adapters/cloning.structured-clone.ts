import type { CloningAdapter } from './types.js';

export const structuredCloneCloningAdapter: CloningAdapter = {
	kind: 'cloning',
	name: 'structuredClone',
	features: {
		isDeep: true,
		handlesCircular: true,
		preservesPrototypes: false,
	},
	clone: <T>(value: T): T => structuredClone(value),
	smokeTest: () => {
		const obj = { a: { b: { c: 1 } }, arr: [1, 2, 3] };
		const cloned = structuredCloneCloningAdapter.clone(obj);
		cloned.a.b.c = 999;
		cloned.arr[0] = 999;
		return obj.a.b.c === 1 && obj.arr[0] === 1;
	},
};
