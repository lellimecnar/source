import { DataMap } from '@data-map/core';
import { bench, describe } from 'vitest';

import { DATASETS } from './fixtures';

describe('Computed', () => {
	bench('define 50 computed values', () => {
		const define: any = {};
		for (let i = 0; i < 50; i++) {
			define[`c${i}`] = {
				getter: (ctx: any) => `computed_${i}`,
			};
		}
		const dm = new DataMap({
			data: structuredClone(DATASETS.smallObject),
			define,
		});
		// force reads to measure behavior
		for (let i = 0; i < 50; i++) {
			dm.get(`$defs/c${i}`);
		}
	});

	bench('multiple dependent definitions', () => {
		const dm = new DataMap({
			data: structuredClone(DATASETS.smallObject),
			define: {
				derived1: {
					getter: (ctx: any) => 'v1',
				},
				derived2: {
					getter: (ctx: any) => 'v2',
				},
			},
		});
		for (let i = 0; i < 100; i++) {
			dm.get(`$defs/derived1`);
			dm.get(`$defs/derived2`);
		}
	});
});
