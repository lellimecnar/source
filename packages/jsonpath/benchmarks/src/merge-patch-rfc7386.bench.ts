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
			bench(
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				(adapter as any).name,
				() => {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
					void (adapter as any).apply(
						structuredClone(STORE_DATA) as any,
						patch,
					);
				},
			);
		}
	});

	describe('Generate: source->target', () => {
		const source = STORE_DATA;

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
