import { DataMap } from '@data-map/core';
import { bench, describe } from 'vitest';

import { DATASETS } from './fixtures';

// Pre-create DataMap instances at module scope for consistent benchmarking
const smallObjectTemplate = DATASETS.smallObject;
const mediumObjectTemplate = DATASETS.mediumObject;
const deepObjectTemplate = DATASETS.deepObject;
const wideArrayTemplate = DATASETS.wideArray;

describe('Path Access', () => {
	bench('Path Access /key0 (small object)', () => {
		const dm = new DataMap(structuredClone(smallObjectTemplate));
		dm.get('/key0');
	});

	bench('Path Access /key10/key0 (medium object nested)', () => {
		const dm = new DataMap(structuredClone(mediumObjectTemplate));
		dm.get('/key10/key0');
	});

	bench('Path Access deep chain (deep object)', () => {
		const dm = new DataMap(structuredClone(deepObjectTemplate));
		dm.get('/nested/nested/nested/value');
	});

	bench('Path Access array index (wide array)', () => {
		const dm = new DataMap(structuredClone(wideArrayTemplate));
		dm.get('/50');
	});

	// Additional benchmarks for common access patterns
	bench('Path Access multiple gets (small object)', () => {
		const dm = new DataMap(structuredClone(smallObjectTemplate));
		dm.get('/key0');
		dm.get('/key1');
		dm.get('/key2');
		dm.get('/key3');
		dm.get('/key4');
	});

	bench('Path Access JSONPath query (small object)', () => {
		const dm = new DataMap(structuredClone(smallObjectTemplate));
		dm.resolve('$.key0');
	});
});
