import { describe, expect, it } from 'vitest';

import { DataMap } from './datamap';

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
	});

	describe('Immutability', () => {
		it('should not mutate initial data', () => {
			const initial = { a: 1 };
			const dm = new DataMap(initial);
			dm.set('/a', 2);
			expect(initial.a).toBe(1);
		});

		it('should return cloned snapshots', () => {
			const dm = new DataMap({ user: { name: 'Alice' } });
			const s1 = dm.getSnapshot() as any;
			s1.user.name = 'Bob';
			expect(dm.get('/user/name')).toBe('Alice');
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

		it('should generate patches for array methods', () => {
			const dm = new DataMap({ items: [1] });
			const ops = dm.push.toPatch('/items', 2);
			expect(ops).toEqual([{ op: 'add', path: '/items/-', value: 2 }]);
		});
	});
});
