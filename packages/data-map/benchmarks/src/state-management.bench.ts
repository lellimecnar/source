import { bench, describe } from 'vitest';

import { STATE_ADAPTERS } from './adapters';
import { benchKey } from './utils/adapter-helpers.js';

describe('State / Comparative', () => {
	for (const adapter of STATE_ADAPTERS) {
		bench(
			benchKey({
				category: 'state',
				caseName: 'createStore',
				adapterName: adapter.name,
			}),
			() => {
				adapter.createStore({ a: 1, b: 2, c: 3 });
			},
		);

		bench(
			benchKey({
				category: 'state',
				caseName: 'getSet',
				adapterName: adapter.name,
			}),
			() => {
				const store = adapter.createStore({ a: 1 });
				for (let i = 0; i < 1000; i++) {
					store.set('a', i);
					void store.get('a');
				}
			},
		);

		if (adapter.features.supportsSubscribe === true) {
			bench(
				benchKey({
					category: 'state',
					caseName: 'subscribeUnsubscribe',
					adapterName: adapter.name,
				}),
				() => {
					const store = adapter.createStore({ a: 1 });
					const unsub = store.subscribe?.(() => {}) ?? (() => {});
					unsub();
				},
			);
		}

		bench(
			benchKey({
				category: 'state',
				caseName: 'getSnapshot',
				adapterName: adapter.name,
			}),
			() => {
				const store = adapter.createStore({ a: 1, b: 2, c: 3 });
				void store.getSnapshot();
			},
		);
	}
});
