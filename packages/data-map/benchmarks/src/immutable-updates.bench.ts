import { bench, describe } from 'vitest';

import { IMMUTABLE_ADAPTERS } from './adapters';
import { benchKey } from './utils/adapter-helpers.js';

const BASE = {
	a: 1,
	deep: { a: { b: { c: { d: { e: 1 } } } } },
	arr: Array.from({ length: 1000 }, (_, i) => i),
};

describe('Immutable / Comparative', () => {
	for (const adapter of IMMUTABLE_ADAPTERS) {
		bench(
			benchKey({
				category: 'immutable',
				caseName: 'shallowUpdate',
				adapterName: adapter.name,
			}),
			() => {
				adapter.produce(BASE, (d) => {
					d.set('/a', 2);
				});
			},
		);

		bench(
			benchKey({
				category: 'immutable',
				caseName: 'deepUpdate5',
				adapterName: adapter.name,
			}),
			() => {
				adapter.produce(BASE, (d) => {
					d.set('/deep/a/b/c/d/e', 2);
				});
			},
		);

		bench(
			benchKey({
				category: 'immutable',
				caseName: 'multipleUpdates',
				adapterName: adapter.name,
			}),
			() => {
				adapter.produce(BASE, (d) => {
					d.set('/a', 2);
					d.set('/deep/a/b/c/d/e', 3);
					d.del('/deep/a/b/c/d');
				});
			},
		);

		bench(
			benchKey({
				category: 'immutable',
				caseName: 'arrayUpdate',
				adapterName: adapter.name,
			}),
			() => {
				adapter.produce(BASE, (d) => {
					d.set('/arr/999', 9999);
				});
			},
		);
	}
});
