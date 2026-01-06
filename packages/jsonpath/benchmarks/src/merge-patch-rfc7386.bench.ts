import { bench, describe } from 'vitest';

import {
	lellimecnarMergePatchAdapter,
	jsonMergePatchAdapter,
} from './adapters';
import { STORE_DATA } from './fixtures';

describe('JSON Merge Patch (RFC 7386)', () => {
	const adapters = [lellimecnarMergePatchAdapter, jsonMergePatchAdapter];

	describe('Apply: nested merge + delete', () => {
		const patch = { store: { bicycle: { color: null, price: 25.0 } } };
		for (const adapter of adapters) {
			bench(adapter.name, () => {
				adapter.apply(patch, STORE_DATA as any);
			});
		}
	});

	describe('Generate: source->target', () => {
		const source = STORE_DATA;
		const target = { ...(STORE_DATA as any), newKey: true };
		for (const adapter of adapters) {
			bench(adapter.name, () => adapter.generate(source as any, target));
		}
	});
});
