import { describe, expect, it } from 'vitest';

import { compilePathPattern } from './compile';

describe('path filter expressions', () => {
	it('expands filter expressions with boolean comparison', () => {
		const pattern = compilePathPattern('$.users[?(@.active == true)].name');
		const data = {
			users: [
				{ name: 'A', active: true },
				{ name: 'B', active: false },
				{ name: 'C', active: true },
			],
		};

		const pointers = pattern.expand(data);
		expect(pointers.sort()).toEqual(['/users/0/name', '/users/2/name']);
	});

	it('handles numeric comparison in filters', () => {
		const pattern = compilePathPattern('$.users[?(@.score > 90)].id');
		const data = {
			users: [
				{ id: 1, score: 95 },
				{ id: 2, score: 85 },
				{ id: 3, score: 92 },
			],
		};
		expect(pattern.expand(data).sort()).toEqual(['/users/0/id', '/users/2/id']);
	});

	it('handles logical AND in filters', () => {
		const pattern = compilePathPattern(
			'$.users[?(@.score > 90 && @.verified == true)].id',
		);
		const data = {
			users: [
				{ id: 1, score: 95, verified: true },
				{ id: 2, score: 95, verified: false },
				{ id: 3, score: 50, verified: true },
			],
		};
		expect(pattern.expand(data)).toEqual(['/users/0/id']);
	});

	it('handles logical OR in filters', () => {
		const pattern = compilePathPattern(
			'$.users[?(@.role == "admin" || @.role == "mod")].name',
		);
		const data = {
			users: [
				{ name: 'A', role: 'admin' },
				{ name: 'B', role: 'user' },
				{ name: 'C', role: 'mod' },
			],
		};
		expect(pattern.expand(data).sort()).toEqual([
			'/users/0/name',
			'/users/2/name',
		]);
	});

	it('handles negation in filters', () => {
		const pattern = compilePathPattern('$.items[?(!@.deleted)].id');
		const data = {
			items: [
				{ id: 1, deleted: false },
				{ id: 2, deleted: true },
				{ id: 3 }, // deleted is undefined, which is falsy
			],
		};
		expect(pattern.expand(data).sort()).toEqual(['/items/0/id', '/items/2/id']);
	});

	it('returns empty for non-matching filter', () => {
		const pattern = compilePathPattern('$.users[?(@.score > 100)].id');
		const data = {
			users: [
				{ id: 1, score: 50 },
				{ id: 2, score: 60 },
			],
		};
		expect(pattern.expand(data)).toEqual([]);
	});

	it('supports slice with step', () => {
		const pattern = compilePathPattern('$.items[0:6:2]');
		const data = { items: [0, 1, 2, 3, 4, 5] };
		expect(pattern.expand(data)).toEqual(['/items/0', '/items/2', '/items/4']);
	});

	it('supports recursive descent with objects and arrays', () => {
		const pattern = compilePathPattern('$..*');
		const data = {
			a: { b: 1 },
			c: [2, { d: 3 }],
		};
		const pointers = pattern.expand(data);
		expect(pointers).toContain('/a');
		expect(pointers).toContain('/a/b');
		expect(pointers).toContain('/c');
		expect(pointers).toContain('/c/0');
		expect(pointers).toContain('/c/1');
		expect(pointers).toContain('/c/1/d');
	});
});
