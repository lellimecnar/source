import { bench, describe } from 'vitest';

import {
	lellimecnarMergePatchAdapter,
	jsonMergePatchAdapter,
} from './adapters/index.js';
import { STORE_DATA } from './fixtures/index.js';

describe('JSON Merge Patch (RFC 7386)', () => {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const adapters = [lellimecnarMergePatchAdapter, jsonMergePatchAdapter];

	describe('Apply: nested merge + delete', () => {
		const patch = { store: { bicycle: { color: null, price: 25.0 } } };
		for (const adapter of adapters) {
			bench(
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				(adapter as any).name,
				() => {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
					void (adapter as any).apply(patch, STORE_DATA as any);
				},
			);
		}
	});

	describe('Generate: source->target', () => {
		const source = STORE_DATA;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const target = { ...(STORE_DATA as any), newKey: true };
		for (const adapter of adapters) {
			bench(
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				(adapter as any).name,
				() => {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
					void (adapter as any).generate(source as any, target);
				},
			);
		}
	});
});
