import { bench, describe } from 'vitest';

import { getAllAdapters } from './adapters';
import { DATASETS } from './fixtures';

describe('Mutations', () => {
	const setAdapters = getAllAdapters().filter((a) => a.features.set && a.set);
	const immAdapters = getAllAdapters().filter(
		(a) => a.features.immutable && a.immutableUpdate,
	);

	bench('Mutations set shallow', () => {
		for (const a of setAdapters) {
			const data: any = structuredClone(DATASETS.smallObject);
			a.set!(data, '/key0', 'updated');
		}
	});

	bench('Mutations immutable shallow', () => {
		for (const a of immAdapters) {
			const data: any = structuredClone(DATASETS.smallObject);
			a.immutableUpdate!(data, '/key0', 'updated');
		}
	});

	bench('Mutations set deep', () => {
		for (const a of setAdapters) {
			const data: any = structuredClone(DATASETS.deepObject);
			a.set!(data, '/nested/nested/value', 999);
		}
	});

	bench('Mutations immutable deep', () => {
		for (const a of immAdapters) {
			const data: any = structuredClone(DATASETS.deepObject);
			a.immutableUpdate!(data, '/nested/nested/value', 999);
		}
	});
});
