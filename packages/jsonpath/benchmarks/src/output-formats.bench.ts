import { bench, describe } from 'vitest';

import {
	lellimecnarJsonPathAdapter,
	jsonpathAdapter,
	jsonpathPlusAdapter,
	jsonP3Adapter,
} from './adapters';
import { STORE_DATA } from './fixtures';

describe('Output Formats', () => {
	const adapters = [
		lellimecnarJsonPathAdapter,
		jsonpathAdapter,
		jsonpathPlusAdapter,
		jsonP3Adapter,
	];
	const q = '$.store.book[*].title';

	describe('Values', () => {
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

	describe('Paths', () => {
		for (const adapter of adapters) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			if (!(adapter as any).queryNodes) continue;
			bench(
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				(adapter as any).name,
				() => {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
					void (adapter as any).queryNodes!(STORE_DATA, q);
				},
			);
		}
	});
});
