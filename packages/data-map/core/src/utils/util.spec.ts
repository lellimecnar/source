import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';
import { deepEqual, deepExtends } from './equal';

describe('utilities', () => {
	it('deepEqual works', () => {
		expect(deepEqual({ a: [1, 2] }, { a: [1, 2] })).toBe(true);
		expect(deepEqual({ a: [1, 2] }, { a: [2, 1] })).toBe(false);
	});

	it('deepExtends works', () => {
		expect(deepExtends({ a: { b: 1, c: 2 } }, { a: { b: 1 } })).toBe(true);
		expect(deepExtends({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
	});

	it('DataMap snapshots are immutable clones', () => {
		const dm = new DataMap({ a: { b: 1 } });
		const snap = dm.getSnapshot() as any;
		snap.a.b = 999;
		expect(dm.get('/a/b')).toBe(1);
	});
});
