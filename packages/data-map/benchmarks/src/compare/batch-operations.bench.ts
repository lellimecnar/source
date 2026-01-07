/**
 * Batch Operations Comparison Benchmarks
 *
 * Compares batch/transaction performance across adapters.
 * Tests atomic updates, rollback scenarios, and efficiency gains.
 */

import { bench, describe } from 'vitest';

import { getAllAdapters } from '../adapters';
import { getBatchAdapters, getTransactionAdapters } from '../comparison.js';
import { BENCHMARK_DATASETS, DATASETS } from '../fixtures';

const allAdapters = getAllAdapters();
const batchAdapters = getBatchAdapters(allAdapters);
const transactionAdapters = getTransactionAdapters(allAdapters);

const smallDataset = BENCHMARK_DATASETS.find((d) => d.name === 'small')!;
const mediumDataset = BENCHMARK_DATASETS.find((d) => d.name === 'medium')!;

describe('Batch Operations Comparison', () => {
	describe('Batch vs Sequential - Small (5 operations)', () => {
		describe('Batched', () => {
			for (const adapter of batchAdapters) {
				bench(adapter.name, () => {
					const data = structuredClone(smallDataset.data);
					const adapterData = adapter.setup?.(data) ?? data;
					adapter.batch!(adapterData, () => {
						adapter.set!(adapterData, '/key0', 'batch0');
						adapter.set!(adapterData, '/key1', 'batch1');
						adapter.set!(adapterData, '/key2', 'batch2');
						adapter.set!(adapterData, '/key3', 'batch3');
						adapter.set!(adapterData, '/key4', 'batch4');
					});
				});
			}
		});

		describe('Sequential (no batch)', () => {
			for (const adapter of batchAdapters) {
				bench(adapter.name, () => {
					const data = structuredClone(smallDataset.data);
					const adapterData = adapter.setup?.(data) ?? data;
					adapter.set!(adapterData, '/key0', 'seq0');
					adapter.set!(adapterData, '/key1', 'seq1');
					adapter.set!(adapterData, '/key2', 'seq2');
					adapter.set!(adapterData, '/key3', 'seq3');
					adapter.set!(adapterData, '/key4', 'seq4');
				});
			}
		});
	});

	describe('Batch vs Sequential - Medium (20 operations)', () => {
		describe('Batched', () => {
			for (const adapter of batchAdapters) {
				bench(adapter.name, () => {
					const data = structuredClone(mediumDataset.data);
					const adapterData = adapter.setup?.(data) ?? data;
					adapter.batch!(adapterData, () => {
						for (let i = 0; i < 20; i++) {
							adapter.set!(adapterData, `/key${i % 25}`, `batch${i}`);
						}
					});
				});
			}
		});

		describe('Sequential (no batch)', () => {
			for (const adapter of batchAdapters) {
				bench(adapter.name, () => {
					const data = structuredClone(mediumDataset.data);
					const adapterData = adapter.setup?.(data) ?? data;
					for (let i = 0; i < 20; i++) {
						adapter.set!(adapterData, `/key${i % 25}`, `seq${i}`);
					}
				});
			}
		});
	});

	describe('Batch vs Sequential - Large (100 operations)', () => {
		describe('Batched', () => {
			for (const adapter of batchAdapters) {
				bench(adapter.name, () => {
					const data = structuredClone(DATASETS.largeObject);
					const adapterData = adapter.setup?.(data) ?? data;
					adapter.batch!(adapterData, () => {
						for (let i = 0; i < 100; i++) {
							adapter.set!(adapterData, `/key${i % 50}`, `batch${i}`);
						}
					});
				});
			}
		});

		describe('Sequential (no batch)', () => {
			for (const adapter of batchAdapters) {
				bench(adapter.name, () => {
					const data = structuredClone(DATASETS.largeObject);
					const adapterData = adapter.setup?.(data) ?? data;
					for (let i = 0; i < 100; i++) {
						adapter.set!(adapterData, `/key${i % 50}`, `seq${i}`);
					}
				});
			}
		});
	});

	describe('Batch with Mixed Operations', () => {
		for (const adapter of batchAdapters) {
			if (!adapter.push) continue;
			bench(adapter.name, () => {
				const data = structuredClone({
					...(smallDataset.data as Record<string, unknown>),
					items: [1, 2, 3],
				});
				const adapterData = adapter.setup?.(data) ?? data;
				adapter.batch!(adapterData, () => {
					adapter.set!(adapterData, '/key0', 'updated');
					adapter.push!(adapterData, '/items', 4, 5);
					adapter.set!(adapterData, '/key1', 'also updated');
				});
			});
		}
	});

	describe('Transaction - Commit', () => {
		for (const adapter of transactionAdapters) {
			bench(adapter.name, () => {
				const data = structuredClone(smallDataset.data);
				const adapterData = adapter.setup?.(data) ?? data;
				adapter.transaction!(adapterData, () => {
					adapter.set!(adapterData, '/key0', 'tx0');
					adapter.set!(adapterData, '/key1', 'tx1');
					adapter.set!(adapterData, '/key2', 'tx2');
					// Commit happens automatically on success
				});
			});
		}
	});

	describe('Transaction - Rollback on Error', () => {
		for (const adapter of transactionAdapters) {
			bench(adapter.name, () => {
				const data = structuredClone(smallDataset.data);
				const adapterData = adapter.setup?.(data) ?? data;
				try {
					adapter.transaction!(adapterData, () => {
						adapter.set!(adapterData, '/key0', 'willRollback');
						throw new Error('Simulated failure');
					});
				} catch {
					// Expected - rollback should have occurred
				}
			});
		}
	});

	describe('Nested Batch (if supported)', () => {
		for (const adapter of batchAdapters) {
			bench(adapter.name, () => {
				const data = structuredClone(mediumDataset.data);
				const adapterData = adapter.setup?.(data) ?? data;
				try {
					adapter.batch!(adapterData, () => {
						adapter.set!(adapterData, '/key0', 'outer');
						adapter.batch!(adapterData, () => {
							adapter.set!(adapterData, '/key1', 'inner');
							adapter.set!(adapterData, '/key2', 'inner2');
						});
						adapter.set!(adapterData, '/key3', 'outer2');
					});
				} catch {
					// Some adapters may not support nested batches
				}
			});
		}
	});

	describe('Batch with Subscription (notification count)', () => {
		for (const adapter of batchAdapters) {
			if (!adapter.subscribe) continue;
			bench(adapter.name, () => {
				const data = structuredClone(smallDataset.data);
				const adapterData = adapter.setup?.(data) ?? data;
				let notificationCount = 0;
				const unsub = adapter.subscribe!(adapterData, () => {
					notificationCount++;
				});
				adapter.batch!(adapterData, () => {
					adapter.set!(adapterData, '/key0', 'batch0');
					adapter.set!(adapterData, '/key1', 'batch1');
					adapter.set!(adapterData, '/key2', 'batch2');
				});
				// Ideally: notificationCount should be 1 (batched), not 3
				if (typeof unsub === 'function') {
					unsub();
				}
			});
		}
	});

	describe('Realistic: Form Submission (batch update)', () => {
		const userStore = {
			users: {
				'user-1': { name: 'John', email: 'john@example.com', age: 30 },
			},
			lastUpdated: Date.now(),
			version: 1,
		};

		for (const adapter of batchAdapters) {
			bench(adapter.name, () => {
				const data = structuredClone(userStore);
				const adapterData = adapter.setup?.(data) ?? data;
				adapter.batch!(adapterData, () => {
					adapter.set!(adapterData, '/users/user-1/name', 'Jane');
					adapter.set!(adapterData, '/users/user-1/email', 'jane@example.com');
					adapter.set!(adapterData, '/users/user-1/age', 25);
					adapter.set!(adapterData, '/lastUpdated', Date.now());
					adapter.set!(adapterData, '/version', 2);
				});
			});
		}
	});

	describe('Realistic: Shopping Cart Update', () => {
		const cart = {
			items: [
				{ id: 1, qty: 1, price: 10 },
				{ id: 2, qty: 2, price: 20 },
			],
			subtotal: 50,
			tax: 5,
			total: 55,
		};

		for (const adapter of batchAdapters) {
			bench(adapter.name, () => {
				const data = structuredClone(cart);
				const adapterData = adapter.setup?.(data) ?? data;
				adapter.batch!(adapterData, () => {
					// Update quantity
					adapter.set!(adapterData, '/items/0/qty', 3);
					// Recalculate totals
					adapter.set!(adapterData, '/subtotal', 70);
					adapter.set!(adapterData, '/tax', 7);
					adapter.set!(adapterData, '/total', 77);
				});
			});
		}
	});
});
