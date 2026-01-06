import { bench, describe } from 'vitest';

import {
	lellimecnarJsonPathAdapter,
	jsonpathAdapter,
	jsonpathPlusAdapter,
	jsonP3Adapter,
} from './adapters/index.js';
import {
	LARGE_ARRAY_100,
	LARGE_ARRAY_1K,
	LARGE_ARRAY_10K,
	DEEP_OBJECT_10,
	WIDE_OBJECT_1000,
} from './fixtures/index.js';

describe('Scale Testing', () => {
	const adapters = [
		lellimecnarJsonPathAdapter,
		jsonpathAdapter,
		jsonpathPlusAdapter,
		jsonP3Adapter,
	];

	describe('Large Arrays: $[*].value', () => {
		const datasets = [
			{ name: '100', data: LARGE_ARRAY_100 },
			{ name: '1K', data: LARGE_ARRAY_1K },
			{ name: '10K', data: LARGE_ARRAY_10K },
		];

		for (const ds of datasets) {
			describe(ds.name, () => {
				for (const adapter of adapters) {
					bench(adapter.name, () => {
						void adapter.queryValues(ds.data, '$[*].value');
					});
				}
			});
		}
	});

	describe('Deep Nesting: $.next.next.next.value', () => {
		const q = '$.next.next.next.next.next.value';
		for (const adapter of adapters) {
			bench(adapter.name, () => {
				void adapter.queryValues(DEEP_OBJECT_10, q);
			});
		}
	});

	describe('Wide Objects: $.prop999', () => {
		for (const adapter of adapters) {
			bench(adapter.name, () => {
				void adapter.queryValues(WIDE_OBJECT_1000, '$.prop999');
			});
		}
	});
});
