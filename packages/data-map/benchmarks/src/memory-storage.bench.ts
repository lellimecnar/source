import { FlatStore } from '@data-map/storage';
import { bench, describe } from 'vitest';

import { SMALL, MEDIUM } from './fixtures';
import {
	captureMemory,
	deltaMemory,
	warmupGC,
} from './utils/memory-profiler.js';

describe('Memory / Storage', () => {
	bench('memory.flatStoreSmallObject', () => {
		warmupGC();
		const before = captureMemory();

		const store = new FlatStore(SMALL.root);

		const after = captureMemory();
		const delta = deltaMemory(before, after);

		void delta;
		void store;
	});

	bench('memory.flatStoreMediumObject', () => {
		warmupGC();
		const before = captureMemory();

		const store = new FlatStore(MEDIUM.root);

		const after = captureMemory();
		const delta = deltaMemory(before, after);

		void delta;
		void store;
	});

	bench('memory.flatStorePopulateSmall', () => {
		warmupGC();
		const store = new FlatStore();
		const before = captureMemory();

		for (const pointer of SMALL.pointers) {
			store.set(pointer, Math.random());
		}

		const after = captureMemory();
		const delta = deltaMemory(before, after);

		void delta;
		void store;
	});

	bench('memory.flatStorePopulateMedium', () => {
		warmupGC();
		const store = new FlatStore();
		const before = captureMemory();

		for (const pointer of MEDIUM.pointers) {
			store.set(pointer, Math.random());
		}

		const after = captureMemory();
		const delta = deltaMemory(before, after);

		void delta;
		void store;
	});
});
