import { describe, expect, it } from 'vitest';
import { scanDirtyIndices } from '../simd-ops.js';

describe('simd-ops', () => {
	it('returns indices with dirty flags', () => {
		const dirty = new Uint8Array([0, 1, 0, 1, 1]);
		expect(Array.from(scanDirtyIndices(dirty))).toEqual([1, 3, 4]);
	});
});
