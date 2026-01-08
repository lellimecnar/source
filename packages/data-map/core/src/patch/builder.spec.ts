import { describe, expect, it } from 'vitest';

import { buildSetPatch, ensureParentContainers } from './builder';

describe('patch builder', () => {
	it('generates replace when path exists', () => {
		const ops = buildSetPatch({ a: { b: 1 } }, '/a/b', 2);
		expect(ops).toEqual([{ op: 'replace', path: '/a/b', value: 2 }]);
	});

	it('generates add with intermediate containers', () => {
		const ops = buildSetPatch({}, '/a/b', 1);
		expect(ops).toEqual([
			{ op: 'add', path: '/a', value: {} },
			{ op: 'add', path: '/a/b', value: 1 },
		]);
	});

	it('infers arrays for numeric segments', () => {
		const ops = buildSetPatch({}, '/items/0/name', 'x');
		expect(ops[0]).toEqual({ op: 'add', path: '/items', value: [] });
		expect(ops[1]).toEqual({ op: 'add', path: '/items/0', value: {} });
		expect(ops[2]).toEqual({ op: 'add', path: '/items/0/name', value: 'x' });
	});

	it('ensureParentContainers shares untouched branches (structural sharing)', () => {
		const keep = { x: 1 };
		const other = { y: 2 };
		const data = { keep, other };

		const { nextData, ops } = ensureParentContainers(
			data,
			'/created/deep/value',
		);
		expect(ops).toEqual([
			{ op: 'add', path: '/created', value: {} },
			{ op: 'add', path: '/created/deep', value: {} },
		]);

		expect((data as any).created).toBeUndefined();
		expect((nextData as any).keep).toBe(keep);
		expect((nextData as any).other).toBe(other);
	});
});
