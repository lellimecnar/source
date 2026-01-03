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

	it('deepEqual compares null vs undefined', () => {
		expect(deepEqual(null, undefined)).toBe(false);
		expect(deepEqual(undefined, null)).toBe(false);
		expect(deepEqual(null, null)).toBe(true);
		expect(deepEqual(undefined, undefined)).toBe(true);
	});

	it('deepEqual compares empty objects and arrays', () => {
		expect(deepEqual({}, {})).toBe(true);
		expect(deepEqual([], [])).toBe(true);
		expect(deepEqual({}, [])).toBe(false);
	});

	it('deepEqual compares Date objects', () => {
		expect(deepEqual(new Date(0), new Date(0))).toBe(true);
		expect(deepEqual(new Date(0), new Date(1))).toBe(false);
	});

	it('deepEqual compares RegExp objects', () => {
		expect(deepEqual(/a/i, /a/i)).toBe(true);
		expect(deepEqual(/a/i, /a/g)).toBe(false);
		expect(deepEqual(/a/, /b/)).toBe(false);
	});

	it('deepEqual handles circular references', () => {
		const a: any = { x: 1 };
		a.self = a;
		const b: any = { x: 1 };
		b.self = b;
		expect(deepEqual(a, b)).toBe(true);
	});

	it('deepExtends returns false when partial array is longer', () => {
		expect(deepExtends([1], [1, 2])).toBe(false);
	});

	it('deepExtends returns true for undefined partial', () => {
		expect(deepExtends({ a: 1 }, undefined)).toBe(true);
	});

	it('deepExtends returns false for non-object target when partial is object', () => {
		expect(deepExtends(1, { a: 1 })).toBe(false);
	});

	it('deepExtends returns false for non-array target when partial is array', () => {
		expect(deepExtends({ a: 1 }, [1])).toBe(false);
	});

	it('deepExtends returns false when partial key is missing in target', () => {
		expect(deepExtends({ a: 1 }, { b: 1 })).toBe(false);
	});
});
