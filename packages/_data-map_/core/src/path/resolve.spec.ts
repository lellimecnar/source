import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';

describe('DataMap.resolve metadata', () => {
	it('returns readOnly + type from definitions', () => {
		const store = new DataMap(
			{ a: 1 },
			{
				context: {},
				define: [{ pointer: '/a', readOnly: true, type: 'number' }],
			},
		);
		const [m] = store.resolve('/a');
		expect(m?.readOnly).toBe(true);
		expect(m?.type).toBe('number');
	});

	it('returns undefined metadata when no definition exists', () => {
		const store = new DataMap({ a: 1 });
		const [m] = store.resolve('/a');
		expect(m?.readOnly).toBeUndefined();
		expect(m?.type).toBeUndefined();
	});

	it('tracks previousValue when a write occurs', () => {
		const store = new DataMap({ a: 1 });
		const [before] = store.resolve('/a');
		expect(before?.previousValue).toBeUndefined();

		store.set('/a', 2);
		const [after] = store.resolve('/a');
		expect(after?.previousValue).toBe(1);
		expect(after?.value).toBe(2);
	});

	it('tracks lastUpdated timestamp', () => {
		const store = new DataMap({ a: 1 });
		const [before] = store.resolve('/a');
		expect(before?.lastUpdated).toBeUndefined();

		const before_time = Date.now();
		store.set('/a', 2);
		const after_time = Date.now();

		const [after] = store.resolve('/a');
		expect(after?.lastUpdated).toBeDefined();
		if (after?.lastUpdated) {
			expect(after.lastUpdated).toBeGreaterThanOrEqual(before_time);
			expect(after.lastUpdated).toBeLessThanOrEqual(after_time);
		}
	});

	it('preserves previousValue across multiple writes', () => {
		const store = new DataMap({ a: 1 });
		store.set('/a', 2);
		const [after1] = store.resolve('/a');
		expect(after1?.previousValue).toBe(1);

		store.set('/a', 3);
		const [after2] = store.resolve('/a');
		expect(after2?.previousValue).toBe(2);
		expect(after2?.value).toBe(3);
	});
});
