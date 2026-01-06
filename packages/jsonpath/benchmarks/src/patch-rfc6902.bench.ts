import { bench, describe } from 'vitest';

import {
	lellimecnarPatchAdapter,
	fastJsonPatchAdapter,
	rfc6902PatchAdapter,
} from './adapters';
import { STORE_DATA } from './fixtures';

describe('JSON Patch (RFC 6902)', () => {
	const adapters = [
		lellimecnarPatchAdapter,
		fastJsonPatchAdapter,
		rfc6902PatchAdapter,
	];

	describe('Single: replace', () => {
		const patch = [
			{ op: 'replace', path: '/store/bicycle/color', value: 'blue' },
		] as any;
		for (const adapter of adapters) {
			bench(adapter.name, () => {
				adapter.applyPatch(patch, STORE_DATA);
			});
		}
	});

	describe('Batch: 100 replaces', () => {
		const patch = Array.from({ length: 100 }, (_, i) => ({
			op: 'add',
			path: `/tmp/${i}`,
			value: i,
		})) as any;
		for (const adapter of adapters) {
			bench(adapter.name, () => adapter.applyPatch(patch, STORE_DATA));
		}
	});
});
