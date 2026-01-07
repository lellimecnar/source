import { DataMap } from '@data-map/core';
import { bench, describe } from 'vitest';

import {
	generateWideObject,
	generateWideArray,
} from './fixtures/generators.js';

function heapUsed(): number {
	return process.memoryUsage().heapUsed;
}

describe('Scale', () => {
	bench('set on large object (1000 keys)', () => {
		const big = generateWideObject({ width: 1000, depth: 2, seed: 1 });
		const dm = new DataMap({ data: big });
		dm.set('/key999/key0', 123);
	});

	bench('push on large array (memory signal)', () => {
		const arr = generateWideArray({ length: 10_000, seed: 2 });
		const before = heapUsed();
		const dm = new DataMap({ data: { arr } });
		dm.push('/arr', { id: 10_001, value: 1, name: 'new' });
		const after = heapUsed();
		// keep side-effect so optimizer cannot drop it
		if (after < before) throw new Error('unexpected heap delta');
	});

	bench('resolve with large JSONPath query', () => {
		const big = generateWideObject({ width: 100, depth: 3, seed: 3 });
		const dm = new DataMap({ data: big });
		dm.resolve('$..*');
	});
});
