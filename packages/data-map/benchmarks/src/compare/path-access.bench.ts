/**
 * Path Access Comparison Benchmarks
 *
 * Compares path-based value retrieval across all adapters that support get operations.
 * Tests shallow access, deep access, array indexing, and missing paths.
 */

import { bench, describe } from 'vitest';

import { getAllAdapters } from '../adapters';
import { getAccessAdapters } from '../comparison.js';
import { BENCHMARK_DATASETS } from '../fixtures';

const adapters = getAccessAdapters(getAllAdapters());
const smallDataset = BENCHMARK_DATASETS.find((d) => d.name === 'small')!;
const mediumDataset = BENCHMARK_DATASETS.find((d) => d.name === 'medium')!;
const deepDataset = BENCHMARK_DATASETS.find((d) => d.name === 'deep')!;
const arrayDataset = BENCHMARK_DATASETS.find((d) => d.name === 'array-1k')!;
const realisticDataset = BENCHMARK_DATASETS.find(
	(d) => d.name === 'realistic-users',
)!;

describe('Path Access Comparison', () => {
	describe('Shallow Access (depth 1)', () => {
		const data = structuredClone(smallDataset.data);
		const path = smallDataset.samplePaths.shallow;

		for (const adapter of adapters) {
			bench(adapter.name, () => {
				adapter.get!(data, path);
			});
		}
	});

	describe('Deep Access (depth 3)', () => {
		const data = structuredClone(mediumDataset.data);
		const path = mediumDataset.samplePaths.deep;

		for (const adapter of adapters) {
			bench(adapter.name, () => {
				adapter.get!(data, path);
			});
		}
	});

	describe('Very Deep Access (depth 10)', () => {
		const data = structuredClone(deepDataset.data);
		const path = deepDataset.samplePaths.deep;

		for (const adapter of adapters) {
			bench(adapter.name, () => {
				adapter.get!(data, path);
			});
		}
	});

	describe('Array Index Access', () => {
		const data = structuredClone(arrayDataset.data);
		const path = arrayDataset.samplePaths.array;

		for (const adapter of adapters) {
			bench(adapter.name, () => {
				adapter.get!(data, path);
			});
		}
	});

	describe('Missing Path (non-existent)', () => {
		const data = structuredClone(smallDataset.data);
		const path = smallDataset.samplePaths.missing;

		for (const adapter of adapters) {
			bench(adapter.name, () => {
				adapter.get!(data, path);
			});
		}
	});

	describe('Realistic Data (user store)', () => {
		const data = structuredClone(realisticDataset.data);
		const path = realisticDataset.samplePaths.deep;

		for (const adapter of adapters) {
			bench(adapter.name, () => {
				adapter.get!(data, path);
			});
		}
	});

	describe('Multiple Gets (10 paths)', () => {
		const data = structuredClone(smallDataset.data);
		const paths = [
			'/key0',
			'/key1',
			'/key2',
			'/key3',
			'/key4',
			'/key5',
			'/key6',
			'/key7',
			'/key8',
			'/key9',
		];

		for (const adapter of adapters) {
			bench(adapter.name, () => {
				for (const p of paths) {
					adapter.get!(data, p);
				}
			});
		}
	});
});
