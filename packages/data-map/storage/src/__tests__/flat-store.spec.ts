import { describe, expect, it } from 'vitest';
import { FlatStore } from '../flat-store.js';

describe('FlatStore', () => {
	it('set/get/delete at depth', () => {
		const s = new FlatStore();
		expect(s.size).toBe(0);
		expect(s.version).toBe(0);
		s.set('/users/0/name', 'Alice');
		expect(s.get('/users/0/name')).toBe('Alice');
		expect(s.has('/users/0/name')).toBe(true);
		expect(s.size).toBe(1);
		expect(s.version).toBe(1);
		expect(s.delete('/users/0/name')).toBe(true);
		expect(s.get('/users/0/name')).toBeUndefined();
		expect(s.size).toBe(0);
		expect(s.version).toBe(2);
	});

	it('ingest and toObject round-trip', () => {
		const s = new FlatStore({ users: [{ name: 'Alice' }, { name: 'Bob' }] });
		const obj = s.toObject() as any;
		expect(obj.users[0].name).toBe('Alice');
		expect(obj.users[1].name).toBe('Bob');
	});

	it('versions bump on changes', () => {
		const s = new FlatStore();
		expect(s.getVersion('/x')).toBe(0);
		s.set('/x', 1);
		expect(s.getVersion('/x')).toBe(1);
		s.set('/x', 2);
		expect(s.getVersion('/x')).toBe(2);
		s.delete('/x');
		expect(s.getVersion('/x')).toBe(3);
	});

	it('setDeep writes subtree and removes stale keys', () => {
		const s = new FlatStore();
		s.setDeep('/users', [{ name: 'Alice' }, { name: 'Bob' }]);
		expect(s.get('/users/0/name')).toBe('Alice');
		expect(s.get('/users/1/name')).toBe('Bob');
		expect(s.getObject('/users')).toEqual([{ name: 'Alice' }, { name: 'Bob' }]);

		s.setDeep('/users', [{ name: 'Alice' }]);
		expect(s.get('/users/0/name')).toBe('Alice');
		expect(s.get('/users/1/name')).toBeUndefined();
		expect(s.getObject('/users')).toEqual([{ name: 'Alice' }]);
	});

	it('keys/entries can be iterated with optional prefix', () => {
		const s = new FlatStore({ users: [{ name: 'Alice' }, { name: 'Bob' }] });
		expect(Array.from(s.keys('/users')).sort()).toEqual([
			'/users/0/name',
			'/users/1/name',
		]);
		expect(Array.from(s.entries('/users')).sort()).toEqual([
			['/users/0/name', 'Alice'],
			['/users/1/name', 'Bob'],
		]);
		expect(s.sortedKeys('/users')).toEqual(['/users/0/name', '/users/1/name']);
	});
});
