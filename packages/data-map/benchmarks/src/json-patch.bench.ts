import { bench, describe } from 'vitest';

import { getAllAdapters } from './adapters';
import { DATASETS } from './fixtures';

const patch10 = Array.from({ length: 10 }, (_, i) => ({
	op: 'replace' as const,
	path: `/${i}`,
	value: i,
}));

describe('JSON Patch', () => {
	const patchAdapters = getAllAdapters().filter(
		(a) => a.features.patch && a.applyPatch,
	);

	bench('JSON Patch apply 10 ops', () => {
		for (const a of patchAdapters) {
			const data: any = structuredClone(DATASETS.wideArray);
			a.applyPatch!(data, patch10 as any);
		}
	});
});
