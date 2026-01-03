import { describe, expect, it } from 'vitest';

import { buildSetPatch } from './builder';

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
});
