import { describe, expect, it } from 'vitest';
import { DataMap } from '../datamap';
import { compilePathPattern } from './compile';
import { deepEqual, deepExtends } from '../utils/equal';
import { buildSetPatch } from '../patch/builder';
import {
	buildPushPatch,
	buildUnshiftPatch,
	buildSplicePatch,
} from '../patch/array';

describe('DataMap Coverage Edge Cases', () => {
	it('resolve relative-pointer strict error', () => {
		const dm = new DataMap({ a: 1 }, { strict: true });
		expect(() => dm.resolve('1/a')).toThrow(
			'Unsupported path type: relative-pointer',
		);
	});

	it('get non-existent pointer strict error', () => {
		const dm = new DataMap({ a: 1 }, { strict: true });
		expect(() => dm.get('/b', { strict: true })).toThrow(
			'Pointer not found: /b',
		);
	});

	it('set non-existent path strict error', () => {
		const dm = new DataMap({ a: 1 }, { strict: true });
		expect(() => dm.set('$.b', 2, { strict: true })).toThrow(
			'No matches for set()',
		);
	});

	it('setAll non-existent path strict error', () => {
		const dm = new DataMap({ a: 1 }, { strict: true });
		expect(() => dm.setAll('$.b', 2, { strict: true })).toThrow(
			'No matches for setAll()',
		);
	});

	it('map non-existent path strict error', () => {
		const dm = new DataMap({ a: 1 }, { strict: true });
		expect(() => dm.map('$.b', (v) => v, { strict: true })).toThrow(
			'No matches for map()',
		);
	});

	it('patch cancelled by subscription', () => {
		const dm = new DataMap({ a: 1 }, { strict: true });
		dm.subscribe({
			path: '/a',
			before: 'patch',
			fn: (v, info, cancel) => {
				cancel();
			},
		});
		expect(() => dm.set('/a', 2)).toThrow('Patch cancelled by subscription');
	});

	it('batch error handling', () => {
		const dm = new DataMap({ a: 1 });
		expect(() =>
			dm.batch(() => {
				throw new Error('batch-fail');
			}),
		).toThrow('batch-fail');
	});

	it('getSnapshot coverage', () => {
		const dm = new DataMap({ a: 1 });
		expect(dm.getSnapshot()).toEqual({ a: 1 });
	});

	it('extends coverage', () => {
		const dm = new DataMap({ a: 1 });
		expect(dm.extends({ a: 1 })).toBe(true);
		expect(dm.extends({ a: 2 })).toBe(false);
		expect(dm.extends(null)).toBe(false);
		expect(dm.extends(1)).toBe(false);
	});

	it('patch error in strict mode', () => {
		const dm = new DataMap({ a: 1 }, { strict: true });
		// Invalid op should throw in applyPatch, which is caught in DataMap.patch
		expect(() =>
			dm.patch([{ op: 'invalid' as any, path: '/a', value: 2 }]),
		).toThrow();
	});

	it('registry getDepValues coverage', () => {
		const dm = new DataMap({ a: 1 });
		const registry = (dm as any)._defs;
		const def = { pointer: '/b', deps: ['/a'], get: (v: any) => v };
		expect(registry.getDepValues(def)).toEqual([1]);
	});
});

describe('Path Compiler Coverage Edge Cases', () => {
	it('wildcard on object expand', () => {
		const p = compilePathPattern('$.*');
		expect(p.expand({ a: 1, b: 2 }).sort()).toEqual(['/a', '/b'].sort());
	});

	it('wildcard on non-object expand', () => {
		const p = compilePathPattern('$.*');
		expect(p.expand(1)).toEqual([]);
	});

	it('recursive on array expand', () => {
		const p = compilePathPattern('$..*');
		expect(p.expand([1, [2]])).toContain('/0');
		expect(p.expand([1, [2]])).toContain('/1');
		expect(p.expand([1, [2]])).toContain('/1/0');
	});

	it('slice with defaults', () => {
		const p = compilePathPattern('$.items[:2]');
		expect(p.expand({ items: [1, 2, 3] })).toEqual(['/items/0', '/items/1']);
	});

	it('slice with step', () => {
		const p = compilePathPattern('$.items[0:4:2]');
		expect(p.expand({ items: [1, 2, 3, 4, 5] })).toEqual([
			'/items/0',
			'/items/2',
		]);
	});

	it('invalid JSONPath', () => {
		expect(() => compilePathPattern('a.b')).toThrow('Invalid JSONPath: a.b');
	});

	it('recursive descent edge cases', () => {
		const p1 = compilePathPattern('$..[0]');
		expect(p1.segments[0].type).toBe('recursive');
		const p2 = compilePathPattern('$..name');
		expect(p2.segments[0].type).toBe('recursive');
		const p3 = compilePathPattern('$..*');
		expect(p3.segments[0].type).toBe('recursive');
		const p4 = compilePathPattern('$..[*]');
		expect(p4.segments[0].type).toBe('recursive');
		const p5 = compilePathPattern('$..["name"]');
		expect(p5.segments[0].type).toBe('recursive');
	});

	it('invalid filter', () => {
		expect(() => compilePathPattern('$.a[?(id == 1]')).toThrow(
			'Invalid filter: ?(id == 1',
		);
	});

	it('index mismatch reasons', () => {
		const pattern = compilePathPattern('$.items[0]');
		expect(pattern.match('/items/a', () => 1).reason).toBe('index-mismatch');
		expect(pattern.match('/items/1', () => 1).reason).toBe('index-mismatch');
	});

	it('slice mismatch reasons', () => {
		const pattern = compilePathPattern('$.items[0:2]');
		// slice-non-index
		expect(pattern.match('/items/a', () => 1).reason).toBe('slice-non-index');
		// slice-out-of-range (start)
		expect(pattern.match('/items/5', () => 1).reason).toBe(
			'slice-out-of-range',
		);

		const p2 = compilePathPattern('$.items[5:10]');
		expect(p2.match('/items/2', () => 1).reason).toBe('slice-out-of-range');

		const p3 = compilePathPattern('$.items[0:10:2]');
		expect(p3.match('/items/1', () => 1).reason).toBe('slice-out-of-range');
	});
});

describe('Subscription Manager Coverage Edge Cases', () => {
	it('unsubscribe edge cases', () => {
		const dm = new DataMap({ items: [1] });
		const sub1 = dm.subscribe({
			path: '$.items[*]',
			on: 'set',
			fn: () => {},
		});
		const sub2 = dm.subscribe({
			path: '$.items[*]',
			on: 'set',
			fn: () => {},
		});

		// Unsubscribe sub1, sub2 still exists for structural watcher
		sub1.unsubscribe();
		sub2.unsubscribe();

		// Unsubscribe non-existent
		(dm as any)._subs.unregister('non-existent');
	});

	it('reexpand dynamic subscriptions', () => {
		const dm = new DataMap({ items: [1] });
		let callCount = 0;
		dm.subscribe({
			path: '$.items[*]',
			on: 'set',
			fn: () => {
				callCount++;
			},
		});

		// Add item -> reexpand -> notify new match
		dm.push('/items', 2);
		expect(callCount).toBe(1);

		// Remove item -> reexpand
		dm.patch([{ op: 'remove', path: '/items/0' }]);
	});
});

describe('Array Patch Coverage Edge Cases', () => {
	it('buildPushPatch empty items non-existent', () => {
		expect(buildPushPatch({}, '/a', [])).toEqual([]);
	});

	it('buildUnshiftPatch empty items non-existent', () => {
		expect(buildUnshiftPatch({}, '/a', [])).toEqual([]);
	});

	it('buildSplicePatch empty items non-existent', () => {
		expect(buildSplicePatch({}, '/a', 0, 0, []).ops).toEqual([]);
	});

	it('buildSplicePatch start out of range', () => {
		const res = buildSplicePatch({ a: [1] }, '/a', 5, 1, [2]);
		// should not remove anything, just add at 5 (which is end of array)
		expect(res.ops.length).toBe(1);
		expect(res.ops[0].op).toBe('add');
	});
});

describe('Utility Coverage Edge Cases', () => {
	it('deepEqual circular reference', () => {
		const a: any = { x: 1 };
		a.self = a;
		const b: any = { x: 1 };
		b.self = b;
		expect(deepEqual(a, b)).toBe(true);
	});

	it('deepExtends edge cases', () => {
		expect(deepExtends({ a: 1 }, { a: 1 })).toBe(true);
		expect(deepExtends({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
		expect(deepExtends({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
		expect(deepExtends({ a: 1 }, { b: 1 })).toBe(false);
		expect(deepExtends(1, { a: 1 })).toBe(false);
	});

	it('patch builder empty path', () => {
		expect(buildSetPatch({}, '', { a: 1 })).toEqual([
			{ op: 'replace', path: '', value: { a: 1 } },
		]);
	});
});
