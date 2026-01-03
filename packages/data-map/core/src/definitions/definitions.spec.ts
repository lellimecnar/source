import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';

const flushMicrotasks = () => new Promise((resolve) => queueMicrotask(resolve));

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

	it('registers multiple definitions targeting the same pointer (chained getters)', () => {
		const dm = new DataMap(
			{ user: { name: 'alice' } },
			{
				context: {},
				define: [
					{
						pointer: '/user/name',
						get: (v) => String(v).toUpperCase(),
					},
					{
						pointer: '/user/name',
						get: (v) => `@${String(v)}`,
					},
				],
			},
		);
		expect(dm.get('/user/name')).toBe('@ALICE');
	});

	it('registers JSONPath definitions (path) and matches computed pointers', () => {
		const dm = new DataMap(
			{ users: [{ name: 'a' }, { name: 'b' }] },
			{
				context: {},
				define: [
					{
						path: '$.users[*].name',
						get: (v) => String(v).toUpperCase(),
					},
				],
			},
		);

		expect(dm.get('/users/0/name')).toBe('A');
		expect(dm.get('/users/1/name')).toBe('B');
	});

	it('supports getter with explicit deps array', () => {
		const dm = new DataMap(
			{ a: 1, b: 2, sum: 0 },
			{
				context: {},
				define: [
					{
						pointer: '/sum',
						get: {
							deps: ['/a', '/b'],
							fn: (_v, depValues) =>
								(depValues[0] as number) + (depValues[1] as number),
						},
					},
				],
			},
		);
		expect(dm.get('/sum')).toBe(3);
	});

	it('supports setter with explicit deps array', () => {
		const dm = new DataMap(
			{ a: 1, b: 2, out: '' },
			{
				context: {},
				define: [
					{
						pointer: '/out',
						set: {
							deps: ['/a', '/b'],
							fn: (next, _current, depValues) =>
								`${depValues[0]}+${depValues[1]}=${next}`,
						},
					},
				],
			},
		);
		dm.set('/out', 123);
		expect(dm.get('/out')).toBe('1+2=123');
	});

	it('applies defaultValue into underlying data (AC-003)', () => {
		const dm = new DataMap<any>(
			{},
			{
				context: {},
				define: [{ pointer: '/a', defaultValue: 123 }],
			},
		);

		expect(dm.get('/a')).toBe(123);
		expect(dm.getSnapshot()).toEqual({ a: 123 });
	});

	it('does not invoke getters during construction when defaultValue exists (AC-003)', () => {
		let calls = 0;
		const dm = new DataMap<any>(
			{},
			{
				context: {},
				define: [
					{
						pointer: '/a',
						defaultValue: 1,
						get: () => {
							calls++;
							return 999;
						},
					},
				],
			},
		);

		expect(calls).toBe(0);
		expect(dm.getSnapshot()).toEqual({ a: 1 });
	});

	it('caches getter results when deps are declared', () => {
		let calls = 0;
		const dm = new DataMap(
			{ a: 1, b: 2, sum: 0 },
			{
				context: {},
				define: [
					{
						pointer: '/sum',
						deps: ['/a', '/b'],
						get: (_v, deps) => {
							calls++;
							return Number(deps[0]) + Number(deps[1]);
						},
					},
				],
			},
		);

		expect(dm.get('/sum')).toBe(3);
		expect(dm.get('/sum')).toBe(3);
		expect(calls).toBe(1);
	});

	it('manual invalidation forces recomputation', () => {
		let calls = 0;
		const dm = new DataMap(
			{ a: 1, b: 2, sum: 0 },
			{
				context: {},
				define: [
					{
						pointer: '/sum',
						deps: ['/a', '/b'],
						get: (_v, deps) => {
							calls++;
							return Number(deps[0]) + Number(deps[1]);
						},
					},
				],
			},
		);

		expect(dm.get('/sum')).toBe(3);
		(dm as any)._defs.invalidateAllForDefinition(
			(dm as any)._defs.getRegisteredDefinitions()[0],
		);
		expect(dm.get('/sum')).toBe(3);
		expect(calls).toBe(2);
	});

	it('auto-invalidates when dependencies change (AC-031)', async () => {
		let calls = 0;
		const dm = new DataMap(
			{ a: 1, b: 2, sum: 0 },
			{
				context: {},
				define: [
					{
						pointer: '/sum',
						deps: ['/a', '/b'],
						get: (_v, deps) => {
							calls++;
							return Number(deps[0]) + Number(deps[1]);
						},
					},
				],
			},
		);

		expect(dm.get('/sum')).toBe(3);
		expect(dm.get('/sum')).toBe(3);
		expect(calls).toBe(1);

		// Change dependency
		dm.set('/a', 10);
		await flushMicrotasks();
		expect(dm.get('/sum')).toBe(12);
		expect(calls).toBe(2);
	});
});
