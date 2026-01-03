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
});
