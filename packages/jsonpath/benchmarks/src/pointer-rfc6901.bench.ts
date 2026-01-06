import { bench, describe } from 'vitest';

import { lellimecnarPointerAdapter, jsonPointerAdapter } from './adapters';
import { STORE_DATA } from './fixtures';

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
