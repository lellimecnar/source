import { DataMap } from '@data-map/core';
import { bench, describe } from 'vitest';

import { DATASETS } from './fixtures';

// Pre-compute the define arrays at module level to measure actual getter execution
const definitions50 = Array.from({ length: 50 }, (_, i) => ({
	pointer: `/computed${i}`,
	get: () => `computed_${i}`,
}));

const dependentDefinitions = [
	{ pointer: '/derived1', get: () => 'v1' },
	{ pointer: '/derived2', get: () => 'v2' },
];

describe('Computed', () => {
	bench('define 50 computed values', () => {
		const dm = new DataMap(structuredClone(DATASETS.smallObject), {
			define: definitions50,
		});
		// force reads to measure getter execution
		for (let i = 0; i < 50; i++) {
			dm.get(`/computed${i}`);
		}
	});

	bench('multiple dependent definitions', () => {
		const dm = new DataMap(structuredClone(DATASETS.smallObject), {
			define: dependentDefinitions,
		});
		for (let i = 0; i < 100; i++) {
			dm.get('/derived1');
			dm.get('/derived2');
		}
	});
});
