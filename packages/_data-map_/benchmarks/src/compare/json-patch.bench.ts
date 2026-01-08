/**
 * JSON Patch Comparison Benchmarks
 *
 * Compares JSON Patch (RFC 6902) implementations across adapters.
 * Tests apply performance, validation, and error handling.
 */

import { bench, describe } from 'vitest';

import { getAllAdapters } from '../adapters';
import type { PatchOp } from '../adapters/types.js';
import { getPatchAdapters } from '../comparison.js';
import { BENCHMARK_DATASETS, DATASETS } from '../fixtures';

const allAdapters = getAllAdapters();
const patchAdapters = getPatchAdapters(allAdapters);

const smallDataset = BENCHMARK_DATASETS.find((d) => d.name === 'small')!;
const mediumDataset = BENCHMARK_DATASETS.find((d) => d.name === 'medium')!;

// Single operation patches
const singleAddPatch: PatchOp[] = [
	{ op: 'add', path: '/newKey', value: 'newValue' },
];

const singleReplacePatch: PatchOp[] = [
	{ op: 'replace', path: '/key0', value: 'replaced' },
];

const singleRemovePatch: PatchOp[] = [{ op: 'remove', path: '/key4' }];

// Multi-operation patches
const multiOpPatch: PatchOp[] = [
	{ op: 'add', path: '/added1', value: 1 },
	{ op: 'add', path: '/added2', value: 2 },
	{ op: 'replace', path: '/key0', value: 'replaced' },
	{ op: 'remove', path: '/key4' },
	{ op: 'add', path: '/added3', value: { nested: true } },
];

// Complex nested patch - uses paths that exist in mediumDataset (key0/key0/key0)
const nestedPatch: PatchOp[] = [
	{ op: 'add', path: '/key0/key0/newKey', value: 'deep value' },
	{ op: 'replace', path: '/key1/key0/key0', value: { completely: 'replaced' } },
];

// Array operation patches
const arrayPatch: PatchOp[] = [
	{ op: 'add', path: '/items/0', value: 'first' },
	{ op: 'add', path: '/items/-', value: 'last' },
	{ op: 'remove', path: '/items/1' },
];

// Large batch patch (10 operations)
const largeBatchPatch: PatchOp[] = Array.from({ length: 10 }, (_, i) => ({
	op: 'add' as const,
	path: `/batch${i}`,
	value: { index: i, data: `value${i}` },
}));

// Very large batch (50 operations)
const veryLargeBatchPatch: PatchOp[] = Array.from({ length: 50 }, (_, i) => ({
	op: 'add' as const,
	path: `/veryLarge${i}`,
	value: i,
}));

/**
 * Data pools for patch benchmarks.
 * Pre-cloned outside of timed callbacks to measure patch cost, not clone cost.
 */
const smallDataPoolAddOp = Array.from({ length: 100 }, () =>
	structuredClone(smallDataset.data),
);
const smallDataPoolReplaceOp = Array.from({ length: 100 }, () =>
	structuredClone(smallDataset.data),
);
const smallDataPoolRemoveOp = Array.from({ length: 100 }, () =>
	structuredClone(smallDataset.data),
);
const smallDataPoolMultiOp = Array.from({ length: 100 }, () =>
	structuredClone(smallDataset.data),
);
const mediumDataPoolNested = Array.from({ length: 100 }, () =>
	structuredClone(mediumDataset.data),
);
const smallDataWithItemsPool = Array.from({ length: 100 }, () =>
	structuredClone({
		...(smallDataset.data as Record<string, unknown>),
		items: [1, 2, 3, 4, 5],
	}),
);
const smallDataPoolLargeBatch = Array.from({ length: 100 }, () =>
	structuredClone(smallDataset.data),
);
const mediumDataPoolVeryLargeBatch = Array.from({ length: 100 }, () =>
	structuredClone(mediumDataset.data),
);
const largeObjectPool = Array.from({ length: 100 }, () =>
	structuredClone(DATASETS.largeObject),
);
const smallDataPoolMove = Array.from({ length: 100 }, () =>
	structuredClone(smallDataset.data),
);
const smallDataPoolCopy = Array.from({ length: 100 }, () =>
	structuredClone(smallDataset.data),
);

describe('JSON Patch Comparison', () => {
	describe('Single Add Operation', () => {
		let poolIndex = 0;
		for (const adapter of patchAdapters) {
			bench(adapter.name, () => {
				const data =
					smallDataPoolAddOp[poolIndex++ % smallDataPoolAddOp.length];
				adapter.patch!(data, singleAddPatch);
			});
		}
	});

	describe('Single Replace Operation', () => {
		let poolIndex = 0;
		for (const adapter of patchAdapters) {
			bench(adapter.name, () => {
				const data =
					smallDataPoolReplaceOp[poolIndex++ % smallDataPoolReplaceOp.length];
				adapter.patch!(data, singleReplacePatch);
			});
		}
	});

	describe('Single Remove Operation', () => {
		let poolIndex = 0;
		for (const adapter of patchAdapters) {
			bench(adapter.name, () => {
				const data =
					smallDataPoolRemoveOp[poolIndex++ % smallDataPoolRemoveOp.length];
				adapter.patch!(data, singleRemovePatch);
			});
		}
	});

	describe('Multi-Operation Patch (5 ops)', () => {
		let poolIndex = 0;
		for (const adapter of patchAdapters) {
			bench(adapter.name, () => {
				const data =
					smallDataPoolMultiOp[poolIndex++ % smallDataPoolMultiOp.length];
				adapter.patch!(data, multiOpPatch);
			});
		}
	});

	describe('Nested Path Patch', () => {
		let poolIndex = 0;
		for (const adapter of patchAdapters) {
			bench(adapter.name, () => {
				const data =
					mediumDataPoolNested[poolIndex++ % mediumDataPoolNested.length];
				adapter.patch!(data, nestedPatch);
			});
		}
	});

	describe('Array Operations', () => {
		let poolIndex = 0;
		for (const adapter of patchAdapters) {
			bench(adapter.name, () => {
				const data =
					smallDataWithItemsPool[poolIndex++ % smallDataWithItemsPool.length];
				adapter.patch!(data, arrayPatch);
			});
		}
	});

	describe('Large Batch Patch (10 ops)', () => {
		let poolIndex = 0;
		for (const adapter of patchAdapters) {
			bench(adapter.name, () => {
				const data =
					smallDataPoolLargeBatch[poolIndex++ % smallDataPoolLargeBatch.length];
				adapter.patch!(data, largeBatchPatch);
			});
		}
	});

	describe('Very Large Batch Patch (50 ops)', () => {
		let poolIndex = 0;
		for (const adapter of patchAdapters) {
			bench(adapter.name, () => {
				const data =
					mediumDataPoolVeryLargeBatch[
						poolIndex++ % mediumDataPoolVeryLargeBatch.length
					];
				adapter.patch!(data, veryLargeBatchPatch);
			});
		}
	});

	describe('Patch on Large Object', () => {
		const largePatch: PatchOp[] = [
			{ op: 'replace', path: '/key10/key5/key2', value: 'updated' },
			{ op: 'add', path: '/key20/newNested', value: { a: 1, b: 2 } },
		];

		let poolIndex = 0;
		for (const adapter of patchAdapters) {
			bench(adapter.name, () => {
				const data = largeObjectPool[poolIndex++ % largeObjectPool.length];
				adapter.patch!(data, largePatch);
			});
		}
	});

	describe('Move Operation (if supported)', () => {
		const movePatch: PatchOp[] = [
			{ op: 'move', from: '/key0', path: '/movedKey0' },
		];

		let poolIndex = 0;
		for (const adapter of patchAdapters) {
			bench(adapter.name, () => {
				const data = smallDataPoolMove[poolIndex++ % smallDataPoolMove.length];
				try {
					adapter.patch!(data, movePatch);
				} catch {
					// Some may not support move
				}
			});
		}
	});

	describe('Copy Operation (if supported)', () => {
		const copyPatch: PatchOp[] = [
			{ op: 'copy', from: '/key0', path: '/copiedKey0' },
		];

		let poolIndex = 0;
		for (const adapter of patchAdapters) {
			bench(adapter.name, () => {
				const data = smallDataPoolCopy[poolIndex++ % smallDataPoolCopy.length];
				try {
					adapter.patch!(data, copyPatch);
				} catch {
					// Some may not support copy
				}
			});
		}
	});
});
