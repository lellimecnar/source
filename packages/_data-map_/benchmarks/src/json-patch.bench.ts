import { DataMap } from '@data-map/core';
import { bench, describe } from 'vitest';

import { DATASETS } from './fixtures';

// Pre-define patches at module scope
const patch10 = Array.from({ length: 10 }, (_, i) => ({
	op: 'replace' as const,
	path: `/${i}`,
	value: i * 10,
}));

const patch100 = Array.from({ length: 100 }, (_, i) => ({
	op: 'replace' as const,
	path: `/${i}`,
	value: i * 10,
}));

describe('JSON Patch', () => {
	bench('JSON Patch apply 10 ops', () => {
		const dm = new DataMap(structuredClone(DATASETS.wideArray));
		dm.patch(patch10);
	});

	bench('JSON Patch apply 100 ops', () => {
		const dm = new DataMap(structuredClone(DATASETS.wideArray));
		dm.patch(patch100);
	});

	bench('JSON Patch mixed ops', () => {
		const dm = new DataMap(structuredClone(DATASETS.smallObject));
		dm.patch([
			{ op: 'add', path: '/newKey', value: 'added' },
			{ op: 'replace', path: '/key0', value: 'replaced' },
			{ op: 'remove', path: '/key1' },
			{ op: 'copy', from: '/key2', path: '/copiedKey' },
			{ op: 'move', from: '/key3', path: '/movedKey' },
		]);
	});
});
