import { DataMap } from '@data-map/core';
import { bench, describe } from 'vitest';

import { DATASETS } from './fixtures';

// Pre-clone datasets to avoid setup overhead in each iteration
const smallObjectTemplate = DATASETS.smallObject;
const deepObjectTemplate = DATASETS.deepObject;

describe('Mutations', () => {
	bench('Mutations set shallow', () => {
		const dm = new DataMap(structuredClone(smallObjectTemplate));
		dm.set('/key0', 'updated');
	});

	bench('Mutations immutable shallow', () => {
		const dm = new DataMap(structuredClone(smallObjectTemplate));
		dm.set('/key0', 'updated');
		dm.getSnapshot();
	});

	bench('Mutations set deep', () => {
		const dm = new DataMap(structuredClone(deepObjectTemplate));
		dm.set('/nested/nested/value', 999);
	});

	bench('Mutations immutable deep', () => {
		const dm = new DataMap(structuredClone(deepObjectTemplate));
		dm.set('/nested/nested/value', 999);
		dm.getSnapshot();
	});
});
