import { bench, describe } from 'vitest';

import {
	lellimecnarPatchAdapter,
	fastJsonPatchAdapter,
	rfc6902PatchAdapter,
	type JsonPatchAdapter,
} from './adapters';
import { STORE_DATA } from './fixtures';

describe('JSON Patch (RFC 6902)', () => {
	const adapters: JsonPatchAdapter[] = [
		lellimecnarPatchAdapter,
		fastJsonPatchAdapter,
		rfc6902PatchAdapter,
	];

	describe('Single: replace', () => {
		const patch = [
			{ op: 'replace', path: '/store/bicycle/color', value: 'blue' },
		] as const;
		for (const adapter of adapters) {
			bench(adapter.name, () => {
				void adapter.applyPatch(structuredClone(STORE_DATA), patch);
			});
		}
	});

	describe('Batch: 10 adds', () => {
		// Pre-generate the patch once, not on every iteration
		const patch = Array.from({ length: 10 }, (_, i) => ({
			op: 'add' as const,
			path: `/newProp${i}`,
			value: i,
		}));
		for (const adapter of adapters) {
			bench(adapter.name, () => {
				void adapter.applyPatch(structuredClone(STORE_DATA), patch);
			});
		}
	});
});
