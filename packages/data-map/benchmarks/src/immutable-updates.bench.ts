/**
 * Immutable Updates Comparative Benchmarks
 *
 * Compares performance of immutable update libraries:
 * - @data-map/core (via produce-style adapter)
 * - immer
 * - mutative
 */
import { bench, describe } from 'vitest';

import { IMMUTABLE_ADAPTERS } from './adapters';
import { benchKey } from './utils/adapter-helpers.js';

// ============================================================================
// Test Data
// ============================================================================

const SMALL_BASE = {
	a: 1,
	deep: { a: { b: { c: { d: { e: 1 } } } } },
	arr: Array.from({ length: 100 }, (_, i) => i),
};

const MEDIUM_BASE = {
	users: Array.from({ length: 100 }, (_, i) => ({
		id: i,
		name: `User ${i}`,
		profile: {
			bio: `Bio for user ${i}`,
			settings: { theme: 'dark', notifications: true },
		},
	})),
	metadata: { version: '1.0.0', updated: '2024-01-01' },
};

const LARGE_BASE = {
	items: Array.from({ length: 1000 }, (_, i) => ({
		id: i,
		data: { value: i, label: `Item ${i}` },
	})),
};

const VERY_DEEP_BASE = (function () {
	let obj: Record<string, unknown> = { value: 1 };
	for (let i = 0; i < 20; i++) {
		obj = { [`level${i}`]: obj };
	}
	return obj;
})();

// ============================================================================
// Basic Operations
// ============================================================================

describe('Immutable / Basic Operations', () => {
	for (const adapter of IMMUTABLE_ADAPTERS) {
		bench(
			benchKey({
				category: 'immutable',
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
				category: 'immutable',
				caseName: 'shallowUpdate',
				adapterName: adapter.name,
			}),
			() => {
				adapter.produce(SMALL_BASE, (d) => {
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
				adapter.produce(SMALL_BASE, (d) => {
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
				adapter.produce(SMALL_BASE, (d) => {
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
				adapter.produce(SMALL_BASE, (d) => {
					d.set('/arr/99', 9999);
				});
			},
		);
	}
});

// ============================================================================
// Medium Scale Operations
// ============================================================================

describe('Immutable / Medium Scale', () => {
	for (const adapter of IMMUTABLE_ADAPTERS) {
		bench(
			benchKey({
				category: 'immutable',
				caseName: 'mediumSingleUpdate',
				adapterName: adapter.name,
			}),
			() => {
				adapter.produce(MEDIUM_BASE, (d) => {
					d.set('/users/50/name', 'Updated User');
				});
			},
		);

		bench(
			benchKey({
				category: 'immutable',
				caseName: 'mediumDeepUpdate',
				adapterName: adapter.name,
			}),
			() => {
				adapter.produce(MEDIUM_BASE, (d) => {
					d.set('/users/50/profile/settings/theme', 'light');
				});
			},
		);

		bench(
			benchKey({
				category: 'immutable',
				caseName: 'mediumMultipleUpdates5',
				adapterName: adapter.name,
			}),
			() => {
				adapter.produce(MEDIUM_BASE, (d) => {
					d.set('/users/10/name', 'User A');
					d.set('/users/20/name', 'User B');
					d.set('/users/30/name', 'User C');
					d.set('/users/40/name', 'User D');
					d.set('/users/50/name', 'User E');
				});
			},
		);
	}
});

// ============================================================================
// Large Scale Operations
// ============================================================================

describe('Immutable / Large Scale', () => {
	for (const adapter of IMMUTABLE_ADAPTERS) {
		bench(
			benchKey({
				category: 'immutable',
				caseName: 'largeSingleUpdate',
				adapterName: adapter.name,
			}),
			() => {
				adapter.produce(LARGE_BASE, (d) => {
					d.set('/items/500/data/value', 9999);
				});
			},
		);

		bench(
			benchKey({
				category: 'immutable',
				caseName: 'largeMultipleUpdates10',
				adapterName: adapter.name,
			}),
			() => {
				adapter.produce(LARGE_BASE, (d) => {
					for (let i = 0; i < 10; i++) {
						d.set(`/items/${i * 100}/data/value`, i * 1000);
					}
				});
			},
		);
	}
});

// ============================================================================
// Very Deep Nesting
// ============================================================================

describe('Immutable / Deep Nesting', () => {
	// Build the deep path dynamically
	const deepPath = `/${Array.from(
		{ length: 20 },
		(_, i) => `level${19 - i}`,
	).join('/')}/value`;

	for (const adapter of IMMUTABLE_ADAPTERS) {
		bench(
			benchKey({
				category: 'immutable',
				caseName: 'veryDeepUpdate20',
				adapterName: adapter.name,
			}),
			() => {
				adapter.produce(VERY_DEEP_BASE, (d) => {
					d.set(deepPath, 999);
				});
			},
		);
	}
});

// ============================================================================
// Delete Operations
// ============================================================================

describe('Immutable / Delete Operations', () => {
	for (const adapter of IMMUTABLE_ADAPTERS) {
		bench(
			benchKey({
				category: 'immutable',
				caseName: 'deleteShallow',
				adapterName: adapter.name,
			}),
			() => {
				adapter.produce(SMALL_BASE, (d) => {
					d.del('/a');
				});
			},
		);

		bench(
			benchKey({
				category: 'immutable',
				caseName: 'deleteDeep',
				adapterName: adapter.name,
			}),
			() => {
				adapter.produce(SMALL_BASE, (d) => {
					d.del('/deep/a/b/c');
				});
			},
		);

		bench(
			benchKey({
				category: 'immutable',
				caseName: 'deleteArrayElement',
				adapterName: adapter.name,
			}),
			() => {
				adapter.produce(SMALL_BASE, (d) => {
					d.del('/arr/50');
				});
			},
		);
	}
});

// ============================================================================
// Mixed Read/Write
// ============================================================================

describe('Immutable / Mixed Operations', () => {
	for (const adapter of IMMUTABLE_ADAPTERS) {
		bench(
			benchKey({
				category: 'immutable',
				caseName: 'readThenWrite',
				adapterName: adapter.name,
			}),
			() => {
				adapter.produce(SMALL_BASE, (d) => {
					const current = d.get('/a') as number;
					d.set('/a', current + 1);
				});
			},
		);

		bench(
			benchKey({
				category: 'immutable',
				caseName: 'conditionalUpdate',
				adapterName: adapter.name,
			}),
			() => {
				adapter.produce(SMALL_BASE, (d) => {
					const arr = d.get('/arr') as number[];
					if (arr && arr.length > 50) {
						d.set('/arr/50', 999);
					}
				});
			},
		);
	}
});
