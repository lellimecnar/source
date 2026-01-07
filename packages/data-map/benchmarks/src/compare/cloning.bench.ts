/**
 * Cloning Comparison Benchmarks
 *
 * Compares deep cloning implementations across adapters.
 * Tests various data shapes and sizes.
 */

import { bench, describe } from 'vitest';

import { getAllAdapters } from '../adapters';
import { getCloneAdapters } from '../comparison.js';
import { BENCHMARK_DATASETS, DATASETS } from '../fixtures';

const allAdapters = getAllAdapters();
const cloneAdapters = getCloneAdapters(allAdapters);

const smallDataset = BENCHMARK_DATASETS.find((d) => d.name === 'small')!;
const mediumDataset = BENCHMARK_DATASETS.find((d) => d.name === 'medium')!;
const largeDataset = BENCHMARK_DATASETS.find((d) => d.name === 'large')!;
const deepDataset = BENCHMARK_DATASETS.find((d) => d.name === 'deep')!;

describe('Cloning Comparison', () => {
	describe('Tiny Object (5 keys)', () => {
		for (const adapter of cloneAdapters) {
			bench(adapter.name, () => {
				adapter.clone!(DATASETS.tinyObject);
			});
		}
	});

	describe('Small Object (10 keys)', () => {
		for (const adapter of cloneAdapters) {
			bench(adapter.name, () => {
				adapter.clone!(smallDataset.data);
			});
		}
	});

	describe('Medium Object (25 keys, nested)', () => {
		for (const adapter of cloneAdapters) {
			bench(adapter.name, () => {
				adapter.clone!(mediumDataset.data);
			});
		}
	});

	describe('Large Object (50 keys, deep nesting)', () => {
		for (const adapter of cloneAdapters) {
			bench(adapter.name, () => {
				adapter.clone!(largeDataset.data);
			});
		}
	});

	describe('XLarge Object (100 keys)', () => {
		for (const adapter of cloneAdapters) {
			bench(adapter.name, () => {
				adapter.clone!(DATASETS.xlargeObject);
			});
		}
	});

	describe('Deep Object (10 levels)', () => {
		for (const adapter of cloneAdapters) {
			bench(adapter.name, () => {
				adapter.clone!(deepDataset.data);
			});
		}
	});

	describe('Very Deep Object (50 levels)', () => {
		for (const adapter of cloneAdapters) {
			bench(adapter.name, () => {
				adapter.clone!(DATASETS.veryDeepObject);
			});
		}
	});

	describe('Small Array (100 items)', () => {
		for (const adapter of cloneAdapters) {
			bench(adapter.name, () => {
				adapter.clone!(DATASETS.wideArray);
			});
		}
	});

	describe('Medium Array (1000 items)', () => {
		for (const adapter of cloneAdapters) {
			bench(adapter.name, () => {
				adapter.clone!(DATASETS.largeArray);
			});
		}
	});

	describe('Large Array (10000 items)', () => {
		for (const adapter of cloneAdapters) {
			bench(adapter.name, () => {
				adapter.clone!(DATASETS.massiveArray);
			});
		}
	});

	describe('Nested Arrays', () => {
		for (const adapter of cloneAdapters) {
			bench(adapter.name, () => {
				adapter.clone!(DATASETS.nestedArrays);
			});
		}
	});

	describe('String-Heavy Object', () => {
		for (const adapter of cloneAdapters) {
			bench(adapter.name, () => {
				adapter.clone!(DATASETS.stringHeavy);
			});
		}
	});

	describe('Number-Heavy Object', () => {
		for (const adapter of cloneAdapters) {
			bench(adapter.name, () => {
				adapter.clone!(DATASETS.numberHeavy);
			});
		}
	});

	describe('Realistic: E-commerce Store', () => {
		for (const adapter of cloneAdapters) {
			bench(adapter.name, () => {
				adapter.clone!(DATASETS.ecommerce);
			});
		}
	});

	describe('Realistic: User Store', () => {
		for (const adapter of cloneAdapters) {
			bench(adapter.name, () => {
				adapter.clone!(DATASETS.userStore);
			});
		}
	});

	describe('Realistic: Todo App', () => {
		for (const adapter of cloneAdapters) {
			bench(adapter.name, () => {
				adapter.clone!(DATASETS.todoApp);
			});
		}
	});

	describe('Mixed Content Object', () => {
		const mixedData = {
			strings: Array.from({ length: 100 }, (_, i) => `string${i}`),
			numbers: Array.from({ length: 100 }, (_, i) => i * Math.PI),
			booleans: Array.from({ length: 100 }, (_, i) => i % 2 === 0),
			nulls: Array.from({ length: 50 }, () => null),
			objects: Array.from({ length: 50 }, (_, i) => ({
				id: i,
				name: `obj${i}`,
			})),
			nested: {
				level1: {
					level2: {
						level3: {
							data: Array.from({ length: 20 }, (_, i) => i),
						},
					},
				},
			},
		};

		for (const adapter of cloneAdapters) {
			bench(adapter.name, () => {
				adapter.clone!(mixedData);
			});
		}
	});

	// Test clone integrity (verify it's a true deep clone)
	describe('Clone Integrity Check', () => {
		for (const adapter of cloneAdapters) {
			bench(adapter.name, () => {
				const original = { nested: { value: 1 }, array: [{ id: 1 }] };
				const cloned = adapter.clone!(original) as typeof original;
				// Modify clone to verify independence
				cloned.nested.value = 2;
				cloned.array[0]!.id = 2;
				// Original should be unchanged (this is verified by test, not here)
			});
		}
	});
});
