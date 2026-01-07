import { DataMap } from '@data-map/core';
import { bench, describe } from 'vitest';

import { DATASETS } from './fixtures';

const smallObjectTemplate = DATASETS.smallObject;

// No-op subscription handler for benchmarking overhead
const noop = () => {};

describe('Subscriptions', () => {
	bench('10 updates without subscribe', () => {
		const dm = new DataMap(structuredClone(smallObjectTemplate));
		dm.set('/key0', 1);
		dm.set('/key0', 2);
		dm.set('/key0', 3);
		dm.set('/key0', 4);
		dm.set('/key0', 5);
		dm.set('/key0', 6);
		dm.set('/key0', 7);
		dm.set('/key0', 8);
		dm.set('/key0', 9);
		dm.set('/key0', 10);
	});

	bench('10 updates with subscribe', () => {
		const dm = new DataMap(structuredClone(smallObjectTemplate));
		// Valid subscription config: path and fn are required
		const sub = dm.subscribe({ path: '/key0', after: 'set', fn: noop });
		dm.set('/key0', 1);
		dm.set('/key0', 2);
		dm.set('/key0', 3);
		dm.set('/key0', 4);
		dm.set('/key0', 5);
		dm.set('/key0', 6);
		dm.set('/key0', 7);
		dm.set('/key0', 8);
		dm.set('/key0', 9);
		dm.set('/key0', 10);
		sub.unsubscribe();
	});

	bench('10 updates with wildcard subscribe', () => {
		const dm = new DataMap(structuredClone(smallObjectTemplate));
		// Wildcard path subscription
		const sub = dm.subscribe({ path: '$..*', after: 'set', fn: noop });
		dm.set('/key0', 1);
		dm.set('/key0', 2);
		dm.set('/key0', 3);
		dm.set('/key0', 4);
		dm.set('/key0', 5);
		dm.set('/key0', 6);
		dm.set('/key0', 7);
		dm.set('/key0', 8);
		dm.set('/key0', 9);
		dm.set('/key0', 10);
		sub.unsubscribe();
	});
});
