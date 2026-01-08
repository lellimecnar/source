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
		/**
		 * Measures: a single shallow update on pre-cloned inputs.
		 * Excludes: structuredClone cost (performed once per pool slot, outside the timed callback).
		 */
		const dataPool = Array.from({ length: 100 }, () =>
			structuredClone(smallDataset.data),
		);
		let poolIndex = 0;
		for (const adapter of mutationAdapters) {
			bench(adapter.name, () => {
				const data = dataPool[poolIndex++ % dataPool.length];
				adapter.set!(data, '/key0', 'updated');
			});
		}
	});

	describe('Deep Update (depth 3)', () => {
		/**
		 * Measures: a single deep update on pre-cloned inputs.
		 * Excludes: structuredClone cost (performed once per pool slot, outside the timed callback).
		 */
		const dataPool = Array.from({ length: 100 }, () =>
			structuredClone(mediumDataset.data),
		);
		let poolIndex = 0;
		for (const adapter of mutationAdapters) {
			bench(adapter.name, () => {
				const data = dataPool[poolIndex++ % dataPool.length];
				adapter.set!(data, mediumDataset.samplePaths.deep, 'updated');
			});
		}
	});

	describe('Very Deep Update (depth 10)', () => {
		/**
		 * Measures: a single very-deep update on pre-cloned inputs.
		 * Excludes: structuredClone cost (performed once per pool slot, outside the timed callback).
		 */
		const dataPool = Array.from({ length: 100 }, () =>
			structuredClone(deepDataset.data),
		);
		let poolIndex = 0;
		for (const adapter of mutationAdapters) {
			bench(adapter.name, () => {
				const data = dataPool[poolIndex++ % dataPool.length];
				adapter.set!(data, deepDataset.samplePaths.deep, 999);
			});
		}
	});

	describe('Multiple Updates (5 sequential)', () => {
		/**
		 * Measures: five sequential set operations on pre-cloned inputs.
		 * Excludes: structuredClone cost (performed once per pool slot, outside the timed callback).
		 */
		const dataPool = Array.from({ length: 100 }, () =>
			structuredClone(smallDataset.data),
		);
		let poolIndex = 0;
		for (const adapter of mutationAdapters) {
			bench(adapter.name, () => {
				let data: unknown = dataPool[poolIndex++ % dataPool.length];
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
			/**
			 * Measures: immutable update cost on pre-cloned inputs.
			 * Excludes: structuredClone cost (performed once per pool slot, outside the timed callback).
			 */
			const dataPool = Array.from({ length: 100 }, () =>
				structuredClone(smallDataset.data),
			);
			let poolIndex = 0;
			for (const adapter of immutableAdapters) {
				bench(adapter.name, () => {
					const data = dataPool[poolIndex++ % dataPool.length];
					const fn = adapter.immutableUpdate ?? adapter.set;
					fn!(data, '/key0', 'updated');
				});
			}
		});
	});

	describe('Large Object Update', () => {
		/**
		 * Measures: a single deep update on a large object using pre-cloned inputs.
		 * Excludes: structuredClone cost (performed once per pool slot, outside the timed callback).
		 */
		const dataPool = Array.from({ length: 100 }, () =>
			structuredClone(DATASETS.largeObject),
		);
		let poolIndex = 0;
		for (const adapter of mutationAdapters) {
			bench(adapter.name, () => {
				const data = dataPool[poolIndex++ % dataPool.length];
				adapter.set!(data, '/key25/key12/key6/key0', 'updated');
			});
		}
	});

	describe('Create New Path', () => {
		/**
		 * Measures: creating a new path on pre-cloned inputs.
		 * Excludes: structuredClone cost (performed once per pool slot, outside the timed callback).
		 */
		const dataPool = Array.from({ length: 100 }, () =>
			structuredClone(smallDataset.data),
		);
		let poolIndex = 0;
		for (const adapter of mutationAdapters) {
			bench(adapter.name, () => {
				const data = dataPool[poolIndex++ % dataPool.length];
				try {
					adapter.set!(data, '/newKey', 'newValue');
				} catch {
					// Some adapters may not support creating new paths
				}
			});
		}
	});
});
