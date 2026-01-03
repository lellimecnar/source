import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';

describe('definitions', () => {
	it('applies getter transform', () => {
		const dm = new DataMap(
			{ user: { name: 'alice' } },
			{
				context: {},
				define: [
					{
						pointer: '/user/name',
						get: (v) => String(v).toUpperCase(),
					},
				],
			},
		);
		expect(dm.get('/user/name')).toBe('ALICE');
	});

	it('applies setter transform', () => {
		const dm = new DataMap(
			{ user: { score: 10 } },
			{
				context: {},
				define: [
					{
						pointer: '/user/score',
						set: (next) => Number(next),
					},
				],
			},
		);
		dm.set('/user/score', '42');
		expect(dm.get('/user/score')).toBe(42);
	});

	it('enforces readOnly', () => {
		const dm = new DataMap(
			{ user: { id: 'x' } },
			{
				context: {},
				define: [
					{
						pointer: '/user/id',
						readOnly: true,
					},
				],
			},
		);
		expect(() => dm.set('/user/id', 'y')).toThrow();
	});
});
