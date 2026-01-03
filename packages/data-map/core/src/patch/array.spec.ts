import { describe, expect, it } from 'vitest';

import {
	buildPopPatch,
	buildPushPatch,
	buildShiftPatch,
	buildShufflePatch,
	buildSortPatch,
	buildSplicePatch,
	buildUnshiftPatch,
} from './array';

describe('patch/array', () => {
	describe('buildPushPatch', () => {
		it('creates array when pushing to non-existent path', () => {
			const ops = buildPushPatch({}, '/items', [1, 2]);
			expect(ops).toEqual([{ op: 'add', path: '/items', value: [1, 2] }]);
		});

		it('appends items to existing array', () => {
			const ops = buildPushPatch({ items: [1] }, '/items', [2, 3]);
			expect(ops).toEqual([
				{ op: 'add', path: '/items/-', value: 2 },
				{ op: 'add', path: '/items/-', value: 3 },
			]);
		});

		it('returns empty ops when pushing empty array', () => {
			const ops = buildPushPatch({}, '/items', []);
			expect(ops).toEqual([]);
		});
	});

	describe('buildPopPatch', () => {
		it('returns empty ops and undefined for empty array', () => {
			const { ops, value } = buildPopPatch({ items: [] }, '/items');
			expect(ops).toEqual([]);
			expect(value).toBeUndefined();
		});

		it('removes and returns last item', () => {
			const { ops, value } = buildPopPatch({ items: [1, 2, 3] }, '/items');
			expect(value).toBe(3);
			expect(ops).toEqual([{ op: 'remove', path: '/items/2' }]);
		});
	});

	describe('buildShiftPatch', () => {
		it('returns empty ops and undefined for empty array', () => {
			const { ops, value } = buildShiftPatch({ items: [] }, '/items');
			expect(ops).toEqual([]);
			expect(value).toBeUndefined();
		});

		it('removes and returns first item', () => {
			const { ops, value } = buildShiftPatch({ items: [1, 2, 3] }, '/items');
			expect(value).toBe(1);
			expect(ops).toEqual([{ op: 'remove', path: '/items/0' }]);
		});
	});

	describe('buildUnshiftPatch', () => {
		it('creates array when unshifting to non-existent path', () => {
			const ops = buildUnshiftPatch({}, '/items', [1, 2]);
			expect(ops).toEqual([{ op: 'add', path: '/items', value: [1, 2] }]);
		});

		it('prepends items to existing array', () => {
			const ops = buildUnshiftPatch({ items: [3] }, '/items', [1, 2]);
			// Items inserted at 0 in reverse order
			expect(ops.length).toBe(2);
			expect(ops[0]!.op).toBe('add');
			expect(ops[0]!.path).toBe('/items/0');
		});
	});

	describe('buildSplicePatch', () => {
		it('handles splice with deleteCount exceeding length', () => {
			const { ops, removed } = buildSplicePatch(
				{ items: [1, 2, 3] },
				'/items',
				1,
				999,
				[],
			);
			expect(removed).toEqual([2, 3]);
			expect(ops.length).toBeGreaterThan(0);
		});

		it('inserts items without removing', () => {
			const { ops, removed } = buildSplicePatch(
				{ items: [1, 3] },
				'/items',
				1,
				0,
				[2],
			);
			expect(removed).toEqual([]);
			expect(ops).toContainEqual({ op: 'add', path: '/items/1', value: 2 });
		});

		it('removes and inserts items', () => {
			const { ops, removed } = buildSplicePatch(
				{ items: [1, 2, 3, 4] },
				'/items',
				1,
				2,
				[99],
			);
			expect(removed).toEqual([2, 3]);
			expect(ops.length).toBeGreaterThan(0);
		});
	});

	describe('buildSortPatch', () => {
		it('sorts with default comparator', () => {
			const ops = buildSortPatch({ items: [3, 1, 2] }, '/items');
			expect(ops).toEqual([
				{ op: 'replace', path: '/items', value: [1, 2, 3] },
			]);
		});

		it('sorts with custom comparator', () => {
			const ops = buildSortPatch(
				{ items: [1, 2, 3] },
				'/items',
				(a, b) => Number(b) - Number(a),
			);
			expect(ops).toEqual([
				{ op: 'replace', path: '/items', value: [3, 2, 1] },
			]);
		});
	});

	describe('buildShufflePatch', () => {
		it('uses custom RNG for deterministic shuffle', () => {
			// RNG that always returns 0 should produce a specific order
			const ops = buildShufflePatch({ items: [1, 2, 3] }, '/items', () => 0);
			expect(ops).toHaveLength(1);
			expect(ops[0]!.op).toBe('replace');
		});

		it('shuffles array (result has same elements)', () => {
			const original = [1, 2, 3, 4, 5];
			const ops = buildShufflePatch({ items: [...original] }, '/items');
			expect(ops).toHaveLength(1);
			expect(ops[0]!.op).toBe('replace');
			const shuffled = (ops[0] as any).value as number[];
			expect([...shuffled].sort()).toEqual([...original].sort());
		});
	});
});
