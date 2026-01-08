import { DataMap } from '@data-map/core';
import { bench, describe } from 'vitest';

import {
	generateWideObject,
	generateWideArray,
} from './fixtures/generators.js';

// Pre-generate fixtures outside bench functions (setup phase)
const largeObject = generateWideObject({ width: 1000, depth: 2, seed: 1 });
const largeArray = generateWideArray({ length: 10_000, seed: 2 });
const mediumObject = generateWideObject({ width: 10, depth: 3, seed: 3 });

describe('Scale', () => {
	bench('set on large object (1000 keys)', () => {
		const dm = new DataMap({ data: structuredClone(largeObject) });
		dm.set('/data/key999/key0', 123);
	});

	bench('push on large array (10k items)', () => {
		const dm = new DataMap({ arr: structuredClone(largeArray) });
		dm.push('/arr', { id: 10_001, value: 1, name: 'new' });
	});

	bench('resolve with targeted JSONPath query', () => {
		const dm = new DataMap({ data: structuredClone(mediumObject) });
		// Use a more targeted query instead of $..*
		// This tests deep access without exploding into 125k+ nodes
		dm.resolve('$.data.key0.key0.*');
	});
});
