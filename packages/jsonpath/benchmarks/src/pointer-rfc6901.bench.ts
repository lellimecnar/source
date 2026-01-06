import { bench, describe } from 'vitest';

import {
	lellimecnarPointerAdapter,
	jsonPointerAdapter,
} from './adapters/index.js';
import { STORE_DATA } from './fixtures/index.js';

describe('JSON Pointer (RFC 6901)', () => {
	const adapters = [lellimecnarPointerAdapter, jsonPointerAdapter];

	describe('Resolution', () => {
		const pointers = ['/store/bicycle/color', '/store/book/0/title'];
		for (const p of pointers) {
			describe(p, () => {
				for (const adapter of adapters) {
					bench(adapter.name, () => adapter.get(STORE_DATA, p));
				}
			});
		}
	});
});
