import { FlatStore } from '@data-map/storage';
import { bench, describe } from 'vitest';

import { MEDIUM } from './fixtures/index.js';
import { diffMemory, memorySnapshot } from './utils/measure.js';

describe('Memory', () => {
	bench('memory.processMemoryUsage', () => {
		const before = memorySnapshot();
		const store = new FlatStore(MEDIUM.root);
		void store.snapshot();
		const after = memorySnapshot();

		if (before && after) {
			diffMemory(before, after);
		}
	});
});
