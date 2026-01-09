/**
 * State Management Comparative Benchmarks
 *
 * Compares performance of state management libraries:
 * - @data-map/core (DataMap)
 * - valtio
 * - zustand
 * - jotai
 */
import { bench, describe } from 'vitest';

import { STATE_ADAPTERS } from './adapters';
import { benchKey } from './utils/adapter-helpers.js';

// ============================================================================
// Test Data
// ============================================================================

const SMALL_INITIAL = { a: 1, b: 2, c: 3 };

const MEDIUM_INITIAL = Object.fromEntries(
	Array.from({ length: 50 }, (_, i) => [`key${i}`, i]),
);

const LARGE_INITIAL = Object.fromEntries(
	Array.from({ length: 500 }, (_, i) => [`key${i}`, i]),
);

// ============================================================================
// Basic Operations
// ============================================================================

describe('State / Basic Operations', () => {
	for (const adapter of STATE_ADAPTERS) {
		bench(
			benchKey({
				category: 'state',
				caseName: 'smoke',
				adapterName: adapter.name,
			}),
			() => {
				if (!adapter.smokeTest())
					throw new Error(`Smoke test failed: ${adapter.name}`);
			},
		);

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

// ============================================================================
// Subscriptions
// ============================================================================

describe('State / Subscriptions', () => {
	for (const adapter of STATE_ADAPTERS) {
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

			bench(
				benchKey({
					category: 'state',
					caseName: 'subscribeWithUpdates10',
					adapterName: adapter.name,
				}),
				() => {
					const store = adapter.createStore({ count: 0 });
					let callCount = 0;
					const unsub = store.subscribe?.(() => {
						callCount++;
					});
					for (let i = 0; i < 10; i++) {
						store.set('count', i);
					}
					unsub?.();
				},
			);

			bench(
				benchKey({
					category: 'state',
					caseName: 'multipleSubscribers5',
					adapterName: adapter.name,
				}),
				() => {
					const store = adapter.createStore({ count: 0 });
					const unsubs: (() => void)[] = [];
					for (let i = 0; i < 5; i++) {
						unsubs.push(store.subscribe?.(() => {}) ?? (() => {}));
					}
					store.set('count', 1);
					for (const unsub of unsubs) unsub();
				},
			);
		}
	}
});

// ============================================================================
// Scale Tests
// ============================================================================

describe('State / Scale', () => {
	for (const adapter of STATE_ADAPTERS) {
		bench(
			benchKey({
				category: 'state',
				caseName: 'createMedium50',
				adapterName: adapter.name,
			}),
			() => {
				adapter.createStore({ ...MEDIUM_INITIAL });
			},
		);

		bench(
			benchKey({
				category: 'state',
				caseName: 'createLarge500',
				adapterName: adapter.name,
			}),
			() => {
				adapter.createStore({ ...LARGE_INITIAL });
			},
		);

		bench(
			benchKey({
				category: 'state',
				caseName: 'updateManyKeys50',
				adapterName: adapter.name,
			}),
			() => {
				const store = adapter.createStore({ ...MEDIUM_INITIAL });
				for (let i = 0; i < 50; i++) {
					store.set(`key${i}`, i * 2);
				}
			},
		);

		bench(
			benchKey({
				category: 'state',
				caseName: 'readManyKeys50',
				adapterName: adapter.name,
			}),
			() => {
				const store = adapter.createStore({ ...MEDIUM_INITIAL });
				let sum = 0;
				for (let i = 0; i < 50; i++) {
					sum += (store.get(`key${i}`) as number) || 0;
				}
				if (sum < 0) throw new Error('unreachable');
			},
		);
	}
});

// ============================================================================
// Rapid Updates
// ============================================================================

describe('State / Rapid Updates', () => {
	for (const adapter of STATE_ADAPTERS) {
		bench(
			benchKey({
				category: 'state',
				caseName: 'rapidSet100',
				adapterName: adapter.name,
			}),
			() => {
				const store = adapter.createStore({ count: 0 });
				for (let i = 0; i < 100; i++) {
					store.set('count', i);
				}
			},
		);

		bench(
			benchKey({
				category: 'state',
				caseName: 'rapidSet1000',
				adapterName: adapter.name,
			}),
			() => {
				const store = adapter.createStore({ count: 0 });
				for (let i = 0; i < 1000; i++) {
					store.set('count', i);
				}
			},
		);

		bench(
			benchKey({
				category: 'state',
				caseName: 'rapidSetWithSubscriber',
				adapterName: adapter.name,
			}),
			() => {
				const store = adapter.createStore({ count: 0 });
				const unsub = store.subscribe?.(() => {}) ?? (() => {});
				for (let i = 0; i < 100; i++) {
					store.set('count', i);
				}
				unsub();
			},
		);
	}
});

// ============================================================================
// Snapshot Performance
// ============================================================================

describe('State / Snapshots', () => {
	for (const adapter of STATE_ADAPTERS) {
		bench(
			benchKey({
				category: 'state',
				caseName: 'snapshotSmall',
				adapterName: adapter.name,
			}),
			() => {
				const store = adapter.createStore({ ...SMALL_INITIAL });
				for (let i = 0; i < 100; i++) {
					void store.getSnapshot();
				}
			},
		);

		bench(
			benchKey({
				category: 'state',
				caseName: 'snapshotMedium',
				adapterName: adapter.name,
			}),
			() => {
				const store = adapter.createStore({ ...MEDIUM_INITIAL });
				for (let i = 0; i < 100; i++) {
					void store.getSnapshot();
				}
			},
		);

		bench(
			benchKey({
				category: 'state',
				caseName: 'snapshotAfterUpdates',
				adapterName: adapter.name,
			}),
			() => {
				const store = adapter.createStore({ ...SMALL_INITIAL });
				for (let i = 0; i < 10; i++) {
					store.set('a', i);
					void store.getSnapshot();
				}
			},
		);
	}
});
