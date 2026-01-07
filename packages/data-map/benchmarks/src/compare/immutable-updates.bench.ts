/**
 * Immutable Update Comparison Benchmarks
 *
 * Compares immutable state update patterns across adapters.
 * Tests shallow updates, deep updates, and multiple updates.
 */

import { bench, describe } from 'vitest';

import { getAllAdapters } from '../adapters';
import { getImmutableAdapters, getMutationAdapters } from '../comparison.js';
import { BENCHMARK_DATASETS, DATASETS } from '../fixtures';

const allAdapters = getAllAdapters();
const immutableAdapters = getImmutableAdapters(allAdapters);
const mutationAdapters = getMutationAdapters(allAdapters);

const smallDataset = BENCHMARK_DATASETS.find((d) => d.name === 'small')!;
const mediumDataset = BENCHMARK_DATASETS.find((d) => d.name === 'medium')!;
const deepDataset = BENCHMARK_DATASETS.find((d) => d.name === 'deep')!;

describe('Immutable Update Comparison', () => {
	describe('Shallow Update (depth 1)', () => {
		for (const adapter of mutationAdapters) {
			bench(adapter.name, () => {
				const data = structuredClone(smallDataset.data);
				adapter.set!(data, '/key0', 'updated');
			});
		}
	});

	describe('Deep Update (depth 3)', () => {
		for (const adapter of mutationAdapters) {
			bench(adapter.name, () => {
				const data = structuredClone(mediumDataset.data);
				adapter.set!(data, mediumDataset.samplePaths.deep, 'updated');
			});
		}
	});

	describe('Very Deep Update (depth 10)', () => {
		for (const adapter of mutationAdapters) {
			bench(adapter.name, () => {
				const data = structuredClone(deepDataset.data);
				adapter.set!(data, deepDataset.samplePaths.deep, 999);
			});
		}
	});

	describe('Multiple Updates (5 sequential)', () => {
		for (const adapter of mutationAdapters) {
			bench(adapter.name, () => {
				let data: unknown = structuredClone(smallDataset.data);
				data = adapter.set!(data, '/key0', 'v1');
				data = adapter.set!(data, '/key1', 'v2');
				data = adapter.set!(data, '/key2', 'v3');
				data = adapter.set!(data, '/key3', 'v4');
				data = adapter.set!(data, '/key4', 'v5');
			});
		}
	});

	describe('Immutable vs Mutable - Shallow', () => {
		describe('Immutable (returns new copy)', () => {
			for (const adapter of immutableAdapters) {
				bench(adapter.name, () => {
					const data = structuredClone(smallDataset.data);
					const fn = adapter.immutableUpdate ?? adapter.set;
					fn!(data, '/key0', 'updated');
				});
			}
		});
	});

	describe('Large Object Update', () => {
		for (const adapter of mutationAdapters) {
			bench(adapter.name, () => {
				const data = structuredClone(DATASETS.largeObject);
				adapter.set!(data, '/key25/key12/key6/key0', 'updated');
			});
		}
	});

	describe('Create New Path', () => {
		for (const adapter of mutationAdapters) {
			bench(adapter.name, () => {
				const data = structuredClone(smallDataset.data);
				try {
					adapter.set!(data, '/newKey', 'newValue');
				} catch {
					// Some adapters may not support creating new paths
				}
			});
		}
	});
});
