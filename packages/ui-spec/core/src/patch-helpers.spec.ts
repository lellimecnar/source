import { describe, expect, it } from 'vitest';

import {
	makeMergeOps,
	makePushOps,
	makeRemoveOps,
	makeSetOps,
} from './patch-helpers';

describe('patch helpers', () => {
	it('makeSetOps chooses add vs replace', () => {
		expect(makeSetOps('/a', {}, 1)).toEqual([
			{ op: 'add', path: '/a', value: 1 },
		]);
		expect(makeSetOps('/a', { a: 1 }, 2)).toEqual([
			{ op: 'replace', path: '/a', value: 2 },
		]);
	});

	it('makeMergeOps creates per-key ops', () => {
		const ops = makeMergeOps('/obj', { a: 1 }, { a: 2, b: 3 });
		expect(ops).toEqual([
			{ op: 'replace', path: '/obj/a', value: 2 },
			{ op: 'add', path: '/obj/b', value: 3 },
		]);
	});

	it('makePushOps appends using /-', () => {
		const ops = makePushOps('/arr', [1], [2, 3]);
		expect(ops).toEqual([
			{ op: 'add', path: '/arr/-', value: 2 },
			{ op: 'add', path: '/arr/-', value: 3 },
		]);
	});

	it('makeRemoveOps removes in descending index order', () => {
		const ops = makeRemoveOps('/arr', [1, 2, 3, 4], (x) => Number(x) % 2 === 0);
		expect(ops).toEqual([
			{ op: 'remove', path: '/arr/3' },
			{ op: 'remove', path: '/arr/1' },
		]);
	});
});
