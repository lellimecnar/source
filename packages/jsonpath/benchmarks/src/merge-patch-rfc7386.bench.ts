import { bench, describe } from 'vitest';

import {
	lellimecnarMergePatchAdapter,
	jsonMergePatchAdapter,
	type JsonMergePatchAdapter,
} from './adapters';
import { STORE_DATA } from './fixtures';

describe('JSON Merge Patch (RFC 7386)', () => {
	const adapters: JsonMergePatchAdapter[] = [
		lellimecnarMergePatchAdapter,
		jsonMergePatchAdapter,
	];

	describe('Apply: nested merge + delete', () => {
		const patch = { store: { bicycle: { color: null, price: 25.0 } } };
		for (const adapter of adapters) {
			bench(adapter.name, () => {
				void adapter.apply(structuredClone(STORE_DATA), patch);
			});
		}
	});

	describe('Generate: source->target', () => {
		const source = STORE_DATA;
		const target = { ...STORE_DATA, newKey: true };
		for (const adapter of adapters) {
			bench(adapter.name, () => {
				void adapter.generate(source, target);
			});
		}
	});
});
