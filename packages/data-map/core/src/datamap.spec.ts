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
});
