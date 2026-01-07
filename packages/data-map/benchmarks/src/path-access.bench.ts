import { bench, describe } from 'vitest';

import { getAllAdapters } from './adapters';
import { DATASETS } from './fixtures';

describe('Path Access', () => {
	const adapters = getAllAdapters().filter((a) => a.features.get && a.get);

	bench('Path Access /key0 (small object)', () => {
		for (const a of adapters) a.get!(DATASETS.smallObject, '/key0');
	});

	bench('Path Access /key10/key0 (medium object nested)', () => {
		for (const a of adapters) a.get!(DATASETS.mediumObject, '/key10/key0');
	});

	bench('Path Access deep chain (deep object)', () => {
		for (const a of adapters) {
			a.get!(DATASETS.deepObject, '/nested/nested/nested/value');
		}
	});

	bench('Path Access array index (wide array)', () => {
		for (const a of adapters) {
			a.get!(DATASETS.wideArray, '/50');
		}
	});
});
