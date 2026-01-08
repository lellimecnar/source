import { bench, describe } from 'vitest';

import { PATH_ADAPTERS } from './adapters';
import { benchKey } from './utils/adapter-helpers.js';

const BASE: any = {
	a: { b: { c: { d: { e: 1 } } } },
	wide: Object.fromEntries(
		Array.from({ length: 2000 }, (_, i) => [`k${i}`, i]),
	),
};

describe('Path / Comparative', () => {
	for (const adapter of PATH_ADAPTERS) {
		bench(
			benchKey({
				category: 'path',
				caseName: 'shallowGet',
				adapterName: adapter.name,
			}),
			() => {
				adapter.get(BASE, 'a');
			},
		);

		bench(
			benchKey({
				category: 'path',
				caseName: 'deepGet5',
				adapterName: adapter.name,
			}),
			() => {
				adapter.get(BASE, 'a.b.c.d.e');
			},
		);

		bench(
			benchKey({
				category: 'path',
				caseName: 'deepSet5',
				adapterName: adapter.name,
			}),
			() => {
				const obj: any = structuredClone(BASE);
				adapter.set(obj, 'a.b.c.d.e', 2);
			},
		);

		bench(
			benchKey({
				category: 'path',
				caseName: 'hasWide',
				adapterName: adapter.name,
			}),
			() => {
				adapter.has(BASE, 'wide.k1999');
			},
		);
	}
});
