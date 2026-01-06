import { bench, describe } from 'vitest';

import {
	lellimecnarJsonPathAdapter,
	jsonpathAdapter,
	jsonpathPlusAdapter,
	jsonP3Adapter,
} from './adapters/index.js';
import { STORE_DATA } from './fixtures/index.js';

describe('JSONPath: Fundamentals', () => {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const adapters = [
		lellimecnarJsonPathAdapter,
		jsonpathAdapter,
		jsonpathPlusAdapter,
		jsonP3Adapter,
	];

	describe('Basic Path Access', () => {
		const queries = [
			'$.store.bicycle.color',
			'$.store.book[0].title',
			'$.store.book[*].title',
		];
		for (const q of queries) {
			describe(q, () => {
				for (const adapter of adapters) {
					bench(
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						(adapter as any).name,
						() => {
							// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
							void (adapter as any).queryValues(STORE_DATA, q as string);
						},
					);
				}
			});
		}
	});

	describe('Recursive Descent', () => {
		const q = '$..author';
		for (const adapter of adapters) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			if (!(adapter as any).features.supportsFilter) continue;
			bench(
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				(adapter as any).name,
				() => {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
					void (adapter as any).queryValues(q as string, STORE_DATA);
				},
			);
		}
	});
});
