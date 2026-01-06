import { bench, describe } from 'vitest';

import {
	lellimecnarJsonPathAdapter,
	jsonpathAdapter,
	jsonpathPlusAdapter,
	jsonP3Adapter,
} from '../adapters/index.js';
import { STORE_DATA } from '../fixtures/index.js';

describe('Browser: Query Performance (subset)', () => {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const adapters = [
		lellimecnarJsonPathAdapter,
		jsonpathAdapter,
		jsonpathPlusAdapter,
		jsonP3Adapter,
	];
	const q = '$.store.book[*].title';
	for (const adapter of adapters) {
		bench(
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			(adapter as any).name,
			() => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
				void (adapter as any).queryValues(STORE_DATA, q);
			},
		);
	}
});
