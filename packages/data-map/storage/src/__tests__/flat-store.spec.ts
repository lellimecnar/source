import { describe, expect, it } from 'vitest';
import { FlatStore } from '../flat-store.js';

describe('FlatStore', () => {
	it('set/get/delete at depth', () => {
		const s = new FlatStore();
		s.set('/users/0/name', 'Alice');
		expect(s.get('/users/0/name')).toBe('Alice');
		expect(s.has('/users/0/name')).toBe(true);
		expect(s.delete('/users/0/name')).toBe(true);
		expect(s.get('/users/0/name')).toBeUndefined();
	});

	it('ingest and toObject round-trip', () => {
		const s = new FlatStore({ users: [{ name: 'Alice' }, { name: 'Bob' }] });
		const obj = s.toObject() as any;
		expect(obj.users[0].name).toBe('Alice');
		expect(obj.users[1].name).toBe('Bob');
	});

	it('versions bump on changes', () => {
		const s = new FlatStore();
		expect(s.version('/x')).toBe(0);
		s.set('/x', 1);
		expect(s.version('/x')).toBe(1);
		s.set('/x', 2);
		expect(s.version('/x')).toBe(2);
		s.delete('/x');
		expect(s.version('/x')).toBe(3);
	});
});
