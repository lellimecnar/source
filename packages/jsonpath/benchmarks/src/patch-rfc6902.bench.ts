import { bench, describe } from 'vitest';

import {
	lellimecnarPatchAdapter,
	fastJsonPatchAdapter,
	rfc6902PatchAdapter,
} from './adapters/index.js';
import { STORE_DATA } from './fixtures/index.js';

describe('JSON Patch (RFC 6902)', () => {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const adapters = [
		lellimecnarPatchAdapter,
		fastJsonPatchAdapter,
		rfc6902PatchAdapter,
	];

	describe('Single: replace', () => {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const patch: unknown[] = [
			{ op: 'replace', path: '/store/bicycle/color', value: 'blue' },
		];
		for (const adapter of adapters) {
			bench(
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				(adapter as any).name,
				() => {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
					void (adapter as any).applyPatch(patch, STORE_DATA);
				},
			);
		}
	});

	describe('Batch: 100 replaces', () => {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const patch: unknown[] = Array.from({ length: 100 }, (_, i) => ({
			op: 'add',
			path: `/tmp/${i}`,
			value: i,
		}));
		for (const adapter of adapters) {
			bench(
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				(adapter as any).name,
				() => {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
					void (adapter as any).applyPatch(patch, STORE_DATA);
				},
			);
		}
	});
});
