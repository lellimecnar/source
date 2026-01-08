/**
 * Feature Completeness Comparison Benchmarks
 *
 * Compares DataMap's full feature set against other libraries.
 * Shows where DataMap excels vs specialized alternatives.
 */

import { bench, describe } from 'vitest';

import { getAllAdapters, getAdaptersWithFeature } from '../adapters';
import { BENCHMARK_DATASETS, DATASETS } from '../fixtures';

const allAdapters = getAllAdapters();

// Use DATASETS directly since BENCHMARK_DATASETS names don't match simple keys
const userStoreData = DATASETS.userStore;
const todoAppData = DATASETS.todoApp;
const ecommerceData = DATASETS.ecommerce;

describe('Feature Completeness Comparison', () => {
	describe('Full-Featured Libraries (get + set + patch + subscribe + clone)', () => {
		const fullFeatured = allAdapters.filter(
			(a) =>
				a.features.get &&
				a.features.set &&
				a.features.patch &&
				a.features.subscribe &&
				a.features.clone,
		);

		describe('Complete Workflow: Read → Modify → Clone → Notify', () => {
			for (const adapter of fullFeatured) {
				bench(adapter.name, () => {
					const data = structuredClone(userStoreData);
					const adapterData = adapter.setup?.(data) ?? data;

					// Read
					const _currentUser = adapter.get!(
						adapterData,
						'/currentUser/profile',
					);

					// Subscribe
					let _notified = false;
					const unsub = adapter.subscribe?.(adapterData, () => {
						_notified = true;
					});

					// Modify
					adapter.set?.(adapterData, '/currentUser/profile/name', 'Updated');

					// Clone
					const _snapshot = adapter.clone?.(adapterData);

					// Cleanup
					if (typeof unsub === 'function') {
						unsub();
					}
				});
			}
		});
	});

	describe('JSONPath Support', () => {
		const jsonpathAdapters = allAdapters.filter(
			(a) => a.features.jsonpathQuery,
		);

		for (const adapter of jsonpathAdapters) {
			if (!adapter.query) continue;
			bench(`${adapter.name} - Query users by condition`, () => {
				adapter.query!(userStoreData, '$.users[?(@.active == true)]');
			});
		}
	});

	describe('Definitions/Schema Support', () => {
		const defAdapters = allAdapters.filter((a) => a.features.definitions);

		for (const adapter of defAdapters) {
			bench(`${adapter.name} - Resolve with definitions`, () => {
				// This tests adapters that support JSONPath $ref or similar
				adapter.get!(userStoreData, '/currentUser/profile');
			});
		}
	});

	describe('Batch + Subscribe Integration', () => {
		const batchSubscribeAdapters = allAdapters.filter(
			(a) => a.features.batch && a.features.subscribe && a.features.set,
		);

		for (const adapter of batchSubscribeAdapters) {
			bench(adapter.name, () => {
				const data = structuredClone(todoAppData);
				const adapterData = adapter.setup?.(data) ?? data;
				let _notifications = 0;
				const unsub = adapter.subscribe?.(adapterData, () => {
					_notifications++;
				});

				adapter.batch?.(adapterData, () => {
					adapter.set?.(adapterData, '/todos/0/completed', true);
					adapter.set?.(adapterData, '/todos/1/completed', true);
					adapter.set?.(adapterData, '/todos/2/completed', true);
				});

				if (typeof unsub === 'function') {
					unsub();
				}
				// Ideally notifications === 1 for batched
			});
		}
	});

	describe('Transaction + Rollback', () => {
		const txAdapters = allAdapters.filter(
			(a) => a.features.transaction && a.features.set,
		);

		describe('Successful Transaction', () => {
			for (const adapter of txAdapters) {
				bench(adapter.name, () => {
					const data = structuredClone(ecommerceData);
					const adapterData = adapter.setup?.(data) ?? data;

					adapter.transaction!(adapterData, () => {
						adapter.set!(adapterData, '/cart/items/0/quantity', 5);
						adapter.set!(adapterData, '/cart/subtotal', 150);
					});
				});
			}
		});

		describe('Failed Transaction (rollback)', () => {
			for (const adapter of txAdapters) {
				bench(adapter.name, () => {
					const data = structuredClone(ecommerceData);
					const adapterData = adapter.setup?.(data) ?? data;

					try {
						adapter.transaction!(adapterData, () => {
							adapter.set!(adapterData, '/cart/items/0/quantity', 5);
							throw new Error('Simulated failure');
						});
					} catch {
						// Expected
					}
				});
			}
		});
	});

	describe('Array Operations Suite', () => {
		const arrayAdapters = allAdapters.filter(
			(a) => a.features.push && a.features.pop && a.features.splice,
		);

		for (const adapter of arrayAdapters) {
			bench(`${adapter.name} - Full array workflow`, () => {
				const data = structuredClone({ items: [1, 2, 3, 4, 5] });
				const adapterData = adapter.setup?.(data) ?? data;

				// Push
				adapter.push!(adapterData, '/items', 6);

				// Pop
				adapter.pop!(adapterData, '/items');

				// Splice
				adapter.splice!(adapterData, '/items', 2, 1, 99);

				// Get result
				adapter.get!(adapterData, '/items');
			});
		}
	});

	describe('Resolve Stream (if supported)', () => {
		const streamAdapters = getAdaptersWithFeature('resolveStream');

		for (const adapter of streamAdapters) {
			if (!adapter.resolveStream) continue;
			bench(adapter.name, () => {
				const results: unknown[] = [];
				for (const item of adapter.resolveStream!(
					userStoreData,
					'$.users[*]',
				)) {
					results.push(item);
				}
			});
		}
	});

	describe('Category Comparison: Path Access Only', () => {
		const pathOnlyAdapters = allAdapters.filter(
			(a) => a.features.get && !a.features.patch && !a.features.subscribe,
		);

		for (const adapter of pathOnlyAdapters) {
			bench(adapter.name, () => {
				adapter.get!(ecommerceData, '/cart/items/0/product/name');
			});
		}
	});

	describe('Category Comparison: Immutable Libraries', () => {
		// Filter for adapters that actually have immutableUpdate or set methods
		const immutableAdapters = allAdapters.filter(
			(a) => a.features.immutableUpdate && (a.immutableUpdate || a.set),
		);

		for (const adapter of immutableAdapters) {
			bench(adapter.name, () => {
				const data = structuredClone(todoAppData);
				const fn = adapter.immutableUpdate ?? adapter.set;
				fn!(data, '/todos/0/completed', true);
			});
		}
	});

	describe('Category Comparison: Patch Libraries (RFC 6902)', () => {
		// Filter for adapters that actually have patch method
		const patchAdapters = allAdapters.filter(
			(a) => a.features.patch && a.category === 'patch' && a.patch,
		);

		for (const adapter of patchAdapters) {
			bench(adapter.name, () => {
				const data = structuredClone(todoAppData);
				// todoApp structure: { lists: [{ todos: [...] }], settings, user }
				adapter.patch!(data, [
					{
						op: 'replace',
						path: '/lists/0/todos/0/completed',
						value: true,
					},
					{
						op: 'add',
						path: '/lists/0/todos/-',
						value: { id: 'todo_new', title: 'New', completed: false },
					},
				]);
			});
		}
	});

	describe('Category Comparison: State Management', () => {
		// Filter for adapters that have both subscribe and set methods
		const stateAdapters = allAdapters.filter(
			(a) => a.category === 'state-management' && a.subscribe && a.set,
		);

		for (const adapter of stateAdapters) {
			bench(`${adapter.name} - State update cycle`, () => {
				const data = structuredClone(userStoreData);
				const adapterData = adapter.setup?.(data) ?? data;

				const unsub = adapter.subscribe!(adapterData, () => {});
				// userStore structure: { users: { user_0: { profile: { bio } } }, posts, comments }
				adapter.set!(adapterData, '/users/user_0/profile/bio', 'Updated bio');
				if (typeof unsub === 'function') {
					unsub();
				}
			});
		}
	});

	describe('DataMap Unique Features', () => {
		const dataMapAdapter = allAdapters.find((a) => a.name === '@data-map/core');
		if (!dataMapAdapter) return;

		describe('getAll - Get all values at path', () => {
			if (!dataMapAdapter.getAll) return;
			bench(dataMapAdapter.name, () => {
				// getAll returns array of all values matching a path pattern
				dataMapAdapter.getAll!(userStoreData, '/users');
			});
		});

		describe('setAll - Set all values at path', () => {
			if (!dataMapAdapter.setAll) return;
			bench(dataMapAdapter.name, () => {
				const data = structuredClone(userStoreData);
				// setAll updates all values matching a path pattern
				dataMapAdapter.setAll!(data, '/users', { active: false });
			});
		});

		describe('map - Transform array items', () => {
			if (!dataMapAdapter.map) return;
			bench(dataMapAdapter.name, () => {
				const data = structuredClone(todoAppData);
				dataMapAdapter.map!(data, '/todos', (todo) => ({
					...(todo as Record<string, unknown>),
					processed: true,
				}));
			});
		});

		describe('shuffle - Randomize array', () => {
			if (!dataMapAdapter.shuffle) return;
			bench(dataMapAdapter.name, () => {
				const data = { items: Array.from({ length: 100 }, (_, i) => i) };
				dataMapAdapter.shuffle!(data, '/items');
			});
		});
	});
});
