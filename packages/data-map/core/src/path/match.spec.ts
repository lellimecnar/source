import { describe, expect, it } from 'vitest';

import { compilePathPattern } from './compile';

describe('CompiledPathPattern.match (non-recursive)', () => {
	it('matches wildcard pattern', () => {
		const pattern = compilePathPattern('$.users[*].name');
		const data = { users: [{ name: 'A' }] };
		const getValue = (p: string) => {
			if (p === '/users/0/name') return 'A';
			if (p === '/users/0') return { name: 'A' };
			if (p === '/users') return [{ name: 'A' }];
			return undefined;
		};

		expect(pattern.match('/users/0/name', getValue).matches).toBe(true);
		expect(pattern.match('/admins/0/name', getValue).matches).toBe(false);
	});

	it('matches slice pattern', () => {
		const pattern = compilePathPattern('$.items[0:10:2]');
		const getValue = () => undefined;
		expect(pattern.match('/items/0', getValue).matches).toBe(true);
		expect(pattern.match('/items/2', getValue).matches).toBe(true);
		expect(pattern.match('/items/1', getValue).matches).toBe(false);
	});

	it('matches slice with non-index pointer', () => {
		const pattern = compilePathPattern('$.items[0:2]');
		expect(pattern.match('/items/a', () => 1).matches).toBe(false);
	});

	it('matches recursive descent with mismatch', () => {
		const pattern = compilePathPattern('$..name');
		expect(pattern.match('/a/b/age', () => 1).matches).toBe(false);
	});

	it('matches recursive descent with empty remaining segments', () => {
		const pattern = compilePathPattern('$..');
		expect(pattern.match('/a/b', () => 1).matches).toBe(true);
	});
});
