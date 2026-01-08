import { describe, expect, it } from 'vitest';

import { DataMap } from './datamap';
import { flushMicrotasks } from './__fixtures__/helpers';

describe('DataMap', () => {
	describe('Read API', () => {
		const data = {
			user: {
				id: 1,
				profile: { name: 'Alice', tags: ['dev', 'admin'] },
			},
			settings: { theme: 'dark' },
		};

		it('should resolve root pointer', () => {
			const dm = new DataMap(data);
			expect(dm.get('')).toEqual(data);
			expect(dm.get('#')).toEqual(data);
		});

		it('should resolve simple pointers', () => {
			const dm = new DataMap(data);
			expect(dm.get('/user/id')).toBe(1);
			expect(dm.get('/user/profile/name')).toBe('Alice');
		});

		it('should resolve JSONPath', () => {
			const dm = new DataMap(data);
			expect(dm.get('$.user.id')).toBe(1);
			expect(dm.getAll('$.user.profile.tags[*]')).toEqual(['dev', 'admin']);
		});

		it('should return undefined for missing pointers in non-strict mode', () => {
			const dm = new DataMap(data);
			expect(dm.get('/missing')).toBeUndefined();
		});

		it('should throw for missing pointers in strict mode', () => {
			const dm = new DataMap(data, { strict: true });
			expect(() => dm.get('/missing')).toThrow();
		});
	});

	describe('Write API', () => {
		it('should set value via pointer', () => {
			const dm = new DataMap({ a: 1 });
			dm.set('/a', 2);
			expect(dm.get('/a')).toBe(2);
		});

		it('should set value via JSONPath', () => {
			const dm = new DataMap({ user: { name: 'Alice' } });
			dm.set('$.user.name', 'Bob');
			expect(dm.get('/user/name')).toBe('Bob');
		});

		it('should create missing containers on set', () => {
			const dm = new DataMap<any>({});
			dm.set('/deep/nested/value', 42);
			expect(dm.get('/deep/nested/value')).toBe(42);
			expect(dm.getSnapshot()).toEqual({
				deep: { nested: { value: 42 } },
			});
		});

		it('should support functional updates', () => {
			const dm = new DataMap({ count: 10 });
			dm.set('/count', (curr: any) => curr + 1);
			expect(dm.get('/count')).toBe(11);
		});

		it('should setAll via JSONPath', () => {
			const dm = new DataMap({
				items: [{ val: 1 }, { val: 2 }],
			});
			dm.setAll('$.items[*].val', 0);
			expect(dm.getAll('$.items[*].val')).toEqual([0, 0]);
		});

		it('should map values', () => {
			const dm = new DataMap({
				items: [{ val: 1 }, { val: 2 }],
			});
			dm.map('$.items[*].val', (v: any) => v * 10);
			expect(dm.getAll('$.items[*].val')).toEqual([10, 20]);
		});

		it('should apply raw patches', () => {
			const dm = new DataMap({ a: 1 });
			dm.patch([{ op: 'replace', path: '/a', value: 2 }]);
			expect(dm.get('/a')).toBe(2);
		});

		it('should generate patches without applying them', () => {
			const dm = new DataMap({ a: 1 });
			const ops = dm.set.toPatch('/a', 2);
			expect(ops).toEqual([{ op: 'replace', path: '/a', value: 2 }]);
			expect(dm.get('/a')).toBe(1); // unchanged
		});

		it('applies transformedValue returned by before-hook (AC-024)', async () => {
			const dm = new DataMap({ a: 1 });
			dm.subscribe({
				path: '/a',
				before: 'set',
				fn: (v) => (Number(v) * 10) as any,
			});

			dm.set('/a', 2);
			await flushMicrotasks();
			expect(dm.get('/a')).toBe(20);
		});

		it('pipelines multiple before-hook transformations (AC-024)', async () => {
			const dm = new DataMap({ a: 0 });
			dm.subscribe({
				path: '/a',
				before: 'set',
				fn: (v) => Number(v) + 1,
			});
			dm.subscribe({
				path: '/a',
				before: 'set',
				fn: (v) => Number(v) * 10,
			});

			dm.set('/a', 1);
			await flushMicrotasks();
			expect(dm.get('/a')).toBe(20);
		});
	});

	describe('Immutability', () => {
		it('should not mutate initial data', () => {
			const initial = { a: 1 };
			const dm = new DataMap(initial);
			dm.set('/a', 2);
			expect(initial.a).toBe(1);
		});

		it('pointer set() clones only along the modified path', () => {
			const initial = {
				a: { b: 1, keep: { z: 1 } },
				unrelated: { x: 1 },
			};
			const dm = new DataMap(initial, { cloneInitial: false } as any);
			const before = (dm as any)._data;
			const beforeUnrelated = before.unrelated;
			const beforeA = before.a;

			dm.set('/a/b', 2);

			const after = (dm as any)._data;
			expect(after).not.toBe(before);
			expect(after.unrelated).toBe(beforeUnrelated);
			expect(after.a).not.toBe(beforeA);
			expect(after.a.keep).toBe(beforeA.keep);
			expect(after.a.b).toBe(2);
		});

		it('createPath builds missing parents and preserves unrelated references', () => {
			const initial = { keep: { x: 1 } };
			const dm = new DataMap(initial, { cloneInitial: false } as any);
			const before = (dm as any)._data;
			const keepRef = before.keep;

			dm.set('/a/0/b', 'x');

			const after = (dm as any)._data;
			expect(after.keep).toBe(keepRef);
			expect(after.a).toEqual([{ b: 'x' }]);
		});

		it('useStructuralUpdate=false uses legacy patch-based container creation', () => {
			const initial = { keep: { x: 1 } };
			const dm = new DataMap(initial, {
				cloneInitial: false,
				useStructuralUpdate: false,
			} as any);
			const before = (dm as any)._data;
			const keepRef = before.keep;

			dm.set('/a/0/b', 'x');

			const after = (dm as any)._data;
			expect(after.a).toEqual([{ b: 'x' }]);
			// Legacy path goes through JSON Patch apply (mutate:false), which does not
			// guarantee reference stability for untouched branches.
			expect(after.keep).not.toBe(keepRef);
		});

		it('getSnapshot() returns a direct reference by default (snapshotMode=reference)', () => {
			const dm = new DataMap({ user: { name: 'Alice' } });
			const snap = dm.getSnapshot() as any;
			// Implication: mutating the snapshot mutates the DataMap state.
			snap.user.name = 'Bob';
			expect(dm.get('/user/name')).toBe('Bob');
		});

		it("getSnapshot() returns a deep clone when snapshotMode='clone' (mutation isolation)", () => {
			const dm = new DataMap({ user: { name: 'Alice', tags: ['dev'] } }, {
				snapshotMode: 'clone',
			} as any);
			const snap = dm.getSnapshot() as any;
			snap.user.name = 'Bob';
			snap.user.tags.push('admin');
			expect(dm.get('/user/name')).toBe('Alice');
			expect(dm.get('/user/tags')).toEqual(['dev']);
		});

		it("getSnapshot() returns a frozen reference in development when snapshotMode='frozen'", () => {
			const prevEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = 'development';
			try {
				const dm = new DataMap({ user: { name: 'Alice' } }, {
					snapshotMode: 'frozen',
				} as any);
				const snap = dm.getSnapshot() as any;
				expect(Object.isFrozen(snap)).toBe(true);
				// Shallow freeze: top-level writes should throw.
				expect(() => {
					snap.user = { name: 'Bob' };
				}).toThrow();
				expect(dm.get('/user/name')).toBe('Alice');
			} finally {
				process.env.NODE_ENV = prevEnv;
			}
		});

		it('get() returns a direct reference by default', () => {
			const dm = new DataMap({ user: { name: 'Alice' } });
			const user = dm.get('/user') as any;
			user.name = 'Bob';
			// Internal value should be mutated (reference returned)
			expect(dm.get('/user/name')).toBe('Bob');
		});

		it('get({ clone: true }) returns a cloned value', () => {
			const dm = new DataMap({ user: { name: 'Alice' } });
			const user = dm.get('/user', { clone: true }) as any;
			user.name = 'Bob';
			// Internal value should be unchanged (cloned)
			expect(dm.get('/user/name')).toBe('Alice');
		});

		it('cloneInitial=false stores initial reference until first mutation', () => {
			const initial = { a: { b: 1 } };
			const dm = new DataMap(initial, { cloneInitial: false } as any);
			expect((dm as any)._data).toBe(initial);

			dm.set('/a/b', 2);
			expect((dm as any)._data).not.toBe(initial);
			expect(initial.a.b).toBe(1);
		});

		it('clone() avoids redundant cloning but preserves owned semantics', () => {
			const dm = new DataMap({ a: { b: 1 } });
			const cloned = dm.clone() as any;
			// clone() historically produced an owned instance; keep that invariant.
			expect(cloned._isOwned).toBe(true);

			cloned.set('/a/b', 2);
			expect(dm.get('/a/b')).toBe(1);
		});
	});

	describe('Array API', () => {
		it('push() appends items', () => {
			const dm = new DataMap({ items: [1, 2] });
			dm.push('/items', 3, 4);
			expect(dm.get('/items')).toEqual([1, 2, 3, 4]);
		});

		it('pop() removes last item and returns it', () => {
			const dm = new DataMap({ items: [1, 2] });
			expect(dm.pop('/items')).toBe(2);
			expect(dm.get('/items')).toEqual([1]);
		});

		it('shift() removes first item and returns it', () => {
			const dm = new DataMap({ items: [1, 2] });
			expect(dm.shift('/items')).toBe(1);
			expect(dm.get('/items')).toEqual([2]);
		});

		it('unshift() prepends items', () => {
			const dm = new DataMap({ items: [1, 2] });
			dm.unshift('/items', -1, 0);
			expect(dm.get('/items')).toEqual([-1, 0, 1, 2]);
		});

		it('splice() removes and inserts items', () => {
			const dm = new DataMap({ items: [1, 2, 3, 4] });
			const removed = dm.splice('/items', 1, 2, 99);
			expect(removed).toEqual([2, 3]);
			expect(dm.get('/items')).toEqual([1, 99, 4]);
		});

		it('sort() reorders items', () => {
			const dm = new DataMap({ items: [3, 1, 2] });
			dm.sort('/items');
			expect(dm.get('/items')).toEqual([1, 2, 3]);
		});

		it('shuffle() randomizes items', () => {
			const dm = new DataMap({ items: [1, 2, 3, 4, 5] });
			const original = dm.getSnapshot();
			dm.shuffle('/items');
			const shuffled = dm.get('/items');
			expect(shuffled).toHaveLength(5);
			expect((shuffled as any[]).sort()).toEqual(
				(original as any).items.sort(),
			);
		});

		// @TODO: Add more tests for *.toPatch() functions
		it('should generate patches for array methods', () => {
			const dm = new DataMap({ items: [1] });
			const ops = dm.push.toPatch('/items', 2);
			expect(ops).toEqual([{ op: 'add', path: '/items/-', value: 2 }]);
		});
	});
});

describe('DataMap clone()', () => {
	it('should clone with isolated subscriptions', async () => {
		const dm = new DataMap({ a: 1 });
		const calls: string[] = [];
		dm.subscribe({
			path: '/a',
			after: 'patch',
			fn: () => calls.push('orig'),
		});

		const cloned = dm.clone();
		cloned.subscribe({
			path: '/a',
			after: 'patch',
			fn: () => calls.push('clone'),
		});

		dm.patch([{ op: 'replace', path: '/a', value: 2 }]);
		cloned.patch([{ op: 'replace', path: '/a', value: 3 }]);
		await flushMicrotasks();
		expect(calls.sort()).toEqual(['clone', 'orig']);
	});

	it('should preserve definitions in clone', () => {
		type Ctx = { prefix: string };
		const define = [
			{
				pointer: '/x',
				get: (v: unknown, _depValues: unknown[], _instance: any, ctx: Ctx) =>
					`${ctx.prefix}${String(v)}`,
			},
		];

		const dm = new DataMap({ x: '1' }, { context: { prefix: 'v=' }, define });
		const cloned = dm.clone();
		expect(cloned.get('/x')).toBe('v=1');
	});

	// @ TODO: Add more tests for clone scenarios
});

describe('DataMap strict mode', () => {
	it('should throw for relative pointers in strict mode', () => {
		const dm = new DataMap({ a: 1 }, { strict: true });
		expect(() => dm.get('0')).toThrow(
			'Unsupported path type: relative-pointer',
		);
	});

	it('should return empty matches for relative pointers in non-strict mode', () => {
		const dm = new DataMap({ a: 1 }, { strict: false });
		expect(dm.get('0')).toBeUndefined();
	});
});

describe('DataMap error paths', () => {
	it('should handle get() with invalid JSONPath syntax (non-strict)', () => {
		const dm = new DataMap({ a: 1 }, { strict: false });
		expect(dm.get('$.a[')).toBeUndefined();
	});

	it('should throw for invalid JSONPath in strict mode', () => {
		const dm = new DataMap({ a: 1 }, { strict: true });
		expect(() => dm.get('$.a[')).toThrow();
	});
});

describe('DataMap transaction edge cases', () => {
	it('should not trigger notifications on transaction rollback', async () => {
		const dm = new DataMap({ a: 1 });
		const calls: string[] = [];
		dm.subscribe({ path: '/a', after: 'set', fn: () => calls.push('a') });

		try {
			dm.transaction((d) => {
				d.set('/a', 2);
				throw new Error('fail');
			});
		} catch {
			// expected
		}

		await flushMicrotasks();
		expect(dm.get('/a')).toBe(1);
		expect(calls).toHaveLength(0);
	});

	it('should allow nested transactions', () => {
		const dm = new DataMap({ a: 1, b: 1 });
		dm.transaction((d) => {
			d.set('/a', 2);
			d.transaction((d2) => {
				d2.set('/b', 2);
			});
		});
		expect(dm.get('/a')).toBe(2);
		expect(dm.get('/b')).toBe(2);
	});
});

describe('DataMap batch edge cases', () => {
	it('should defer notifications within batch', async () => {
		const dm = new DataMap({ a: 1 });
		const calls: string[] = [];
		dm.subscribe({ path: '/a', after: 'set', fn: () => calls.push('after') });

		dm.batch((d) => {
			d.set('/a', 2);
			expect(calls).toEqual([]);
		});

		await flushMicrotasks();
		expect(calls).toEqual(['after']);
	});

	it('batch applies operations against a single evolving working state', () => {
		const dm = new DataMap({ a: 0 });

		dm.batch(() => {
			dm.set('/a', 1);
			dm.map('/a', (v) => Number(v) + 1);
		});

		expect(dm.get('/a')).toBe(2);
	});
});

describe('DataMap coverage edge cases', () => {
	it('swallows errors in patch when strict is false', () => {
		const dm = new DataMap({ a: 1 }, { strict: false });
		// op: 'test' failure throws JSONPatchTestFailure
		expect(() =>
			dm.patch([{ op: 'test', path: '/a', value: 2 }]),
		).not.toThrow();
	});

	it('cancels patch via subscription', () => {
		const dm = new DataMap({ a: 1 }, { strict: true });
		dm.subscribe({
			path: '/a',
			before: 'patch',
			fn: (_v, _e, cancel) => {
				cancel();
			},
		});
		expect(() => dm.patch([{ op: 'replace', path: '/a', value: 2 }])).toThrow(
			'Patch cancelled by subscription',
		);
		expect(dm.get('/a')).toBe(1);
	});

	it('set.toPatch creates patch for new pointer', () => {
		const dm = new DataMap({ a: 1 });
		const ops = dm.set.toPatch('/b', 2);
		expect(ops).toEqual([{ op: 'add', path: '/b', value: 2 }]);
	});

	it('pop.toPatch() returns operations without applying them', () => {
		const dm = new DataMap({ arr: [1, 2, 3] });
		const ops = dm.pop.toPatch('/arr');
		expect(ops).toEqual([{ op: 'remove', path: '/arr/2' }]);
		expect(dm.get('/arr')).toEqual([1, 2, 3]);
	});

	it('shift.toPatch() returns operations without applying them', () => {
		const dm = new DataMap({ arr: [1, 2, 3] });
		const ops = dm.shift.toPatch('/arr');
		expect(ops).toEqual([{ op: 'remove', path: '/arr/0' }]);
		expect(dm.get('/arr')).toEqual([1, 2, 3]);
	});

	it('splice.toPatch() returns operations without applying them', () => {
		const dm = new DataMap({ arr: [1, 2, 3] });
		const ops = dm.splice.toPatch('/arr', 1, 1, 4, 5);
		expect(ops).toEqual([
			{ op: 'remove', path: '/arr/1' },
			{ op: 'add', path: '/arr/1', value: 4 },
			{ op: 'add', path: '/arr/2', value: 5 },
		]);
		expect(dm.get('/arr')).toEqual([1, 2, 3]);
	});

	it('clone() accepts options to override', () => {
		const dm = new DataMap({ a: 1 }, { strict: false });
		const cloned = dm.clone({ strict: true });
		expect(() => cloned.get('/b')).toThrow();
	});

	it('batches multiple operations into a single notification cycle (AC-025)', async () => {
		const dm = new DataMap({ a: 1, b: 2 });
		let calls = 0;
		dm.subscribe({ path: '$.*', on: 'patch', fn: () => calls++ });

		dm.batch((store) => {
			store.set('/a', 10);
			store.set('/b', 20);
		});

		expect(dm.get('/a')).toBe(10);
		expect(dm.get('/b')).toBe(20);
		expect(calls).toBe(0);
		await flushMicrotasks();
		expect(calls).toBe(2); // One for /a, one for /b
	});
});
